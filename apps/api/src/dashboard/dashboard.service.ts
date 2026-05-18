import { Inject, Injectable } from '@nestjs/common';
import { primaryEmailInclude } from '../common/entity-includes';
import { phoneLabel } from '../common/entity-utils';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async getOverview(userId: string) {
    const [
      primaryEmailCount,
      recoveryEmailCount,
      registerPhoneCount,
      recoveryPhoneCount,
      platformCount,
      emailPlatformCount,
      emailRecoveryEmailCount,
      emailRegisterPhoneCount,
      emailRecoveryPhoneCount,
      primaryEmails,
      recentRecoveryEmails,
      recentRegisterPhones,
      recentRecoveryPhones,
      recentPlatforms,
      platformConnectivity
    ] = await Promise.all([
      this.prisma.primaryEmail.count({ where: { userId } }),
      this.prisma.recoveryEmail.count({ where: { userId } }),
      this.prisma.registerPhone.count({ where: { userId } }),
      this.prisma.recoveryPhone.count({ where: { userId } }),
      this.prisma.platform.count({ where: { userId } }),
      this.prisma.emailPlatform.count({
        where: {
          email: { userId }
        }
      }),
      this.prisma.emailRecoveryEmail.count({
        where: {
          email: { userId }
        }
      }),
      this.prisma.emailRegisterPhone.count({
        where: {
          email: { userId }
        }
      }),
      this.prisma.emailRecoveryPhone.count({
        where: {
          email: { userId }
        }
      }),
      this.prisma.primaryEmail.findMany({
        where: { userId },
        include: primaryEmailInclude,
        orderBy: [{ updatedAt: 'desc' }, { email: 'asc' }]
      }),
      this.prisma.recoveryEmail.findMany({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
        take: 5
      }),
      this.prisma.registerPhone.findMany({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
        take: 5
      }),
      this.prisma.recoveryPhone.findMany({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
        take: 5
      }),
      this.prisma.platform.findMany({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
        take: 5
      }),
      this.prisma.platform.findMany({
        where: { userId },
        include: {
          _count: {
            select: {
              emailLinks: true
            }
          }
        }
      })
    ]);

    const relationshipCount =
      emailPlatformCount +
      emailRecoveryEmailCount +
      emailRegisterPhoneCount +
      emailRecoveryPhoneCount;

    const recentPrimaryEmails = primaryEmails.slice(0, 5).map((record) => ({
      id: record.id,
      email: record.email,
      note: record.note,
      updatedAt: record.updatedAt,
      createdAt: record.createdAt,
      relationshipCount:
        record.platformLinks.length +
        record.recoveryEmailLinks.length +
        record.registerPhoneLinks.length +
        record.recoveryPhoneLinks.length
    }));

    const recentUpdates = [
      ...primaryEmails.slice(0, 5).map((record) => ({
        id: `primary-email:${record.id}`,
        entityType: 'PRIMARY_EMAIL',
        title: record.email,
        subtitle: '主邮箱',
        updatedAt: record.updatedAt
      })),
      ...recentRecoveryEmails.map((record) => ({
        id: `recovery-email:${record.id}`,
        entityType: 'RECOVERY_EMAIL',
        title: record.email,
        subtitle: '辅助邮箱',
        updatedAt: record.updatedAt
      })),
      ...recentRegisterPhones.map((record) => ({
        id: `register-phone:${record.id}`,
        entityType: 'REGISTER_PHONE',
        title: phoneLabel(record.countryCode, record.phone),
        subtitle: '注册号码',
        updatedAt: record.updatedAt
      })),
      ...recentRecoveryPhones.map((record) => ({
        id: `recovery-phone:${record.id}`,
        entityType: 'RECOVERY_PHONE',
        title: phoneLabel(record.countryCode, record.phone),
        subtitle: '辅助号码',
        updatedAt: record.updatedAt
      })),
      ...recentPlatforms.map((record) => ({
        id: `platform:${record.id}`,
        entityType: 'PLATFORM',
        title: record.name,
        subtitle: record.type,
        updatedAt: record.updatedAt
      }))
    ]
      .sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime())
      .slice(0, 10);

    const recentRelationships = await this.getRecentRelationships(userId);

    const entityDistribution = [
      { name: '主邮箱', count: primaryEmailCount },
      { name: '辅助邮箱', count: recoveryEmailCount },
      { name: '注册号码', count: registerPhoneCount },
      { name: '辅助号码', count: recoveryPhoneCount },
      { name: '平台标签', count: platformCount }
    ];

    const platformDistribution = platformConnectivity
      .map((record) => ({
        name: record.name,
        type: record.type,
        count: record._count.emailLinks
      }))
      .sort((left, right) => right.count - left.count)
      .slice(0, 10);

    const topConnectedEmails = primaryEmails
      .map((record) => ({
        id: record.id,
        email: record.email,
        count:
          record.platformLinks.length +
          record.recoveryEmailLinks.length +
          record.registerPhoneLinks.length +
          record.recoveryPhoneLinks.length
      }))
      .sort((left, right) => right.count - left.count)
      .slice(0, 5);

    return {
      stats: {
        primaryEmailCount,
        recoveryEmailCount,
        registerPhoneCount,
        recoveryPhoneCount,
        platformCount,
        relationshipCount
      },
      recentPrimaryEmails,
      recentUpdates,
      recentRelationships,
      entityDistribution,
      platformDistribution,
      topConnectedEmails
    };
  }

  private async getRecentRelationships(userId: string) {
    const [platformLinks, recoveryEmailLinks, registerPhoneLinks, recoveryPhoneLinks] =
      await Promise.all([
        this.prisma.emailPlatform.findMany({
          where: {
            email: { userId }
          },
          include: {
            email: true,
            platform: true
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: 8
        }),
        this.prisma.emailRecoveryEmail.findMany({
          where: {
            email: { userId }
          },
          include: {
            email: true,
            recoveryEmail: true
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: 8
        }),
        this.prisma.emailRegisterPhone.findMany({
          where: {
            email: { userId }
          },
          include: {
            email: true,
            registerPhone: true
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: 8
        }),
        this.prisma.emailRecoveryPhone.findMany({
          where: {
            email: { userId }
          },
          include: {
            email: true,
            recoveryPhone: true
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: 8
        })
      ]);

    return [
      ...platformLinks.map((record) => ({
        id: `platform:${record.emailId}:${record.platformId}`,
        type: '平台标签',
        sourceLabel: record.email.email,
        targetLabel: record.platform.name,
        createdAt: record.createdAt
      })),
      ...recoveryEmailLinks.map((record) => ({
        id: `recovery-email:${record.emailId}:${record.recoveryEmailId}`,
        type: '辅助邮箱',
        sourceLabel: record.email.email,
        targetLabel: record.recoveryEmail.email,
        createdAt: record.createdAt
      })),
      ...registerPhoneLinks.map((record) => ({
        id: `register-phone:${record.emailId}:${record.registerPhoneId}`,
        type: '注册号码',
        sourceLabel: record.email.email,
        targetLabel: phoneLabel(record.registerPhone.countryCode, record.registerPhone.phone),
        createdAt: record.createdAt
      })),
      ...recoveryPhoneLinks.map((record) => ({
        id: `recovery-phone:${record.emailId}:${record.recoveryPhoneId}`,
        type: '辅助号码',
        sourceLabel: record.email.email,
        targetLabel: phoneLabel(record.recoveryPhone.countryCode, record.recoveryPhone.phone),
        createdAt: record.createdAt
      }))
    ]
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
      .slice(0, 10);
  }
}
