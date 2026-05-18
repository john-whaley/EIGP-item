import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { primaryEmailInclude, type PrimaryEmailRecord } from '../common/entity-includes';
import {
  dedupeIds,
  normalizeEmailAddress,
  normalizeOptionalText,
  phoneLabel
} from '../common/entity-utils';
import { PrismaService } from '../prisma/prisma.service';
import { EncryptionService } from '../security/encryption.service';
import { CreateEmailDto } from './dto/create-email.dto';
import { QueryEmailsDto } from './dto/query-emails.dto';
import { UpdateEmailDto } from './dto/update-email.dto';

type RelationPayload = {
  registerPhoneIds?: string[];
  recoveryEmailIds?: string[];
  recoveryPhoneIds?: string[];
  platformIds?: string[];
};

type ValidatedRelations = {
  registerPhoneIds: string[];
  recoveryEmailIds: string[];
  recoveryPhoneIds: string[];
  platformIds: string[];
};

@Injectable()
export class EmailsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(EncryptionService) private readonly encryptionService: EncryptionService
  ) {}

  async create(userId: string, payload: CreateEmailDto) {
    return this.prisma.$transaction(async (tx) => {
      const email = normalizeEmailAddress(payload.email);
      await this.ensureUniqueEmail(tx, userId, email);
      const relations = await this.validateRelations(tx, userId, payload);

      const created = await tx.primaryEmail.create({
        data: {
          userId,
          email,
          passwordCiphertext: this.encryptionService.encrypt(payload.password),
          note: normalizeOptionalText(payload.note)
        }
      });

      await this.syncRelations(tx, created.id, relations);

      const record = await tx.primaryEmail.findUniqueOrThrow({
        where: { id: created.id },
        include: primaryEmailInclude
      });

      return this.serialize(record);
    });
  }

  async findAll(userId: string, query: QueryEmailsDto) {
    const search = query.search?.trim();

    const records = await this.prisma.primaryEmail.findMany({
      where: {
        userId,
        ...(search
          ? {
              OR: [
                {
                  email: {
                    contains: search,
                    mode: 'insensitive'
                  }
                },
                {
                  note: {
                    contains: search,
                    mode: 'insensitive'
                  }
                }
              ]
            }
          : {})
      },
      include: primaryEmailInclude,
      orderBy: [{ updatedAt: 'desc' }, { email: 'asc' }]
    });

    return records.map((record) => this.serialize(record));
  }

  async findOne(userId: string, id: string) {
    const record = await this.prisma.primaryEmail.findFirst({
      where: {
        id,
        userId
      },
      include: primaryEmailInclude
    });

    if (!record) {
      throw new NotFoundException('主邮箱不存在');
    }

    return this.serialize(record);
  }

  async update(userId: string, id: string, payload: UpdateEmailDto) {
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.primaryEmail.findFirst({
        where: {
          id,
          userId
        }
      });

      if (!current) {
        throw new NotFoundException('主邮箱不存在');
      }

      const nextEmail = payload.email ? normalizeEmailAddress(payload.email) : current.email;

      if (nextEmail !== current.email) {
        await this.ensureUniqueEmail(tx, userId, nextEmail, id);
      }

      const relations = await this.validateRelations(tx, userId, payload);

      await tx.primaryEmail.update({
        where: { id },
        data: {
          ...(payload.email !== undefined ? { email: nextEmail } : {}),
          ...(payload.password !== undefined
            ? {
                passwordCiphertext: this.encryptionService.encrypt(payload.password)
              }
            : {}),
          ...(payload.note !== undefined ? { note: normalizeOptionalText(payload.note) } : {})
        }
      });

      if (this.hasRelationChange(payload)) {
        await this.clearRelations(tx, id);
        await this.syncRelations(tx, id, relations);
      }

      const record = await tx.primaryEmail.findUniqueOrThrow({
        where: { id },
        include: primaryEmailInclude
      });

      return this.serialize(record);
    });
  }

  async remove(userId: string, id: string) {
    const record = await this.prisma.primaryEmail.findFirst({
      where: {
        id,
        userId
      }
    });

    if (!record) {
      throw new NotFoundException('主邮箱不存在');
    }

    await this.prisma.primaryEmail.delete({
      where: { id }
    });

    return {
      success: true
    };
  }

  private serialize(record: PrimaryEmailRecord) {
    const registerPhones = [...record.registerPhoneLinks]
      .map((link) => ({
        id: link.registerPhone.id,
        phone: link.registerPhone.phone,
        countryCode: link.registerPhone.countryCode,
        note: link.registerPhone.note,
        label: phoneLabel(link.registerPhone.countryCode, link.registerPhone.phone)
      }))
      .sort((left, right) => left.label.localeCompare(right.label));

    const recoveryEmails = [...record.recoveryEmailLinks]
      .map((link) => ({
        id: link.recoveryEmail.id,
        email: link.recoveryEmail.email,
        note: link.recoveryEmail.note
      }))
      .sort((left, right) => left.email.localeCompare(right.email));

    const recoveryPhones = [...record.recoveryPhoneLinks]
      .map((link) => ({
        id: link.recoveryPhone.id,
        phone: link.recoveryPhone.phone,
        countryCode: link.recoveryPhone.countryCode,
        note: link.recoveryPhone.note,
        label: phoneLabel(link.recoveryPhone.countryCode, link.recoveryPhone.phone)
      }))
      .sort((left, right) => left.label.localeCompare(right.label));

    const platforms = [...record.platformLinks]
      .map((link) => ({
        id: link.platform.id,
        name: link.platform.name,
        type: link.platform.type,
        note: link.platform.note
      }))
      .sort((left, right) => left.name.localeCompare(right.name));

    return {
      id: record.id,
      email: record.email,
      password: this.encryptionService.decrypt(record.passwordCiphertext),
      note: record.note,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      registerPhones,
      recoveryEmails,
      recoveryPhones,
      platforms,
      relationshipCount:
        registerPhones.length + recoveryEmails.length + recoveryPhones.length + platforms.length
    };
  }

  private async ensureUniqueEmail(
    tx: Prisma.TransactionClient,
    userId: string,
    email: string,
    excludeId?: string
  ) {
    const existing = await tx.primaryEmail.findFirst({
      where: {
        userId,
        email,
        ...(excludeId
          ? {
              id: {
                not: excludeId
              }
            }
          : {})
      }
    });

    if (existing) {
      throw new ConflictException('该主邮箱已存在');
    }
  }

  private hasRelationChange(payload: RelationPayload) {
    return (
      payload.registerPhoneIds !== undefined ||
      payload.recoveryEmailIds !== undefined ||
      payload.recoveryPhoneIds !== undefined ||
      payload.platformIds !== undefined
    );
  }

  private async validateRelations(
    tx: Prisma.TransactionClient,
    userId: string,
    payload: RelationPayload
  ): Promise<ValidatedRelations> {
    const registerPhoneIds = dedupeIds(payload.registerPhoneIds) || [];
    const recoveryEmailIds = dedupeIds(payload.recoveryEmailIds) || [];
    const recoveryPhoneIds = dedupeIds(payload.recoveryPhoneIds) || [];
    const platformIds = dedupeIds(payload.platformIds) || [];

    await Promise.all([
      this.ensureRegisterPhonesOwned(tx, userId, registerPhoneIds),
      this.ensureRecoveryEmailsOwned(tx, userId, recoveryEmailIds),
      this.ensureRecoveryPhonesOwned(tx, userId, recoveryPhoneIds),
      this.ensurePlatformsOwned(tx, userId, platformIds)
    ]);

    return {
      registerPhoneIds,
      recoveryEmailIds,
      recoveryPhoneIds,
      platformIds
    };
  }

  private async ensureRegisterPhonesOwned(
    tx: Prisma.TransactionClient,
    userId: string,
    ids: string[]
  ) {
    if (!ids.length) {
      return;
    }

    const count = await tx.registerPhone.count({
      where: {
        userId,
        id: {
          in: ids
        }
      }
    });

    if (count !== ids.length) {
      throw new ConflictException('存在无效的注册手机号关联项');
    }
  }

  private async ensureRecoveryEmailsOwned(
    tx: Prisma.TransactionClient,
    userId: string,
    ids: string[]
  ) {
    if (!ids.length) {
      return;
    }

    const count = await tx.recoveryEmail.count({
      where: {
        userId,
        id: {
          in: ids
        }
      }
    });

    if (count !== ids.length) {
      throw new ConflictException('存在无效的辅助邮箱关联项');
    }
  }

  private async ensureRecoveryPhonesOwned(
    tx: Prisma.TransactionClient,
    userId: string,
    ids: string[]
  ) {
    if (!ids.length) {
      return;
    }

    const count = await tx.recoveryPhone.count({
      where: {
        userId,
        id: {
          in: ids
        }
      }
    });

    if (count !== ids.length) {
      throw new ConflictException('存在无效的辅助手机号关联项');
    }
  }

  private async ensurePlatformsOwned(
    tx: Prisma.TransactionClient,
    userId: string,
    ids: string[]
  ) {
    if (!ids.length) {
      return;
    }

    const count = await tx.platform.count({
      where: {
        userId,
        id: {
          in: ids
        }
      }
    });

    if (count !== ids.length) {
      throw new ConflictException('存在无效的平台标签关联项');
    }
  }

  private async syncRelations(
    tx: Prisma.TransactionClient,
    emailId: string,
    relations: ValidatedRelations
  ) {
    if (relations.registerPhoneIds.length) {
      await tx.emailRegisterPhone.createMany({
        data: relations.registerPhoneIds.map((registerPhoneId) => ({
          emailId,
          registerPhoneId
        }))
      });
    }

    if (relations.recoveryEmailIds.length) {
      await tx.emailRecoveryEmail.createMany({
        data: relations.recoveryEmailIds.map((recoveryEmailId) => ({
          emailId,
          recoveryEmailId
        }))
      });
    }

    if (relations.recoveryPhoneIds.length) {
      await tx.emailRecoveryPhone.createMany({
        data: relations.recoveryPhoneIds.map((recoveryPhoneId) => ({
          emailId,
          recoveryPhoneId
        }))
      });
    }

    if (relations.platformIds.length) {
      await tx.emailPlatform.createMany({
        data: relations.platformIds.map((platformId) => ({
          emailId,
          platformId
        }))
      });
    }
  }

  private async clearRelations(tx: Prisma.TransactionClient, emailId: string) {
    await Promise.all([
      tx.emailRegisterPhone.deleteMany({ where: { emailId } }),
      tx.emailRecoveryEmail.deleteMany({ where: { emailId } }),
      tx.emailRecoveryPhone.deleteMany({ where: { emailId } }),
      tx.emailPlatform.deleteMany({ where: { emailId } })
    ]);
  }
}
