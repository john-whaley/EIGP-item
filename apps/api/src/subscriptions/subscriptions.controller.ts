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
  UseGuards
} from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';
import { SubscriptionsService } from './subscriptions.service';

@Controller('subscriptions')
@UseGuards(JwtAuthGuard)
export class SubscriptionsController {
  constructor(@Inject(SubscriptionsService) private readonly subscriptionsService: SubscriptionsService) {}

  @Get()
  findAll(@CurrentUser() user: { userId: number }) {
    return this.subscriptionsService.findAll(user.userId);
  }

  @Post()
  create(@CurrentUser() user: { userId: number }, @Body() payload: CreateSubscriptionDto) {
    return this.subscriptionsService.create(user.userId, payload);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: { userId: number },
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: UpdateSubscriptionDto
  ) {
    return this.subscriptionsService.update(user.userId, id, payload);
  }

  @Delete(':id')
  remove(@CurrentUser() user: { userId: number }, @Param('id', ParseIntPipe) id: number) {
    return this.subscriptionsService.remove(user.userId, id);
  }
}
