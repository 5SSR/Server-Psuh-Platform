import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  OrderStatus,
  Prisma,
  ProductStatus,
  SettlementStatus
} from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { DashboardQueryDto } from '../common/dto/dashboard-query.dto';

@Controller('seller/dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('USER')
export class SellerDashboardController {
  constructor(private readonly prisma: PrismaService) {}

  private toNumber(value: Prisma.Decimal | null | undefined) {
    return Number(value ?? 0);
  }

  @Get('overview')
  async overview(
    @CurrentUser() user: { userId: string },
    @Query() query: DashboardQueryDto
  ) {
    const days = query.days ?? 30;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const sellerId = user.userId;
    const wallet = await this.prisma.wallet.findUnique({
      where: { userId: sellerId },
      select: { id: true, balance: true, frozen: true, currency: true, updatedAt: true }
    });
    const sellerProfile = await this.prisma.sellerProfile.findUnique({
      where: { userId: sellerId },
      select: {
        level: true,
        tradeCount: true,
        disputeRate: true,
        avgDeliveryMinutes: true,
        positiveRate: true
      }
    });

    const [
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
      withdrawalApprovedAgg,
      withdrawalPaidAgg,
      withdrawalRejectedAgg,
      recentOrders,
      recentSettlements
    ] = await this.prisma.$transaction([
      this.prisma.product.count({ where: { sellerId, status: ProductStatus.DRAFT } }),
      this.prisma.product.count({ where: { sellerId, status: ProductStatus.PENDING } }),
      this.prisma.product.count({ where: { sellerId, status: ProductStatus.ONLINE } }),
      this.prisma.product.count({ where: { sellerId, status: ProductStatus.OFFLINE } }),
      this.prisma.product.count({
        where: {
          sellerId,
          createdAt: { gte: since }
        }
      }),
      this.prisma.order.count({ where: { sellerId, status: OrderStatus.PENDING_PAYMENT } }),
      this.prisma.order.count({ where: { sellerId, status: OrderStatus.PAID_WAITING_DELIVERY } }),
      this.prisma.order.count({ where: { sellerId, status: OrderStatus.VERIFYING } }),
      this.prisma.order.count({ where: { sellerId, status: OrderStatus.BUYER_CHECKING } }),
      this.prisma.order.count({
        where: { sellerId, status: OrderStatus.COMPLETED_PENDING_SETTLEMENT }
      }),
      this.prisma.order.count({ where: { sellerId, status: OrderStatus.COMPLETED } }),
      this.prisma.order.count({ where: { sellerId, status: OrderStatus.REFUNDING } }),
      this.prisma.order.count({ where: { sellerId, status: OrderStatus.DISPUTING } }),
      this.prisma.order.count({ where: { sellerId, status: OrderStatus.CANCELED } }),
      this.prisma.order.count({
        where: {
          sellerId,
          createdAt: { gte: since }
        }
      }),
      this.prisma.order.aggregate({
        _sum: { price: true },
        where: {
          sellerId,
          payStatus: 'PAID',
          createdAt: { gte: since }
        }
      }),
      this.prisma.settlement.aggregate({
        _sum: { amount: true, fee: true },
        _count: { _all: true },
        where: {
          sellerId,
          status: SettlementStatus.PENDING
        }
      }),
      this.prisma.settlement.aggregate({
        _sum: { amount: true, fee: true },
        _count: { _all: true },
        where: {
          sellerId,
          status: SettlementStatus.RELEASED
        }
      }),
      this.prisma.withdrawal.aggregate({
        _count: { _all: true },
        _sum: { amount: true, fee: true },
        where: {
          walletId: wallet?.id || '__no_wallet__',
          status: 'pending'
        }
      }),
      this.prisma.withdrawal.aggregate({
        _count: { _all: true },
        _sum: { amount: true, fee: true },
        where: {
          walletId: wallet?.id || '__no_wallet__',
          status: 'approved'
        }
      }),
      this.prisma.withdrawal.aggregate({
        _count: { _all: true },
        _sum: { amount: true, fee: true },
        where: {
          walletId: wallet?.id || '__no_wallet__',
          status: 'paid'
        }
      }),
      this.prisma.withdrawal.aggregate({
        _count: { _all: true },
        _sum: { amount: true, fee: true },
        where: {
          walletId: wallet?.id || '__no_wallet__',
          status: 'rejected'
        }
      }),
      this.prisma.order.findMany({
        where: { sellerId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          product: {
            select: { id: true, title: true, code: true }
          },
          buyer: {
            select: { id: true, email: true }
          }
        }
      }),
      this.prisma.settlement.findMany({
        where: { sellerId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          order: {
            select: {
              id: true,
              status: true,
              product: {
                select: { id: true, title: true, code: true }
              }
            }
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

    const withdrawalMap: Record<string, { count: number; amount: number; fee: number }> = {
      pending: {
        count: withdrawalPendingAgg._count._all,
        amount: this.toNumber(withdrawalPendingAgg._sum.amount),
        fee: this.toNumber(withdrawalPendingAgg._sum.fee)
      },
      approved: {
        count: withdrawalApprovedAgg._count._all,
        amount: this.toNumber(withdrawalApprovedAgg._sum.amount),
        fee: this.toNumber(withdrawalApprovedAgg._sum.fee)
      },
      paid: {
        count: withdrawalPaidAgg._count._all,
        amount: this.toNumber(withdrawalPaidAgg._sum.amount),
        fee: this.toNumber(withdrawalPaidAgg._sum.fee)
      },
      rejected: {
        count: withdrawalRejectedAgg._count._all,
        amount: this.toNumber(withdrawalRejectedAgg._sum.amount),
        fee: this.toNumber(withdrawalRejectedAgg._sum.fee)
      }
    };

    return {
      range: { days, since: since.toISOString() },
      products: {
        byStatus: productStatusMap,
        newInRange: newProductsInRange
      },
      orders: {
        byStatus: orderStatusMap,
        newInRange: newOrdersInRange,
        paidAmountInRange: this.toNumber(paidOrderAmountInRange._sum.price)
      },
      settlements: {
        pendingCount: settlementPendingAgg._count._all,
        pendingAmount: this.toNumber(settlementPendingAgg._sum.amount),
        pendingFee: this.toNumber(settlementPendingAgg._sum.fee),
        releasedCount: settlementReleasedAgg._count._all,
        releasedAmount: this.toNumber(settlementReleasedAgg._sum.amount),
        releasedFee: this.toNumber(settlementReleasedAgg._sum.fee)
      },
      sellerProfile,
      wallet: {
        balance: this.toNumber(wallet?.balance),
        frozen: this.toNumber(wallet?.frozen),
        currency: wallet?.currency ?? 'CNY',
        updatedAt: wallet?.updatedAt
      },
      withdrawals: withdrawalMap,
      recentOrders,
      recentSettlements
    };
  }
}
