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
import { CreateRecoveryEmailDto } from './dto/create-recovery-email.dto';
import { UpdateRecoveryEmailDto } from './dto/update-recovery-email.dto';
import { RecoveryEmailsService } from './recovery-emails.service';

@Controller('recovery-emails')
@UseGuards(JwtAuthGuard)
export class RecoveryEmailsController {
  constructor(
    @Inject(RecoveryEmailsService)
    private readonly recoveryEmailsService: RecoveryEmailsService
  ) {}

  @Get()
  findAll(@CurrentUser() user: { userId: string }, @Query('search') search?: string) {
    return this.recoveryEmailsService.findAll(user.userId, search);
  }

  @Post()
  create(@CurrentUser() user: { userId: string }, @Body() payload: CreateRecoveryEmailDto) {
    return this.recoveryEmailsService.create(user.userId, payload);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: { userId: string },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() payload: UpdateRecoveryEmailDto
  ) {
    return this.recoveryEmailsService.update(user.userId, id, payload);
  }

  @Delete(':id')
  remove(@CurrentUser() user: { userId: string }, @Param('id', ParseUUIDPipe) id: string) {
    return this.recoveryEmailsService.remove(user.userId, id);
  }
}
