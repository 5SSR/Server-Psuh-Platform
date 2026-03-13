import { Module } from '@nestjs/common';
import { OrderService } from './order.service';
import { OrderController } from './order.controller';
import { WalletModule } from '../wallet/wallet.module';
import { AdminSettlementController } from './admin-settlement.controller';
import { RefundController } from './refund.controller';
import { DisputeController } from './dispute.controller';

@Module({
  imports: [WalletModule],
  controllers: [OrderController, AdminSettlementController, RefundController, DisputeController],
  providers: [OrderService]
})
export class OrderModule {}
