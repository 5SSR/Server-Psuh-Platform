import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
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
import { PaymentModule } from '../payment/payment.module';
import { AdminPaymentController } from './payment.controller';
import { AdminLogService } from './admin-log.service';
import { AdminLogController } from './admin-log.controller';
import { AdminLogInterceptor } from './admin-log.interceptor';
import { AdminPaymentReconcileController } from './payment-reconcile.controller';

@Module({
  imports: [OrderModule, WalletModule, NoticeModule, PaymentModule],
  controllers: [
    ProductAuditController,
    AdminRefundController,
    AdminDisputeController,
    AdminUserReviewController,
    AdminUserManagementController,
    AdminDashboardController,
    AdminWithdrawController,
    AdminNoticeController,
    AdminPaymentController,
    AdminPaymentReconcileController,
    AdminLogController
  ],
  providers: [
    AdminLogService,
    {
      provide: APP_INTERCEPTOR,
      useClass: AdminLogInterceptor
    }
  ],
  exports: [AdminLogService]
})
export class AdminModule {}
