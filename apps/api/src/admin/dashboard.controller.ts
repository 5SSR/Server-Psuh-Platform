import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  BargainStatus,
  DisputeStatus,
  OrderStatus,
  Prisma,
  ProductStatus,
  SettlementStatus,
  UserStatus
} from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { DashboardQueryDto } from '../common/dto/dashboard-query.dto';

@Controller('admin/dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminDashboardController {
  constructor(private readonly prisma: PrismaService) {}

  private toNumber(value: Prisma.Decimal | null | undefined) {
    return Number(value ?? 0);
  }

  @Get('overview')
  async overview(@Query() query: DashboardQueryDto) {
    const days = query.days ?? 30;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      activeUsers,
      bannedUsers,
      regularUsers,
      newUsersInRange,
      productDraftCount,
      productPendingCount,
      productOnlineCount,
      productOfflineCount,
      newProductsInRange,
      orderPendingPaymentCount,
      orderPaidWaitingDeliveryCount,
      orderVerifyingCount,
      orderBuyerCheckingCount,
      orderCompletedPendingSettlementCount,
      orderCompletedCount,
      orderRefundingCount,
      orderDisputingCount,
      orderCanceledCount,
      newOrdersInRange,
      paidOrderAmountInRange,
      settlementPendingAgg,
      settlementReleasedAgg,
      withdrawalPendingAgg,
      refundPendingCount,
      disputeOpenCount,
      kycPendingCount,
      sellerAppPendingCount,
      failedLogin24h,
      bargainTotalCount,
      bargainWaitSellerCount,
      bargainWaitBuyerCount,
      bargainAcceptedCount,
      bargainRejectedCount,
      bargainCanceledCount,
      bargainWithOrderCount,
      bargainRoundHighCount,
      recentOrders
    ] = await this.prisma.$transaction([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { status: UserStatus.ACTIVE } }),
      this.prisma.user.count({ where: { status: UserStatus.BANNED } }),
      this.prisma.user.count({
        where: { role: { in: ['BUYER', 'SELLER'] } }
      }),
      this.prisma.user.count({
        where: {
          createdAt: { gte: since }
        }
      }),
      this.prisma.product.count({ where: { status: ProductStatus.DRAFT } }),
      this.prisma.product.count({ where: { status: ProductStatus.PENDING } }),
      this.prisma.product.count({ where: { status: ProductStatus.ONLINE } }),
      this.prisma.product.count({ where: { status: ProductStatus.OFFLINE } }),
      this.prisma.product.count({
        where: {
          createdAt: { gte: since }
        }
      }),
      this.prisma.order.count({ where: { status: OrderStatus.PENDING_PAYMENT } }),
      this.prisma.order.count({ where: { status: OrderStatus.PAID_WAITING_DELIVERY } }),
      this.prisma.order.count({ where: { status: OrderStatus.VERIFYING } }),
      this.prisma.order.count({ where: { status: OrderStatus.BUYER_CHECKING } }),
      this.prisma.order.count({ where: { status: OrderStatus.COMPLETED_PENDING_SETTLEMENT } }),
      this.prisma.order.count({ where: { status: OrderStatus.COMPLETED } }),
      this.prisma.order.count({ where: { status: OrderStatus.REFUNDING } }),
      this.prisma.order.count({ where: { status: OrderStatus.DISPUTING } }),
      this.prisma.order.count({ where: { status: OrderStatus.CANCELED } }),
      this.prisma.order.count({
        where: {
          createdAt: { gte: since }
        }
      }),
      this.prisma.order.aggregate({
        _sum: { price: true },
        where: {
          payStatus: 'PAID',
          createdAt: { gte: since }
        }
      }),
      this.prisma.settlement.aggregate({
        _sum: { amount: true, fee: true },
        where: { status: SettlementStatus.PENDING }
      }),
      this.prisma.settlement.aggregate({
        _sum: { amount: true, fee: true },
        where: { status: SettlementStatus.RELEASED }
      }),
      this.prisma.withdrawal.aggregate({
        _sum: { amount: true, fee: true },
        where: {
          status: { in: ['pending', 'approved'] }
        }
      }),
      this.prisma.refund.count({ where: { status: 'PENDING' } }),
      this.prisma.dispute.count({
        where: {
          status: {
            in: [DisputeStatus.OPEN, DisputeStatus.PROCESSING]
          }
        }
      }),
      this.prisma.userKyc.count({ where: { status: 'pending' } }),
      this.prisma.sellerApplication.count({ where: { status: 'PENDING' } }),
      this.prisma.userLoginLog.count({
        where: {
          success: false,
          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
        }
      }),
      this.prisma.bargain.count(),
      this.prisma.bargain.count({ where: { status: BargainStatus.WAIT_SELLER } }),
      this.prisma.bargain.count({ where: { status: BargainStatus.WAIT_BUYER } }),
      this.prisma.bargain.count({ where: { status: BargainStatus.ACCEPTED } }),
      this.prisma.bargain.count({ where: { status: BargainStatus.REJECTED } }),
      this.prisma.bargain.count({ where: { status: BargainStatus.CANCELED } }),
      this.prisma.bargain.count({
        where: {
          orderId: { not: null }
        }
      }),
      this.prisma.bargain.count({
        where: {
          round: { gte: 6 },
          status: {
            in: [BargainStatus.WAIT_BUYER, BargainStatus.WAIT_SELLER]
          }
        }
      }),
      this.prisma.order.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          product: {
            select: { id: true, title: true, code: true }
          },
          buyer: {
            select: { id: true, email: true }
          },
          seller: {
            select: { id: true, email: true }
          }
        }
      })
    ]);

    const productStatusMap: Record<string, number> = {
      [ProductStatus.DRAFT]: productDraftCount,
      [ProductStatus.PENDING]: productPendingCount,
      [ProductStatus.ONLINE]: productOnlineCount,
      [ProductStatus.OFFLINE]: productOfflineCount
    };

    const orderStatusMap: Record<string, number> = {
      [OrderStatus.PENDING_PAYMENT]: orderPendingPaymentCount,
      [OrderStatus.PAID_WAITING_DELIVERY]: orderPaidWaitingDeliveryCount,
      [OrderStatus.VERIFYING]: orderVerifyingCount,
      [OrderStatus.BUYER_CHECKING]: orderBuyerCheckingCount,
      [OrderStatus.COMPLETED_PENDING_SETTLEMENT]: orderCompletedPendingSettlementCount,
      [OrderStatus.COMPLETED]: orderCompletedCount,
      [OrderStatus.REFUNDING]: orderRefundingCount,
      [OrderStatus.DISPUTING]: orderDisputingCount,
      [OrderStatus.CANCELED]: orderCanceledCount
    };

    return {
      range: { days, since: since.toISOString() },
      users: {
        total: totalUsers,
        active: activeUsers,
        banned: bannedUsers,
        regular: regularUsers,
        newInRange: newUsersInRange
      },
      products: {
        byStatus: productStatusMap,
        newInRange: newProductsInRange
      },
      orders: {
        byStatus: orderStatusMap,
        newInRange: newOrdersInRange,
        paidAmountInRange: this.toNumber(paidOrderAmountInRange._sum.price)
      },
      bargains: {
        total: bargainTotalCount,
        byStatus: {
          [BargainStatus.WAIT_SELLER]: bargainWaitSellerCount,
          [BargainStatus.WAIT_BUYER]: bargainWaitBuyerCount,
          [BargainStatus.ACCEPTED]: bargainAcceptedCount,
          [BargainStatus.REJECTED]: bargainRejectedCount,
          [BargainStatus.CANCELED]: bargainCanceledCount
        },
        withOrder: bargainWithOrderCount,
        highRoundActive: bargainRoundHighCount
      },
      finance: {
        settlementPendingAmount: this.toNumber(settlementPendingAgg._sum.amount),
        settlementPendingFee: this.toNumber(settlementPendingAgg._sum.fee),
        settlementReleasedAmount: this.toNumber(settlementReleasedAgg._sum.amount),
        settlementReleasedFee: this.toNumber(settlementReleasedAgg._sum.fee),
        withdrawalPendingAmount: this.toNumber(withdrawalPendingAgg._sum.amount),
        withdrawalPendingFee: this.toNumber(withdrawalPendingAgg._sum.fee)
      },
      risk: {
        refundPendingCount,
        disputeOpenCount,
        kycPendingCount,
        qualificationPendingCount: sellerAppPendingCount,
        sellerAppPendingCount,
        failedLogin24h
      },
      recentOrders
    };
  }
}
