import { Controller, Get, Param, Patch, Query, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { OrderService } from './order.service';
import { VerifyDto } from './dto/verify.dto';
import { AdminOrderQueryDto } from './dto/admin-order-query.dto';

@Controller('admin/orders')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminOrderController {
  constructor(private readonly orderService: OrderService) {}

  @Get()
  list(@Query() query: AdminOrderQueryDto) {
    return this.orderService.listForAdmin(query);
  }

  @Patch(':id/verify')
  verify(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
    @Body() dto: VerifyDto
  ) {
    return this.orderService.verify(id, user.userId, dto);
  }
}
