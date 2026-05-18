import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { calculateSubscriptionMetrics } from './subscription-metrics';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';

type SubscriptionRecord = Prisma.SubscriptionGetPayload<{
  include: {
    category: true;
  };
}>;

@Injectable()
export class SubscriptionsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async create(userId: number, payload: CreateSubscriptionDto) {
    const subscription = await this.prisma.subscription.create({
      data: {
        userId,
        categoryId: payload.categoryId,
        name: payload.name,
        billingCycle: payload.billingCycle,
        price: new Prisma.Decimal(payload.price),
        startedAt: payload.startedAt ? new Date(payload.startedAt) : undefined,
        nextBillingDate: payload.nextBillingDate ? new Date(payload.nextBillingDate) : undefined,
        autoRenew: payload.autoRenew ?? true,
        isActive: payload.isActive ?? true,
        note: payload.note
      },
      include: {
        category: true
      }
    });

    return this.serializeSubscription(subscription);
  }

  async findAll(userId: number) {
    const records = await this.prisma.subscription.findMany({
      where: {
        userId
      },
      include: {
        category: true
      },
      orderBy: [
        { isActive: 'desc' },
        { updatedAt: 'desc' }
      ]
    });

    return records.map((record) => this.serializeSubscription(record));
  }

  async update(userId: number, id: number, payload: UpdateSubscriptionDto) {
    await this.ensureSubscriptionExists(userId, id);

    const subscription = await this.prisma.subscription.update({
      where: { id },
      data: {
        ...(payload.categoryId !== undefined ? { categoryId: payload.categoryId } : {}),
        ...(payload.name !== undefined ? { name: payload.name } : {}),
        ...(payload.billingCycle !== undefined ? { billingCycle: payload.billingCycle } : {}),
        ...(payload.price !== undefined ? { price: new Prisma.Decimal(payload.price) } : {}),
        ...(payload.startedAt !== undefined ? { startedAt: new Date(payload.startedAt) } : {}),
        ...(payload.nextBillingDate !== undefined
          ? {
              nextBillingDate: payload.nextBillingDate ? new Date(payload.nextBillingDate) : null
            }
          : {}),
        ...(payload.autoRenew !== undefined ? { autoRenew: payload.autoRenew } : {}),
        ...(payload.isActive !== undefined ? { isActive: payload.isActive } : {}),
        ...(payload.note !== undefined ? { note: payload.note } : {})
      },
      include: {
        category: true
      }
    });

    return this.serializeSubscription(subscription);
  }

  async remove(userId: number, id: number) {
    await this.ensureSubscriptionExists(userId, id);
    await this.prisma.subscription.delete({
      where: { id }
    });
    return { success: true };
  }

  private async ensureSubscriptionExists(userId: number, id: number) {
    const subscription = await this.prisma.subscription.findFirst({
      where: {
        id,
        userId
      }
    });

    if (!subscription) {
      throw new NotFoundException('周期性支出不存在');
    }

    return subscription;
  }

  private serializeSubscription(record: SubscriptionRecord) {
    const price = Number(record.price);
    const metrics = calculateSubscriptionMetrics({
      billingCycle: record.billingCycle,
      price,
      isActive: record.isActive,
      startedAt: record.startedAt,
      nextBillingDate: record.nextBillingDate
    });

    return {
      id: record.id,
      userId: record.userId,
      categoryId: record.categoryId,
      name: record.name,
      billingCycle: record.billingCycle,
      price,
      startedAt: record.startedAt,
      nextBillingDate: record.nextBillingDate,
      autoRenew: record.autoRenew,
      isActive: record.isActive,
      note: record.note,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      category: record.category,
      metrics
    };
  }
}

