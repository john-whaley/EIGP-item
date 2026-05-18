import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { EmailModule } from './email/email.module';
import { EmailsModule } from './emails/emails.module';
import { GraphModule } from './graph/graph.module';
import { PlatformsModule } from './platforms/platforms.module';
import { PrismaModule } from './prisma/prisma.module';
import { RecoveryEmailsModule } from './recovery-emails/recovery-emails.module';
import { RecoveryPhonesModule } from './recovery-phones/recovery-phones.module';
import { RegisterPhonesModule } from './register-phones/register-phones.module';
import { SearchModule } from './search/search.module';
import { SecurityModule } from './security/security.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true
    }),
    PrismaModule,
    SecurityModule,
    UsersModule,
    EmailModule,
    AuthModule,
    EmailsModule,
    RecoveryEmailsModule,
    RegisterPhonesModule,
    RecoveryPhonesModule,
    PlatformsModule,
    DashboardModule,
    GraphModule,
    SearchModule
  ]
})
export class AppModule {}
