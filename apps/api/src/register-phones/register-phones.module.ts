import { Module } from '@nestjs/common';
import { RegisterPhonesController } from './register-phones.controller';
import { RegisterPhonesService } from './register-phones.service';

@Module({
  controllers: [RegisterPhonesController],
  providers: [RegisterPhonesService],
  exports: [RegisterPhonesService]
})
export class RegisterPhonesModule {}
