import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async create(email: string, passwordHash: string, nickname: string, emailVerifiedAt?: Date) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      throw new ConflictException('该邮箱已被注册');
    }

    return this.prisma.user.create({
      data: {
        email,
        passwordHash,
        nickname,
        emailVerifiedAt
      }
    });
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email }
    });
  }

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id }
    });

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    return user;
  }

  async findByIdOrNull(id: string) {
    return this.prisma.user.findUnique({
      where: { id }
    });
  }

  async updatePasswordByEmail(email: string, passwordHash: string) {
    const user = await this.findByEmail(email);

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    return this.prisma.user.update({
      where: { email },
      data: {
        passwordHash
      }
    });
  }

  async updatePasswordById(id: string, passwordHash: string) {
    await this.findById(id);

    return this.prisma.user.update({
      where: { id },
      data: {
        passwordHash
      }
    });
  }
}
