import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import { CategoryScope } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  findAll(scope?: CategoryScope) {
    return this.prisma.category.findMany({
      where: scope ? { scope } : undefined,
      include: {
        children: true
      },
      orderBy: [
        { scope: 'asc' },
        { parentId: 'asc' },
        { name: 'asc' }
      ]
    });
  }

  async create(payload: CreateCategoryDto) {
    const duplicate = await this.prisma.category.findFirst({
      where: {
        scope: payload.scope,
        name: payload.name
      }
    });

    if (duplicate) {
      throw new ConflictException('该作用域下分类名称已存在');
    }

    if (payload.parentId) {
      const parent = await this.ensureCategoryExists(payload.parentId);
      if (parent.scope !== payload.scope) {
        throw new ConflictException('父分类必须和当前分类属于同一作用域');
      }
    }

    return this.prisma.category.create({
      data: payload
    });
  }

  async update(id: number, payload: UpdateCategoryDto) {
    const current = await this.ensureCategoryExists(id);
    const nextScope = payload.scope ?? current.scope;
    const nextName = payload.name ?? current.name;

    if (payload.parentId === id) {
      throw new ConflictException('分类不能把自己设为父级');
    }

    const duplicate = await this.prisma.category.findFirst({
      where: {
        id: {
          not: id
        },
        scope: nextScope,
        name: nextName
      }
    });

    if (duplicate) {
      throw new ConflictException('该作用域下分类名称已存在');
    }

    if (payload.parentId) {
      const parent = await this.ensureCategoryExists(payload.parentId);
      if (parent.scope !== nextScope) {
        throw new ConflictException('父分类必须和当前分类属于同一作用域');
      }
    }

    return this.prisma.category.update({
      where: { id },
      data: payload
    });
  }

  async remove(id: number) {
    await this.ensureCategoryExists(id);

    const [childCount, itemCount, subscriptionCount] = await Promise.all([
      this.prisma.category.count({ where: { parentId: id } }),
      this.prisma.item.count({ where: { categoryId: id } }),
      this.prisma.subscription.count({ where: { categoryId: id } })
    ]);

    if (childCount > 0) {
      throw new ConflictException('该分类下还有子分类，无法删除');
    }

    if (itemCount > 0 || subscriptionCount > 0) {
      throw new ConflictException('该分类仍被物品或周期性支出使用，无法删除');
    }

    await this.prisma.category.delete({
      where: { id }
    });

    return { success: true };
  }

  private async ensureCategoryExists(id: number) {
    const category = await this.prisma.category.findUnique({
      where: { id }
    });

    if (!category) {
      throw new NotFoundException('分类不存在');
    }

    return category;
  }
}

