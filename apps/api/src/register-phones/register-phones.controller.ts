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
import { CreateRegisterPhoneDto } from './dto/create-register-phone.dto';
import { UpdateRegisterPhoneDto } from './dto/update-register-phone.dto';
import { RegisterPhonesService } from './register-phones.service';

@Controller('register-phones')
@UseGuards(JwtAuthGuard)
export class RegisterPhonesController {
  constructor(
    @Inject(RegisterPhonesService)
    private readonly registerPhonesService: RegisterPhonesService
  ) {}

  @Get()
  findAll(@CurrentUser() user: { userId: string }, @Query('search') search?: string) {
    return this.registerPhonesService.findAll(user.userId, search);
  }

  @Post()
  create(@CurrentUser() user: { userId: string }, @Body() payload: CreateRegisterPhoneDto) {
    return this.registerPhonesService.create(user.userId, payload);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: { userId: string },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() payload: UpdateRegisterPhoneDto
  ) {
    return this.registerPhonesService.update(user.userId, id, payload);
  }

  @Delete(':id')
  remove(@CurrentUser() user: { userId: string }, @Param('id', ParseUUIDPipe) id: string) {
    return this.registerPhonesService.remove(user.userId, id);
  }
}
