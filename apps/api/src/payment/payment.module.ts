import { Module, forwardRef } from '@nestjs/common';
import { PaymentWebhookController } from './payment.controller';
import { PaymentWebhookService } from './payment.webhook.service';
import { OrderModule } from '../order/order.module';
import { PaymentService } from './payment.service';
import { PaymentUserController } from './payment.user.controller';
import { ReconciliationService } from './reconciliation.service';
import { AlipayGateway } from './gateways/alipay.gateway';
import { WechatGateway } from './gateways/wechat.gateway';
import { RiskModule } from '../risk/risk.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [forwardRef(() => OrderModule), RiskModule, PrismaModule],
  controllers: [PaymentWebhookController, PaymentUserController],
  providers: [
    PaymentWebhookService,
    PaymentService,
    ReconciliationService,
    AlipayGateway,
    WechatGateway
  ],
  exports: [PaymentService, ReconciliationService]
})
export class PaymentModule {}
