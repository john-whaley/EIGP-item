import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import { platformInclude, type PlatformRecord } from '../common/entity-includes';
import { normalizeOptionalText } from '../common/entity-utils';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePlatformDto } from './dto/create-platform.dto';
import { UpdatePlatformDto } from './dto/update-platform.dto';

@Injectable()
export class PlatformsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async findAll(userId: string, search?: string) {
    const keyword = search?.trim();
    const records = await this.prisma.platform.findMany({
      where: {
        userId,
        ...(keyword
          ? {
              OR: [
                {
                  name: {
                    contains: keyword,
                    mode: 'insensitive'
                  }
                },
                {
                  type: {
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
      include: platformInclude,
      orderBy: [{ updatedAt: 'desc' }, { name: 'asc' }]
    });

    return records.map((record) => this.serialize(record));
  }

  async create(userId: string, payload: CreatePlatformDto) {
    const name = payload.name.trim();
    const type = payload.type?.trim() || '平台';
    await this.ensureUnique(userId, type, name);

    const record = await this.prisma.platform.create({
      data: {
        userId,
        name,
        type,
        note: normalizeOptionalText(payload.note)
      },
      include: platformInclude
    });

    return this.serialize(record);
  }

  async update(userId: string, id: string, payload: UpdatePlatformDto) {
    const current = await this.prisma.platform.findFirst({
      where: {
        id,
        userId
      }
    });

    if (!current) {
      throw new NotFoundException('平台标签不存在');
    }

    const nextName = payload.name?.trim() || current.name;
    const nextType = payload.type?.trim() || current.type;

    if (nextName !== current.name || nextType !== current.type) {
      await this.ensureUnique(userId, nextType, nextName, id);
    }

    const record = await this.prisma.platform.update({
      where: { id },
      data: {
        ...(payload.name !== undefined ? { name: nextName } : {}),
        ...(payload.type !== undefined ? { type: nextType } : {}),
        ...(payload.note !== undefined ? { note: normalizeOptionalText(payload.note) } : {})
      },
      include: platformInclude
    });

    return this.serialize(record);
  }

  async remove(userId: string, id: string) {
    const record = await this.prisma.platform.findFirst({
      where: {
        id,
        userId
      }
    });

    if (!record) {
      throw new NotFoundException('平台标签不存在');
    }

    await this.prisma.platform.delete({
      where: { id }
    });

    return { success: true };
  }

  private async ensureUnique(userId: string, type: string, name: string, excludeId?: string) {
    const existing = await this.prisma.platform.findFirst({
      where: {
        userId,
        type,
        name,
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
      throw new ConflictException('该平台标签已存在');
    }
  }

  private serialize(record: PlatformRecord) {
    const associatedEmails = [...record.emailLinks]
      .map((link) => ({
        id: link.email.id,
        email: link.email.email
      }))
      .sort((left, right) => left.email.localeCompare(right.email));

    return {
      id: record.id,
      name: record.name,
      type: record.type,
      note: record.note,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      associatedEmails,
      associationCount: associatedEmails.length
    };
  }
}
