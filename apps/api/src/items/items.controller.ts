import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards
} from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CreateItemDto } from './dto/create-item.dto';
import { QueryItemsDto } from './dto/query-items.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { ItemsService } from './items.service';

@Controller('items')
@UseGuards(JwtAuthGuard)
export class ItemsController {
  constructor(@Inject(ItemsService) private readonly itemsService: ItemsService) {}

  @Post()
  create(@CurrentUser() user: { userId: number }, @Body() payload: CreateItemDto) {
    return this.itemsService.create(user.userId, payload);
  }

  @Get()
  findAll(@CurrentUser() user: { userId: number }, @Query() query: QueryItemsDto) {
    return this.itemsService.findAll(user.userId, query);
  }

  @Get(':id')
  findOne(@CurrentUser() user: { userId: number }, @Param('id', ParseIntPipe) id: number) {
    return this.itemsService.findOne(user.userId, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: { userId: number },
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: UpdateItemDto
  ) {
    return this.itemsService.update(user.userId, id, payload);
  }

  @Delete(':id')
  remove(@CurrentUser() user: { userId: number }, @Param('id', ParseIntPipe) id: number) {
    return this.itemsService.remove(user.userId, id);
  }
}
