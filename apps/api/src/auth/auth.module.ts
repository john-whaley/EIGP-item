import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { EmailModule } from '../email/email.module';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { VerificationCodeService } from './verification-code.service';

@Module({
  imports: [
    ConfigModule,
    EmailModule,
    UsersModule,
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET', 'development-secret'),
        signOptions: {
          expiresIn: '7d'
        }
      })
    })
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, VerificationCodeService],
  exports: [AuthService]
})
export class AuthModule {}
