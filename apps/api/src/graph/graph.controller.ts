import { Controller, Get, Inject, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { GraphService } from './graph.service';

@Controller('graph')
@UseGuards(JwtAuthGuard)
export class GraphController {
  constructor(@Inject(GraphService) private readonly graphService: GraphService) {}

  @Get()
  findGraph(@CurrentUser() user: { userId: string }) {
    return this.graphService.getGraph(user.userId);
  }
}
