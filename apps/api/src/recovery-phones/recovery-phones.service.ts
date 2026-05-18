import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import { recoveryPhoneInclude, type RecoveryPhoneRecord } from '../common/entity-includes';
import {
  normalizeCountryCode,
  normalizeOptionalText,
  normalizePhoneNumber,
  phoneLabel
} from '../common/entity-utils';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRecoveryPhoneDto } from './dto/create-recovery-phone.dto';
import { UpdateRecoveryPhoneDto } from './dto/update-recovery-phone.dto';

@Injectable()
export class RecoveryPhonesService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async findAll(userId: string, search?: string) {
    const keyword = search?.trim();
    const records = await this.prisma.recoveryPhone.findMany({
      where: {
        userId,
        ...(keyword
          ? {
              OR: [
                {
                  phone: {
                    contains: keyword,
                    mode: 'insensitive'
                  }
                },
                {
                  countryCode: {
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
      include: recoveryPhoneInclude,
      orderBy: [{ updatedAt: 'desc' }, { countryCode: 'asc' }, { phone: 'asc' }]
    });

    return records.map((record) => this.serialize(record));
  }

  async create(userId: string, payload: CreateRecoveryPhoneDto) {
    const countryCode = normalizeCountryCode(payload.countryCode);
    const phone = normalizePhoneNumber(payload.phone);
    await this.ensureUnique(userId, countryCode, phone);

    const record = await this.prisma.recoveryPhone.create({
      data: {
        userId,
        countryCode,
        phone,
        note: normalizeOptionalText(payload.note)
      },
      include: recoveryPhoneInclude
    });

    return this.serialize(record);
  }

  async update(userId: string, id: string, payload: UpdateRecoveryPhoneDto) {
    const current = await this.prisma.recoveryPhone.findFirst({
      where: {
        id,
        userId
      }
    });

    if (!current) {
      throw new NotFoundException('辅助手机号不存在');
    }

    const nextCountryCode = payload.countryCode
      ? normalizeCountryCode(payload.countryCode)
      : current.countryCode;
    const nextPhone = payload.phone ? normalizePhoneNumber(payload.phone) : current.phone;

    if (nextCountryCode !== current.countryCode || nextPhone !== current.phone) {
      await this.ensureUnique(userId, nextCountryCode, nextPhone, id);
    }

    const record = await this.prisma.recoveryPhone.update({
      where: { id },
      data: {
        ...(payload.countryCode !== undefined ? { countryCode: nextCountryCode } : {}),
        ...(payload.phone !== undefined ? { phone: nextPhone } : {}),
        ...(payload.note !== undefined ? { note: normalizeOptionalText(payload.note) } : {})
      },
      include: recoveryPhoneInclude
    });

    return this.serialize(record);
  }

  async remove(userId: string, id: string) {
    const record = await this.prisma.recoveryPhone.findFirst({
      where: {
        id,
        userId
      }
    });

    if (!record) {
      throw new NotFoundException('辅助手机号不存在');
    }

    await this.prisma.recoveryPhone.delete({
      where: { id }
    });

    return { success: true };
  }

  private async ensureUnique(
    userId: string,
    countryCode: string,
    phone: string,
    excludeId?: string
  ) {
    const existing = await this.prisma.recoveryPhone.findFirst({
      where: {
        userId,
        countryCode,
        phone,
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
      throw new ConflictException('该辅助手机号已存在');
    }
  }

  private serialize(record: RecoveryPhoneRecord) {
    const associatedEmails = [...record.emailLinks]
      .map((link) => ({
        id: link.email.id,
        email: link.email.email
      }))
      .sort((left, right) => left.email.localeCompare(right.email));

    return {
      id: record.id,
      countryCode: record.countryCode,
      phone: record.phone,
      label: phoneLabel(record.countryCode, record.phone),
      note: record.note,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      associatedEmails,
      associationCount: associatedEmails.length
    };
  }
}
