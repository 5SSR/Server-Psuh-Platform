import { Module } from '@nestjs/common';
import { ProductAuditController } from './product-audit.controller';
import { AdminRefundController } from './refund.controller';
import { AdminDisputeController } from './dispute.controller';
import { OrderModule } from '../order/order.module';

@Module({
  imports: [OrderModule],
  controllers: [ProductAuditController, AdminRefundController, AdminDisputeController]
})
export class AdminModule {}
