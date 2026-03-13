import { Module } from '@nestjs/common';
import { PaymentController } from './payment.controller';
import { PaymentWebhookService } from './payment.webhook.service';
import { OrderModule } from '../order/order.module';
import { PaymentService } from './payment.service';

@Module({
  imports: [OrderModule],
  controllers: [PaymentController],
  providers: [PaymentWebhookService, PaymentService]
})
export class PaymentModule {}
