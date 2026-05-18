import { Module } from '@nestjs/common';
import { RecoveryEmailsController } from './recovery-emails.controller';
import { RecoveryEmailsService } from './recovery-emails.service';

@Module({
  controllers: [RecoveryEmailsController],
  providers: [RecoveryEmailsService],
  exports: [RecoveryEmailsService]
})
export class RecoveryEmailsModule {}
