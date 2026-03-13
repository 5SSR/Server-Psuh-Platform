import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { OrderService } from '../order/order.service';

@Controller('admin/refunds')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminRefundController {
  constructor(private readonly orderService: OrderService) {}

  @Get()
  @Roles('ADMIN')
  list(@Query('status') status?: string) {
    return this.orderService.listRefunds(status);
  }
}
