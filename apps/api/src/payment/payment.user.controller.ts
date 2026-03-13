import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PayOrderDto } from '../order/dto/pay-order.dto';
import { PaymentService } from './payment.service';

@Controller('payments')
@UseGuards(JwtAuthGuard)
export class PaymentUserController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post(':orderId/initiate')
  initiate(
    @CurrentUser() user: { userId: string },
    @Param('orderId') orderId: string,
    @Body() dto: PayOrderDto
  ) {
    return this.paymentService.initiatePayment(orderId, user.userId, dto);
  }

  @Get(':orderId')
  status(
    @CurrentUser() user: { userId: string },
    @Param('orderId') orderId: string
  ) {
    return this.paymentService.getPaymentStatus(orderId, user.userId);
  }

  // 本地联调：模拟支付成功
  @Post(':orderId/mock-success')
  mockSuccess(
    @CurrentUser() user: { userId: string },
    @Param('orderId') orderId: string
  ) {
    return this.paymentService.simulateSuccess(orderId, user.userId);
  }
}
