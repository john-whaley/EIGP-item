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
export class GraphService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(EncryptionService) private readonly encryptionService: EncryptionService
  ) {}

  async getGraph(userId: string) {
    const [primaryEmails, recoveryEmails, registerPhones, recoveryPhones, platforms] =
      await Promise.all([
        this.prisma.primaryEmail.findMany({
          where: { userId },
          include: primaryEmailInclude,
          orderBy: { email: 'asc' }
        }),
        this.prisma.recoveryEmail.findMany({
          where: { userId },
          include: recoveryEmailInclude,
          orderBy: { email: 'asc' }
        }),
        this.prisma.registerPhone.findMany({
          where: { userId },
          include: registerPhoneInclude,
          orderBy: [{ countryCode: 'asc' }, { phone: 'asc' }]
        }),
        this.prisma.recoveryPhone.findMany({
          where: { userId },
          include: recoveryPhoneInclude,
          orderBy: [{ countryCode: 'asc' }, { phone: 'asc' }]
        }),
        this.prisma.platform.findMany({
          where: { userId },
          include: platformInclude,
          orderBy: { name: 'asc' }
        })
      ]);

    const nodes = [
      ...primaryEmails.map((record) => ({
        id: `primary-email:${record.id}`,
        entityId: record.id,
        type: 'primaryEmail',
        label: record.email,
        subtitle: '主邮箱',
        note: record.note,
        detail: {
          邮箱: record.email,
          密码: this.encryptionService.decrypt(record.passwordCiphertext),
          备注: record.note,
          注册号码: record.registerPhoneLinks.map((link) =>
            phoneLabel(link.registerPhone.countryCode, link.registerPhone.phone)
          ),
          辅助邮箱: record.recoveryEmailLinks.map((link) => link.recoveryEmail.email),
          辅助号码: record.recoveryPhoneLinks.map((link) =>
            phoneLabel(link.recoveryPhone.countryCode, link.recoveryPhone.phone)
          ),
          平台标签: record.platformLinks.map((link) => link.platform.name)
        }
      })),
      ...recoveryEmails.map((record) => ({
        id: `recovery-email:${record.id}`,
        entityId: record.id,
        type: 'recoveryEmail',
        label: record.email,
        subtitle: '辅助邮箱',
        note: record.note,
        detail: {
          邮箱: record.email,
          备注: record.note,
          关联主邮箱: record.emailLinks.map((link) => link.email.email)
        }
      })),
      ...registerPhones.map((record) => ({
        id: `register-phone:${record.id}`,
        entityId: record.id,
        type: 'registerPhone',
        label: phoneLabel(record.countryCode, record.phone),
        subtitle: '注册号码',
        note: record.note,
        detail: {
          区号: record.countryCode,
          号码: record.phone,
          备注: record.note,
          关联主邮箱: record.emailLinks.map((link) => link.email.email)
        }
      })),
      ...recoveryPhones.map((record) => ({
        id: `recovery-phone:${record.id}`,
        entityId: record.id,
        type: 'recoveryPhone',
        label: phoneLabel(record.countryCode, record.phone),
        subtitle: '辅助号码',
        note: record.note,
        detail: {
          区号: record.countryCode,
          号码: record.phone,
          备注: record.note,
          关联主邮箱: record.emailLinks.map((link) => link.email.email)
        }
      })),
      ...platforms.map((record) => ({
        id: `platform:${record.id}`,
        entityId: record.id,
        type: 'platform',
        label: record.name,
        subtitle: record.type,
        note: record.note,
        detail: {
          名称: record.name,
          分类: record.type,
          备注: record.note,
          关联主邮箱: record.emailLinks.map((link) => link.email.email)
        }
      }))
    ];

    const edges = [
      ...primaryEmails.flatMap((record) =>
        record.platformLinks.map((link) => ({
          id: `platform:${record.id}:${link.platformId}`,
          source: `primary-email:${record.id}`,
          target: `platform:${link.platformId}`,
          type: 'platform',
          label: '平台标签'
        }))
      ),
      ...primaryEmails.flatMap((record) =>
        record.recoveryEmailLinks.map((link) => ({
          id: `recovery-email:${record.id}:${link.recoveryEmailId}`,
          source: `primary-email:${record.id}`,
          target: `recovery-email:${link.recoveryEmailId}`,
          type: 'recoveryEmail',
          label: '辅助邮箱'
        }))
      ),
      ...primaryEmails.flatMap((record) =>
        record.registerPhoneLinks.map((link) => ({
          id: `register-phone:${record.id}:${link.registerPhoneId}`,
          source: `primary-email:${record.id}`,
          target: `register-phone:${link.registerPhoneId}`,
          type: 'registerPhone',
          label: '注册号码'
        }))
      ),
      ...primaryEmails.flatMap((record) =>
        record.recoveryPhoneLinks.map((link) => ({
          id: `recovery-phone:${record.id}:${link.recoveryPhoneId}`,
          source: `primary-email:${record.id}`,
          target: `recovery-phone:${link.recoveryPhoneId}`,
          type: 'recoveryPhone',
          label: '辅助号码'
        }))
      )
    ];

    return {
      summary: {
        primaryEmails: primaryEmails.length,
        recoveryEmails: recoveryEmails.length,
        registerPhones: registerPhones.length,
        recoveryPhones: recoveryPhones.length,
        platforms: platforms.length,
        relationships: edges.length
      },
      nodes,
      edges
    };
  }
}
