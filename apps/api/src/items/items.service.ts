import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ItemStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateItemDto } from './dto/create-item.dto';
import { QueryItemsDto } from './dto/query-items.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { calculateItemMetrics } from './item-metrics';

type ItemRecord = Prisma.ItemGetPayload<{
  include: {
    category: true;
  };
}>;

@Injectable()
export class ItemsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async create(userId: number, payload: CreateItemDto) {
    const item = await this.prisma.item.create({
      data: {
        userId,
        categoryId: payload.categoryId,
        name: payload.name,
        price: new Prisma.Decimal(payload.price),
        purchaseDate: new Date(payload.purchaseDate),
        expectedLifeDays: payload.expectedLifeDays,
        endDate: payload.endDate ? new Date(payload.endDate) : undefined,
        status: payload.status ?? ItemStatus.ACTIVE,
        referenceDailyValue:
          payload.referenceDailyValue !== undefined
            ? new Prisma.Decimal(payload.referenceDailyValue)
            : undefined,
        usageFrequency: payload.usageFrequency,
        emotionScore: payload.emotionScore,
        note: payload.note
      },
      include: {
        category: true
      }
    });

    return this.serializeItem(item);
  }

  async findAll(userId: number, query: QueryItemsDto) {
    const records = await this.prisma.item.findMany({
      where: {
        userId,
        ...(query.search
          ? {
              name: {
                contains: query.search,
                mode: 'insensitive'
              }
            }
          : {}),
        ...(query.categoryId ? { categoryId: query.categoryId } : {}),
        ...(query.status ? { status: query.status } : {})
      },
      include: {
        category: true
      }
    });

    const items = records.map((record) => this.serializeItem(record));
    const sorted = this.sortItems(items, query.sortBy, query.order as 'asc' | 'desc');
    const total = sorted.length;
    const start = (query.page - 1) * query.pageSize;
    const paginated = sorted.slice(start, start + query.pageSize);

    return {
      page: query.page,
      pageSize: query.pageSize,
      total,
      items: paginated
    };
  }

  async findOne(userId: number, id: number) {
    const item = await this.prisma.item.findFirst({
      where: {
        id,
        userId
      },
      include: {
        category: true
      }
    });

    if (!item) {
      throw new NotFoundException('物品不存在');
    }

    return this.serializeItem(item);
  }

  async update(userId: number, id: number, payload: UpdateItemDto) {
    await this.ensureItemExists(userId, id);

    const item = await this.prisma.item.update({
      where: { id },
      data: {
        ...(payload.categoryId !== undefined ? { categoryId: payload.categoryId } : {}),
        ...(payload.name !== undefined ? { name: payload.name } : {}),
        ...(payload.price !== undefined ? { price: new Prisma.Decimal(payload.price) } : {}),
        ...(payload.purchaseDate !== undefined
          ? { purchaseDate: new Date(payload.purchaseDate) }
          : {}),
        ...(payload.expectedLifeDays !== undefined
          ? { expectedLifeDays: payload.expectedLifeDays }
          : {}),
        ...(payload.endDate !== undefined
          ? { endDate: payload.endDate ? new Date(payload.endDate) : null }
          : {}),
        ...(payload.status !== undefined ? { status: payload.status } : {}),
        ...(payload.referenceDailyValue !== undefined
          ? {
              referenceDailyValue:
                payload.referenceDailyValue === null
                  ? null
                  : new Prisma.Decimal(payload.referenceDailyValue)
            }
          : {}),
        ...(payload.usageFrequency !== undefined ? { usageFrequency: payload.usageFrequency } : {}),
        ...(payload.emotionScore !== undefined ? { emotionScore: payload.emotionScore } : {}),
        ...(payload.note !== undefined ? { note: payload.note } : {})
      },
      include: {
        category: true
      }
    });

    return this.serializeItem(item);
  }

  async remove(userId: number, id: number) {
    await this.ensureItemExists(userId, id);

    await this.prisma.item.delete({
      where: { id }
    });

    return { success: true };
  }

  private async ensureItemExists(userId: number, id: number) {
    const item = await this.prisma.item.findFirst({
      where: {
        id,
        userId
      }
    });

    if (!item) {
      throw new NotFoundException('物品不存在');
    }

    return item;
  }

  private serializeItem(record: ItemRecord) {
    const price = Number(record.price);
    const referenceDailyValue =
      record.referenceDailyValue !== null ? Number(record.referenceDailyValue) : null;
    const metrics = calculateItemMetrics({
      price,
      purchaseDate: record.purchaseDate,
      expectedLifeDays: record.expectedLifeDays,
      endDate: record.endDate,
      updatedAt: record.updatedAt,
      status: record.status,
      referenceDailyValue,
      usageFrequency: record.usageFrequency,
      emotionScore: record.emotionScore
    });

    return {
      id: record.id,
      userId: record.userId,
      categoryId: record.categoryId,
      name: record.name,
      price,
      purchaseDate: record.purchaseDate,
      expectedLifeDays: record.expectedLifeDays,
      endDate: record.endDate,
      status: record.status,
      referenceDailyValue,
      usageFrequency: record.usageFrequency,
      emotionScore: record.emotionScore,
      note: record.note,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      category: record.category,
      metrics
    };
  }

  private sortItems(
    items: Array<ReturnType<ItemsService['serializeItem']>>,
    sortBy: string,
    order: 'asc' | 'desc'
  ) {
    const direction = order === 'asc' ? 1 : -1;

    return [...items].sort((left, right) => {
      const leftValue = this.getSortValue(left, sortBy);
      const rightValue = this.getSortValue(right, sortBy);

      if (leftValue < rightValue) {
        return -1 * direction;
      }

      if (leftValue > rightValue) {
        return 1 * direction;
      }

      return 0;
    });
  }

  private getSortValue(item: ReturnType<ItemsService['serializeItem']>, sortBy: string) {
    switch (sortBy) {
      case 'purchaseDate':
        return item.purchaseDate.getTime();
      case 'price':
        return item.price;
      case 'name':
        return item.name.toLowerCase();
      case 'dailyValue':
        return item.metrics.dailyValue;
      case 'costPerformance':
        return item.metrics.costPerformanceIndex ?? 0;
      case 'usedDays':
        return item.metrics.usedDays;
      case 'updatedAt':
      default:
        return item.updatedAt.getTime();
    }
  }
}

