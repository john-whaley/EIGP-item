import { Module } from '@nestjs/common';
import { RecoveryPhonesController } from './recovery-phones.controller';
import { RecoveryPhonesService } from './recovery-phones.service';

@Module({
  controllers: [RecoveryPhonesController],
  providers: [RecoveryPhonesService],
  exports: [RecoveryPhonesService]
})
export class RecoveryPhonesModule {}
