import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { OrderService } from '../order/order.service';
import { DisputeDecisionDto } from './dto/dispute-decision.dto';

@Controller('admin/disputes')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminDisputeController {
  constructor(private readonly orderService: OrderService) {}

  @Get()
  @Roles('ADMIN')
  list(@Query('status') status?: string) {
    return this.orderService.listDisputes(status);
  }

  @Patch(':id/decision')
  @Roles('ADMIN')
  decide(
    @Param('id') id: string,
    @Body() dto: DisputeDecisionDto,
  ) {
    return this.orderService.resolveDispute(
      id,
      dto.status,
      dto.action,
      dto.result,
      dto.resolution
    );
  }
}
