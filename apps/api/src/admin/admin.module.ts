import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';

import { OrderModule } from '../order/order.module';
import { WalletModule } from '../wallet/wallet.module';
import { NoticeModule } from '../notice/notice.module';
import { PaymentModule } from '../payment/payment.module';
import { RiskModule } from '../risk/risk.module';
import { BargainModule } from '../bargain/bargain.module';

import { ProductAuditController } from './product-audit.controller';
import { AdminRefundController } from './refund.controller';
import { AdminDisputeController } from './dispute.controller';
import { AdminUserReviewController } from './user-review.controller';
import { AdminWithdrawController } from './withdraw.controller';
import { AdminNoticeController } from './notice.controller';
import { AdminUserManagementController } from './user-management.controller';
import { AdminDashboardController } from './dashboard.controller';
import { AdminPaymentController } from './payment.controller';
import { AdminLogService } from './admin-log.service';
import { AdminLogController } from './admin-log.controller';
import { AdminLogInterceptor } from './admin-log.interceptor';
import { AdminPaymentReconcileController } from './payment-reconcile.controller';
import { AdminRiskController } from './risk.controller';
import { AdminBargainController } from './bargain.controller';
import { AdminSecurityController } from './security.controller';
import { AdminFinanceController } from './finance.controller';

@Module({
  imports: [OrderModule, WalletModule, NoticeModule, PaymentModule, RiskModule, BargainModule],
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
    AdminRiskController,
    AdminBargainController,
    AdminFinanceController,
    AdminSecurityController,
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
