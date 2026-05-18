import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards
} from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CreateRecoveryPhoneDto } from './dto/create-recovery-phone.dto';
import { UpdateRecoveryPhoneDto } from './dto/update-recovery-phone.dto';
import { RecoveryPhonesService } from './recovery-phones.service';

@Controller('recovery-phones')
@UseGuards(JwtAuthGuard)
export class RecoveryPhonesController {
  constructor(
    @Inject(RecoveryPhonesService)
    private readonly recoveryPhonesService: RecoveryPhonesService
  ) {}

  @Get()
  findAll(@CurrentUser() user: { userId: string }, @Query('search') search?: string) {
    return this.recoveryPhonesService.findAll(user.userId, search);
  }

  @Post()
  create(@CurrentUser() user: { userId: string }, @Body() payload: CreateRecoveryPhoneDto) {
    return this.recoveryPhonesService.create(user.userId, payload);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: { userId: string },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() payload: UpdateRecoveryPhoneDto
  ) {
    return this.recoveryPhonesService.update(user.userId, id, payload);
  }

  @Delete(':id')
  remove(@CurrentUser() user: { userId: string }, @Param('id', ParseUUIDPipe) id: string) {
    return this.recoveryPhonesService.remove(user.userId, id);
  }
}
