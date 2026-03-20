import { Module, forwardRef } from '@nestjs/common';

import { WalletModule } from '../wallet/wallet.module';
import { PaymentModule } from '../payment/payment.module';
import { NoticeModule } from '../notice/notice.module';
import { RiskModule } from '../risk/risk.module';

import { OrderService } from './order.service';
import { OrderController } from './order.controller';
import { AdminSettlementController } from './admin-settlement.controller';
import { RefundController } from './refund.controller';
import { DisputeController } from './dispute.controller';
import { AdminOrderController } from './admin-order.controller';


@Module({
  imports: [WalletModule, NoticeModule, RiskModule, forwardRef(() => PaymentModule)],
  controllers: [
    OrderController,
    AdminSettlementController,
    RefundController,
    DisputeController,
    AdminOrderController
  ],
  providers: [OrderService],
  exports: [OrderService]
})
export class OrderModule {}
