import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { VerificationCodePurpose } from '@prisma/client';
import { createHash, randomInt } from 'node:crypto';
import { EmailService } from '../email/email.service';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { VERIFICATION_CODE_LENGTH } from './auth.constants';

@Injectable()
export class VerificationCodeService {
  constructor(
    @Inject(ConfigService) private readonly configService: ConfigService,
    @Inject(EmailService) private readonly emailService: EmailService,
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(UsersService) private readonly usersService: UsersService
  ) {}

  async sendRegisterCode(email: string) {
    const normalizedEmail = this.normalizeEmail(email);
    const user = await this.usersService.findByEmail(normalizedEmail);

    if (user) {
      throw new BadRequestException('该邮箱已注册，请直接登录');
    }

    return this.issueCode(normalizedEmail, VerificationCodePurpose.REGISTER);
  }

  async sendLoginCode(email: string) {
    const normalizedEmail = this.normalizeEmail(email);
    const user = await this.usersService.findByEmail(normalizedEmail);

    if (!user) {
      throw new BadRequestException('该邮箱尚未注册');
    }

    return this.issueCode(normalizedEmail, VerificationCodePurpose.LOGIN);
  }

  async sendPasswordResetCode(email: string) {
    const normalizedEmail = this.normalizeEmail(email);
    const user = await this.usersService.findByEmail(normalizedEmail);

    if (!user) {
      return {
        success: true,
        message: '如果该邮箱已注册，我们会发送一封重置验证码邮件'
      };
    }

    return this.issueCode(normalizedEmail, VerificationCodePurpose.RESET_PASSWORD);
  }

  async consumeCode(email: string, purpose: VerificationCodePurpose, code: string) {
    const normalizedEmail = this.normalizeEmail(email);
    const normalizedCode = code.trim();

    const record = await this.prisma.verificationCode.findFirst({
      where: {
        email: normalizedEmail,
        purpose,
        consumedAt: null
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (!record) {
      throw new BadRequestException('验证码不存在或已失效');
    }

    if (record.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException('验证码已过期，请重新获取');
    }

    const codeHash = this.hashCode(normalizedEmail, purpose, normalizedCode);

    if (codeHash !== record.codeHash) {
      throw new BadRequestException('验证码错误');
    }

    await this.prisma.verificationCode.update({
      where: { id: record.id },
      data: {
        consumedAt: new Date()
      }
    });
  }

  private async issueCode(email: string, purpose: VerificationCodePurpose) {
    const code = String(randomInt(0, 10 ** VERIFICATION_CODE_LENGTH)).padStart(
      VERIFICATION_CODE_LENGTH,
      '0'
    );
    const codeHash = this.hashCode(email, purpose, code);
    const expiresInMinutes = this.configService.get<number>(
      'VERIFICATION_CODE_EXPIRES_MINUTES',
      10
    );
    const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);

    await this.prisma.verificationCode.deleteMany({
      where: {
        email,
        purpose
      }
    });

    const record = await this.prisma.verificationCode.create({
      data: {
        email,
        purpose,
        codeHash,
        expiresAt
      }
    });

    try {
      const delivery = await this.emailService.sendAuthCodeMail({
        code,
        email,
        purpose:
          purpose === VerificationCodePurpose.REGISTER
            ? 'register'
            : purpose === VerificationCodePurpose.LOGIN
              ? 'login'
              : 'reset-password'
      });

      return {
        success: true,
        message: '验证码已发送，请检查邮箱',
        expiresInMinutes,
        ...(delivery.previewCode ? { debugCode: delivery.previewCode } : {})
      };
    } catch (error) {
      await this.prisma.verificationCode.delete({
        where: { id: record.id }
      });
      throw error;
    }
  }

  private hashCode(email: string, purpose: VerificationCodePurpose, code: string) {
    const secret = this.configService.get<string>('JWT_SECRET', 'development-secret');
    return createHash('sha256')
      .update(`${email}:${purpose}:${code}:${secret}`)
      .digest('hex');
  }

  private normalizeEmail(email: string) {
    return email.trim().toLowerCase();
  }
}
