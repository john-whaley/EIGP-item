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
import { CreatePlatformDto } from './dto/create-platform.dto';
import { UpdatePlatformDto } from './dto/update-platform.dto';
import { PlatformsService } from './platforms.service';

@Controller('platforms')
@UseGuards(JwtAuthGuard)
export class PlatformsController {
  constructor(@Inject(PlatformsService) private readonly platformsService: PlatformsService) {}

  @Get()
  findAll(@CurrentUser() user: { userId: string }, @Query('search') search?: string) {
    return this.platformsService.findAll(user.userId, search);
  }

  @Post()
  create(@CurrentUser() user: { userId: string }, @Body() payload: CreatePlatformDto) {
    return this.platformsService.create(user.userId, payload);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: { userId: string },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() payload: UpdatePlatformDto
  ) {
    return this.platformsService.update(user.userId, id, payload);
  }

  @Delete(':id')
  remove(@CurrentUser() user: { userId: string }, @Param('id', ParseUUIDPipe) id: string) {
    return this.platformsService.remove(user.userId, id);
  }
}
