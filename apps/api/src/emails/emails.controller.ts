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
import { CreateEmailDto } from './dto/create-email.dto';
import { QueryEmailsDto } from './dto/query-emails.dto';
import { UpdateEmailDto } from './dto/update-email.dto';
import { EmailsService } from './emails.service';

@Controller('emails')
@UseGuards(JwtAuthGuard)
export class EmailsController {
  constructor(@Inject(EmailsService) private readonly emailsService: EmailsService) {}

  @Get()
  findAll(@CurrentUser() user: { userId: string }, @Query() query: QueryEmailsDto) {
    return this.emailsService.findAll(user.userId, query);
  }

  @Get(':id')
  findOne(@CurrentUser() user: { userId: string }, @Param('id', ParseUUIDPipe) id: string) {
    return this.emailsService.findOne(user.userId, id);
  }

  @Post()
  create(@CurrentUser() user: { userId: string }, @Body() payload: CreateEmailDto) {
    return this.emailsService.create(user.userId, payload);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: { userId: string },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() payload: UpdateEmailDto
  ) {
    return this.emailsService.update(user.userId, id, payload);
  }

  @Delete(':id')
  remove(@CurrentUser() user: { userId: string }, @Param('id', ParseUUIDPipe) id: string) {
    return this.emailsService.remove(user.userId, id);
  }
}
