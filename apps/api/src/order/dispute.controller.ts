import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { OrderService } from './order.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { DisputeDto } from './dto/dispute.dto';
import { DisputeEvidenceDto } from './dto/dispute-evidence.dto';

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class DisputeController {
  constructor(private readonly orderService: OrderService) {}

  @Post(':id/dispute')
  open(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
    @Body() dto: DisputeDto
  ) {
    return this.orderService.openDispute(id, user.userId, dto);
  }

  @Post(':id/dispute/evidence')
  addEvidence(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
    @Body() dto: DisputeEvidenceDto
  ) {
    return this.orderService.addDisputeEvidence(id, user.userId, dto);
  }

  @Get(':id/dispute')
  getDispute(@Param('id') id: string) {
    return this.orderService.getDispute(id);
  }
}
