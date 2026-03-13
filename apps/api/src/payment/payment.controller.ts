import { Body, Controller, Param, Post } from '@nestjs/common';
import { PaymentWebhookService } from './payment.webhook.service';
import { PaymentService } from './payment.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PayOrderDto } from '../order/dto/pay-order.dto';

@Controller('webhook/payment')
export class PaymentController {
  constructor(
    private readonly webhookService: PaymentWebhookService,
    private readonly paymentService: PaymentService
  ) {}

  @Post(':channel')
  async handle(
    @Param('channel') channel: string,
    @Body() payload: Record<string, unknown>
  ) {
    return this.webhookService.handle(channel, payload);
  }

  // 买家发起支付（非余额渠道）占位
  @Post('/initiate/:orderId')
  @UseGuards(JwtAuthGuard)
  initiate(
    @CurrentUser() user: { userId: string },
    @Param('orderId') orderId: string,
    @Body() dto: PayOrderDto
  ) {
    return this.paymentService.initiatePayment(orderId, user.userId, dto);
  }
}
