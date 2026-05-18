import { Inject, Injectable } from '@nestjs/common';
import {
  platformInclude,
  primaryEmailInclude,
  recoveryEmailInclude,
  recoveryPhoneInclude,
  registerPhoneInclude
} from '../common/entity-includes';
import { phoneLabel } from '../common/entity-utils';
import { PrismaService } from '../prisma/prisma.service';
import { EncryptionService } from '../security/encryption.service';

@Injectable()
export class SearchService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(EncryptionService) private readonly encryptionService: EncryptionService
  ) {}

  async search(userId: string, q?: string) {
    const query = q?.trim();

    if (!query) {
      return {
        query: '',
        totals: {
          all: 0,
          primaryEmails: 0,
          recoveryEmails: 0,
          registerPhones: 0,
          recoveryPhones: 0,
          platforms: 0
        },
        groups: []
      };
    }

    const [primaryEmails, recoveryEmails, registerPhones, recoveryPhones, platforms] =
      await Promise.all([
        this.prisma.primaryEmail.findMany({
          where: {
            userId,
            OR: [
              { email: { contains: query, mode: 'insensitive' } },
              { note: { contains: query, mode: 'insensitive' } }
            ]
          },
          include: primaryEmailInclude,
          take: 20,
          orderBy: { updatedAt: 'desc' }
        }),
        this.prisma.recoveryEmail.findMany({
          where: {
            userId,
            OR: [
              { email: { contains: query, mode: 'insensitive' } },
              { note: { contains: query, mode: 'insensitive' } }
            ]
          },
          include: recoveryEmailInclude,
          take: 20,
          orderBy: { updatedAt: 'desc' }
        }),
        this.prisma.registerPhone.findMany({
          where: {
            userId,
            OR: [
              { phone: { contains: query, mode: 'insensitive' } },
              { countryCode: { contains: query, mode: 'insensitive' } },
              { note: { contains: query, mode: 'insensitive' } }
            ]
          },
          include: registerPhoneInclude,
          take: 20,
          orderBy: { updatedAt: 'desc' }
        }),
        this.prisma.recoveryPhone.findMany({
          where: {
            userId,
            OR: [
              { phone: { contains: query, mode: 'insensitive' } },
              { countryCode: { contains: query, mode: 'insensitive' } },
              { note: { contains: query, mode: 'insensitive' } }
            ]
          },
          include: recoveryPhoneInclude,
          take: 20,
          orderBy: { updatedAt: 'desc' }
        }),
        this.prisma.platform.findMany({
          where: {
            userId,
            OR: [
              { name: { contains: query, mode: 'insensitive' } },
              { type: { contains: query, mode: 'insensitive' } },
              { note: { contains: query, mode: 'insensitive' } }
            ]
          },
          include: platformInclude,
          take: 20,
          orderBy: { updatedAt: 'desc' }
        })
      ]);

    const groups = [
      {
        key: 'primary-emails',
        label: '主邮箱',
        count: primaryEmails.length,
        items: primaryEmails.map((record) => ({
          id: record.id,
          entityType: 'PRIMARY_EMAIL',
          title: record.email,
          subtitle: `主邮箱 · ${record.platformLinks.length} 个标签`,
          note: record.note,
          updatedAt: record.updatedAt,
          password: this.encryptionService.decrypt(record.passwordCiphertext),
          related: [
            ...record.platformLinks.map((link) => `平台标签：${link.platform.name}`),
            ...record.recoveryEmailLinks.map((link) => `辅助邮箱：${link.recoveryEmail.email}`),
            ...record.registerPhoneLinks.map(
              (link) =>
                `注册号码：${phoneLabel(
                  link.registerPhone.countryCode,
                  link.registerPhone.phone
                )}`
            ),
            ...record.recoveryPhoneLinks.map(
              (link) =>
                `辅助号码：${phoneLabel(
                  link.recoveryPhone.countryCode,
                  link.recoveryPhone.phone
                )}`
            )
          ]
        }))
      },
      {
        key: 'recovery-emails',
        label: '辅助邮箱',
        count: recoveryEmails.length,
        items: recoveryEmails.map((record) => ({
          id: record.id,
          entityType: 'RECOVERY_EMAIL',
          title: record.email,
          subtitle: '辅助邮箱',
          note: record.note,
          updatedAt: record.updatedAt,
          related: record.emailLinks.map((link) => `关联主邮箱：${link.email.email}`)
        }))
      },
      {
        key: 'register-phones',
        label: '注册号码',
        count: registerPhones.length,
        items: registerPhones.map((record) => ({
          id: record.id,
          entityType: 'REGISTER_PHONE',
          title: phoneLabel(record.countryCode, record.phone),
          subtitle: '注册号码',
          note: record.note,
          updatedAt: record.updatedAt,
          related: record.emailLinks.map((link) => `关联主邮箱：${link.email.email}`)
        }))
      },
      {
        key: 'recovery-phones',
        label: '辅助号码',
        count: recoveryPhones.length,
        items: recoveryPhones.map((record) => ({
          id: record.id,
          entityType: 'RECOVERY_PHONE',
          title: phoneLabel(record.countryCode, record.phone),
          subtitle: '辅助号码',
          note: record.note,
          updatedAt: record.updatedAt,
          related: record.emailLinks.map((link) => `关联主邮箱：${link.email.email}`)
        }))
      },
      {
        key: 'platforms',
        label: '平台标签',
        count: platforms.length,
        items: platforms.map((record) => ({
          id: record.id,
          entityType: 'PLATFORM',
          title: record.name,
          subtitle: record.type,
          note: record.note,
          updatedAt: record.updatedAt,
          related: record.emailLinks.map((link) => `关联主邮箱：${link.email.email}`)
        }))
      }
    ].filter((group) => group.count > 0);

    return {
      query,
      totals: {
        all:
          primaryEmails.length +
          recoveryEmails.length +
          registerPhones.length +
          recoveryPhones.length +
          platforms.length,
        primaryEmails: primaryEmails.length,
        recoveryEmails: recoveryEmails.length,
        registerPhones: registerPhones.length,
        recoveryPhones: recoveryPhones.length,
        platforms: platforms.length
      },
      groups
    };
  }
}
