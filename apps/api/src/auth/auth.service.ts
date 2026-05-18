import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { VerificationCodePurpose } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginWithCodeDto } from './dto/login-with-code.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerificationCodeService } from './verification-code.service';

const CHANGE_PASSWORD_PURPOSE = 'CHANGE_PASSWORD' as VerificationCodePurpose;

@Injectable()
export class AuthService {
  constructor(
    @Inject(UsersService) private readonly usersService: UsersService,
    @Inject(JwtService) private readonly jwtService: JwtService,
    @Inject(VerificationCodeService)
    private readonly verificationCodeService: VerificationCodeService
  ) {}

  sendRegisterCode(email: string) {
    return this.verificationCodeService.sendRegisterCode(email);
  }

  sendLoginCode(email: string) {
    return this.verificationCodeService.sendLoginCode(email);
  }

  async register(payload: RegisterDto) {
    const normalizedEmail = payload.email.trim().toLowerCase();

    await this.verificationCodeService.consumeCode(
      normalizedEmail,
      VerificationCodePurpose.REGISTER,
      payload.code
    );

    const passwordHash = await bcrypt.hash(payload.password, 10);
    const nickname = payload.nickname?.trim() || normalizedEmail.split('@')[0];
    const user = await this.usersService.create(normalizedEmail, passwordHash, nickname, new Date());

    return this.buildAuthResponse(user.id, user.email, user.nickname);
  }

  async login(email: string, password: string) {
    const user = await this.usersService.findByEmail(email.trim().toLowerCase());

    if (!user) {
      throw new UnauthorizedException('邮箱或密码错误');
    }

    const passwordMatched = await bcrypt.compare(password, user.passwordHash);

    if (!passwordMatched) {
      throw new UnauthorizedException('邮箱或密码错误');
    }

    return this.buildAuthResponse(user.id, user.email, user.nickname);
  }

  async loginWithCode(payload: LoginWithCodeDto) {
    const normalizedEmail = payload.email.trim().toLowerCase();

    await this.verificationCodeService.consumeCode(
      normalizedEmail,
      VerificationCodePurpose.LOGIN,
      payload.code
    );

    const user = await this.usersService.findByEmail(normalizedEmail);

    if (!user) {
      throw new UnauthorizedException('该邮箱尚未注册');
    }

    return this.buildAuthResponse(user.id, user.email, user.nickname);
  }

  sendPasswordResetCode(email: string) {
    return this.verificationCodeService.sendPasswordResetCode(email);
  }

  async resetPassword(payload: ResetPasswordDto) {
    const normalizedEmail = payload.email.trim().toLowerCase();

    await this.verificationCodeService.consumeCode(
      normalizedEmail,
      VerificationCodePurpose.RESET_PASSWORD,
      payload.code
    );

    const passwordHash = await bcrypt.hash(payload.password, 10);
    await this.usersService.updatePasswordByEmail(normalizedEmail, passwordHash);

    return {
      success: true,
      message: '密码已重置，请使用新密码登录'
    };
  }

  async sendChangePasswordCode(userId: string) {
    const user = await this.usersService.findById(userId);
    return this.verificationCodeService.sendChangePasswordCode(user.email);
  }

  async changePassword(userId: string, payload: ChangePasswordDto) {
    const user = await this.usersService.findById(userId);

    await this.verificationCodeService.consumeCode(
      user.email,
      CHANGE_PASSWORD_PURPOSE,
      payload.code
    );

    const passwordHash = await bcrypt.hash(payload.newPassword, 10);
    await this.usersService.updatePasswordById(userId, passwordHash);

    return {
      success: true,
      message: '密码修改成功，请重新登录'
    };
  }

  async getProfile(userId: string) {
    const user = await this.usersService.findById(userId);
    return {
      id: user.id,
      email: user.email,
      nickname: user.nickname,
      avatar: user.avatar,
      emailVerifiedAt: user.emailVerifiedAt,
      createdAt: user.createdAt
    };
  }

  private async buildAuthResponse(userId: string, email: string, nickname: string) {
    const accessToken = await this.jwtService.signAsync({
      sub: userId,
      email
    });

    return {
      accessToken,
      user: {
        id: userId,
        email,
        nickname
      }
    };
  }
}
