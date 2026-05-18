import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import { recoveryEmailInclude, type RecoveryEmailRecord } from '../common/entity-includes';
import { normalizeEmailAddress, normalizeOptionalText } from '../common/entity-utils';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRecoveryEmailDto } from './dto/create-recovery-email.dto';
import { UpdateRecoveryEmailDto } from './dto/update-recovery-email.dto';

@Injectable()
export class RecoveryEmailsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async findAll(userId: string, search?: string) {
    const keyword = search?.trim();
    const records = await this.prisma.recoveryEmail.findMany({
      where: {
        userId,
        ...(keyword
          ? {
              OR: [
                {
                  email: {
                    contains: keyword,
                    mode: 'insensitive'
                  }
                },
                {
                  note: {
                    contains: keyword,
                    mode: 'insensitive'
                  }
                }
              ]
            }
          : {})
      },
      include: recoveryEmailInclude,
      orderBy: [{ updatedAt: 'desc' }, { email: 'asc' }]
    });

    return records.map((record) => this.serialize(record));
  }

  async create(userId: string, payload: CreateRecoveryEmailDto) {
    const email = normalizeEmailAddress(payload.email);
    await this.ensureUnique(userId, email);

    const record = await this.prisma.recoveryEmail.create({
      data: {
        userId,
        email,
        note: normalizeOptionalText(payload.note)
      },
      include: recoveryEmailInclude
    });

    return this.serialize(record);
  }

  async update(userId: string, id: string, payload: UpdateRecoveryEmailDto) {
    const current = await this.prisma.recoveryEmail.findFirst({
      where: {
        id,
        userId
      }
    });

    if (!current) {
      throw new NotFoundException('辅助邮箱不存在');
    }

    const nextEmail = payload.email ? normalizeEmailAddress(payload.email) : current.email;

    if (nextEmail !== current.email) {
      await this.ensureUnique(userId, nextEmail, id);
    }

    const record = await this.prisma.recoveryEmail.update({
      where: { id },
      data: {
        ...(payload.email !== undefined ? { email: nextEmail } : {}),
        ...(payload.note !== undefined ? { note: normalizeOptionalText(payload.note) } : {})
      },
      include: recoveryEmailInclude
    });

    return this.serialize(record);
  }

  async remove(userId: string, id: string) {
    const record = await this.prisma.recoveryEmail.findFirst({
      where: {
        id,
        userId
      }
    });

    if (!record) {
      throw new NotFoundException('辅助邮箱不存在');
    }

    await this.prisma.recoveryEmail.delete({
      where: { id }
    });

    return { success: true };
  }

  private async ensureUnique(userId: string, email: string, excludeId?: string) {
    const existing = await this.prisma.recoveryEmail.findFirst({
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
      throw new ConflictException('该辅助邮箱已存在');
    }
  }

  private serialize(record: RecoveryEmailRecord) {
    const associatedEmails = [...record.emailLinks]
      .map((link) => ({
        id: link.email.id,
        email: link.email.email
      }))
      .sort((left, right) => left.email.localeCompare(right.email));

    return {
      id: record.id,
      email: record.email,
      note: record.note,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      associatedEmails,
      associationCount: associatedEmails.length
    };
  }
}
