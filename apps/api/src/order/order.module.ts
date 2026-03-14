import { Module, forwardRef } from '@nestjs/common';
import { OrderService } from './order.service';
import { OrderController } from './order.controller';
import { WalletModule } from '../wallet/wallet.module';
import { AdminSettlementController } from './admin-settlement.controller';
import { RefundController } from './refund.controller';
import { DisputeController } from './dispute.controller';
import { PaymentModule } from '../payment/payment.module';
import { AdminOrderController } from './admin-order.controller';

@Module({
  imports: [WalletModule, forwardRef(() => PaymentModule)],
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
