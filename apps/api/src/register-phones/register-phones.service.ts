import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import { registerPhoneInclude, type RegisterPhoneRecord } from '../common/entity-includes';
import {
  normalizeCountryCode,
  normalizeOptionalText,
  normalizePhoneNumber,
  phoneLabel
} from '../common/entity-utils';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRegisterPhoneDto } from './dto/create-register-phone.dto';
import { UpdateRegisterPhoneDto } from './dto/update-register-phone.dto';

@Injectable()
export class RegisterPhonesService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async findAll(userId: string, search?: string) {
    const keyword = search?.trim();
    const records = await this.prisma.registerPhone.findMany({
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
      include: registerPhoneInclude,
      orderBy: [{ updatedAt: 'desc' }, { countryCode: 'asc' }, { phone: 'asc' }]
    });

    return records.map((record) => this.serialize(record));
  }

  async create(userId: string, payload: CreateRegisterPhoneDto) {
    const countryCode = normalizeCountryCode(payload.countryCode);
    const phone = normalizePhoneNumber(payload.phone);
    await this.ensureUnique(userId, countryCode, phone);

    const record = await this.prisma.registerPhone.create({
      data: {
        userId,
        countryCode,
        phone,
        note: normalizeOptionalText(payload.note)
      },
      include: registerPhoneInclude
    });

    return this.serialize(record);
  }

  async update(userId: string, id: string, payload: UpdateRegisterPhoneDto) {
    const current = await this.prisma.registerPhone.findFirst({
      where: {
        id,
        userId
      }
    });

    if (!current) {
      throw new NotFoundException('注册手机号不存在');
    }

    const nextCountryCode = payload.countryCode
      ? normalizeCountryCode(payload.countryCode)
      : current.countryCode;
    const nextPhone = payload.phone ? normalizePhoneNumber(payload.phone) : current.phone;

    if (nextCountryCode !== current.countryCode || nextPhone !== current.phone) {
      await this.ensureUnique(userId, nextCountryCode, nextPhone, id);
    }

    const record = await this.prisma.registerPhone.update({
      where: { id },
      data: {
        ...(payload.countryCode !== undefined ? { countryCode: nextCountryCode } : {}),
        ...(payload.phone !== undefined ? { phone: nextPhone } : {}),
        ...(payload.note !== undefined ? { note: normalizeOptionalText(payload.note) } : {})
      },
      include: registerPhoneInclude
    });

    return this.serialize(record);
  }

  async remove(userId: string, id: string) {
    const record = await this.prisma.registerPhone.findFirst({
      where: {
        id,
        userId
      }
    });

    if (!record) {
      throw new NotFoundException('注册手机号不存在');
    }

    await this.prisma.registerPhone.delete({
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
    const existing = await this.prisma.registerPhone.findFirst({
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
      throw new ConflictException('该注册手机号已存在');
    }
  }

  private serialize(record: RegisterPhoneRecord) {
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
