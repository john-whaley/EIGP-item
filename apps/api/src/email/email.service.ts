import {
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

type AuthMailPurpose = 'register' | 'login' | 'reset-password';

interface SendAuthCodeMailInput {
  code: string;
  email: string;
  purpose: AuthMailPurpose;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly resendApiKey: string;
  private readonly resendFromEmail: string;
  private readonly mailDebug: boolean;
  private readonly resendClient: Resend | null;

  constructor(@Inject(ConfigService) private readonly configService: ConfigService) {
    this.resendApiKey = this.configService.get<string>('RESEND_API_KEY', '').trim();
    this.resendFromEmail = this.configService.get<string>(
      'RESEND_FROM_EMAIL',
      'EIGP <onboarding@resend.dev>'
    );
    this.mailDebug = this.configService.get<string>('MAIL_DEBUG', 'true') === 'true';
    this.resendClient = this.resendApiKey ? new Resend(this.resendApiKey) : null;
  }

  async sendAuthCodeMail(input: SendAuthCodeMailInput) {
    const copy = this.getMailCopy(input.purpose);
    const html = `
      <div style="font-family:Segoe UI,PingFang SC,Microsoft YaHei,sans-serif;padding:24px;color:#0f172a">
        <h2 style="margin:0 0 16px">Email Identity Graph Platform</h2>
        <p style="margin:0 0 12px">${copy.intro}</p>
        <p style="margin:0 0 12px">你的验证码是：</p>
        <div style="display:inline-block;padding:14px 18px;background:#0f172a;color:#f8fafc;border-radius:12px;font-size:28px;font-weight:700;letter-spacing:6px">
          ${input.code}
        </div>
        <p style="margin:16px 0 0;color:#475569">验证码 10 分钟内有效，请勿泄露给他人。</p>
      </div>
    `;

    if (!this.resendClient) {
      this.logger.warn(
        `[MAIL_DEBUG] Resend 未配置，验证码仅输出到控制台。email=${input.email} code=${input.code} purpose=${input.purpose}`
      );
      return {
        provider: 'console' as const,
        previewCode: this.mailDebug ? input.code : undefined
      };
    }

    try {
      const { error } = await this.resendClient.emails.send({
        from: this.resendFromEmail,
        to: [input.email],
        subject: copy.subject,
        html
      });

      if (error) {
        throw error;
      }

      return {
        provider: 'resend' as const,
        previewCode: this.mailDebug ? input.code : undefined
      };
    } catch (error) {
      this.logger.error(`发送邮件失败: ${String(error)}`);
      throw new InternalServerErrorException('验证码发送失败，请稍后再试');
    }
  }

  private getMailCopy(purpose: AuthMailPurpose) {
    switch (purpose) {
      case 'register':
        return {
          subject: 'EIGP 注册验证码',
          intro: '你正在注册 Email Identity Graph Platform 账号。'
        };
      case 'login':
        return {
          subject: 'EIGP 登录验证码',
          intro: '你正在使用邮箱验证码登录 Email Identity Graph Platform。'
        };
      case 'reset-password':
      default:
        return {
          subject: 'EIGP 密码重置验证码',
          intro: '你正在重置 Email Identity Graph Platform 的登录密码。'
        };
    }
  }
}
