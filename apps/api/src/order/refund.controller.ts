import { Body, Controller, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { OrderService } from './order.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RefundDto } from './dto/refund.dto';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@Controller()
export class RefundController {
  constructor(private readonly orderService: OrderService) {}

  @Post('orders/:id/refund')
  @UseGuards(JwtAuthGuard)
  apply(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
    @Body() dto: RefundDto
  ) {
    return this.orderService.applyRefund(id, user.userId, dto);
  }

  @Patch('admin/orders/:id/refund')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  adminDecision(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
    @Body('decision') decision: 'APPROVED' | 'REJECTED',
    @Body('remark') remark?: string
  ) {
    return this.orderService.handleRefund(id, user.userId, decision, remark);
  }
}
