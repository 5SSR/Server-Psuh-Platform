import { Body, Controller, Param, Post } from '@nestjs/common';

import { PaymentWebhookService } from './payment.webhook.service';
import { PaymentWebhookDto } from './dto/webhook.dto';

@Controller('webhook/payment')
export class PaymentWebhookController {
  constructor(private readonly webhookService: PaymentWebhookService) {}

  @Post(':channel')
  async handle(
    @Param('channel') channel: string,
    @Body() payload: PaymentWebhookDto
  ) {
    return this.webhookService.handle(channel, payload);
  }
}
