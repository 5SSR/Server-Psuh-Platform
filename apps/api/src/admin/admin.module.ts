import { Module } from '@nestjs/common';
import { ProductAuditController } from './product-audit.controller';
import { AdminRefundController } from './refund.controller';
import { AdminDisputeController } from './dispute.controller';

@Module({
  controllers: [ProductAuditController, AdminRefundController, AdminDisputeController]
})
export class AdminModule {}
