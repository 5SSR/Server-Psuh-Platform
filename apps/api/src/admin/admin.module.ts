import { Module } from '@nestjs/common';
import { ProductAuditController } from './product-audit.controller';
import { AdminRefundController } from './refund.controller';
import { AdminDisputeController } from './dispute.controller';
import { OrderModule } from '../order/order.module';
import { AdminUserReviewController } from './user-review.controller';
import { WalletModule } from '../wallet/wallet.module';
import { AdminWithdrawController } from './withdraw.controller';
import { NoticeModule } from '../notice/notice.module';
import { AdminNoticeController } from './notice.controller';
import { AdminUserManagementController } from './user-management.controller';
import { AdminDashboardController } from './dashboard.controller';

@Module({
  imports: [OrderModule, WalletModule, NoticeModule],
  controllers: [
    ProductAuditController,
    AdminRefundController,
    AdminDisputeController,
    AdminUserReviewController,
    AdminUserManagementController,
    AdminDashboardController,
    AdminWithdrawController,
    AdminNoticeController
  ]
})
export class AdminModule {}
