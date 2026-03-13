import { Module, forwardRef } from '@nestjs/common';
import { PaymentWebhookController } from './payment.controller';
import { PaymentWebhookService } from './payment.webhook.service';
import { OrderModule } from '../order/order.module';
import { PaymentService } from './payment.service';
import { PaymentUserController } from './payment.user.controller';

@Module({
  imports: [forwardRef(() => OrderModule)],
  controllers: [PaymentWebhookController, PaymentUserController],
  providers: [PaymentWebhookService, PaymentService],
  exports: [PaymentService]
})
export class PaymentModule {}
