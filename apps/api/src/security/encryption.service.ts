import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes
} from 'node:crypto';

@Injectable()
export class EncryptionService {
  private readonly key: Buffer;

  constructor(@Inject(ConfigService) configService: ConfigService) {
    const secret =
      configService.get<string>('APP_ENCRYPTION_KEY')?.trim() ||
      configService.get<string>('JWT_SECRET', 'development-secret');

    this.key = createHash('sha256').update(secret).digest();
  }

  encrypt(value: string) {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);
    const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();

    return `${iv.toString('base64')}.${tag.toString('base64')}.${encrypted.toString('base64')}`;
  }

  decrypt(payload: string) {
    const [ivBase64, tagBase64, valueBase64] = payload.split('.');
    const decipher = createDecipheriv(
      'aes-256-gcm',
      this.key,
      Buffer.from(ivBase64, 'base64')
    );

    decipher.setAuthTag(Buffer.from(tagBase64, 'base64'));

    return Buffer.concat([
      decipher.update(Buffer.from(valueBase64, 'base64')),
      decipher.final()
    ]).toString('utf8');
  }
}
