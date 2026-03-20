import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import {
  DisputeStatus,
  PayStatus,
  Prisma,
  RefundStatus,
  SettlementStatus
} from '@prisma/client';
import type { Response } from 'express';

import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

import { FinanceOverviewQueryDto } from './dto/finance-overview-query.dto';
import { FinanceExportQueryDto } from './dto/finance-export-query.dto';

type FinanceEvent = {
  type: 'SETTLEMENT' | 'WITHDRAWAL' | 'REFUND';
  id: string;
  orderId?: string;
  amount: number;
  fee: number;
  netAmount: number;
  status: string;
  userId?: string;
  userEmail?: string;
  channel?: string;
  createdAt: string;
};

@Controller('admin/finance')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminFinanceController {
  constructor(private readonly prisma: PrismaService) {}

  private toNumber(value: Prisma.Decimal | null | undefined) {
    return Number(value ?? 0);
  }

  private parseDateInput(value?: string) {
    if (!value?.trim()) return null;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed;
  }

  private toCsv(rows: Array<Array<string | number | null | undefined>>) {
    return rows
      .map((row) =>
        row
          .map((cell) => {
            const value = this.sanitizeCsvCell(
              cell === null || cell === undefined ? '' : String(cell)
            );
            return `"${value.replace(/"/g, '""')}"`;
          })
          .join(',')
      )
      .join('\n');
  }

  private sanitizeCsvCell(value: string) {
    if (!value) return '';
    const first = value[0];
    if (first === '=' || first === '+' || first === '-' || first === '@') {
      return `'${value}`;
    }
    return value;
  }

  @Get('overview')
  async overview(@Query() query: FinanceOverviewQueryDto) {
    const days = query.days ?? 30;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [
      orderPaidAgg,
      settlementPendingAgg,
      settlementReleasedAgg,
      settlementPendingCount,
      settlementReleasedCount,
      settlementRejectedCount,
      withdrawalPendingCount,
      withdrawalApprovedCount,
      withdrawalPaidCount,
      withdrawalRejectedCount,
      withdrawalPendingAgg,
      withdrawalPaidAgg,
      refundPendingCount,
      refundApprovedCount,
      refundRejectedCount,
      refundApprovedAgg,
      paymentChannelStatusAgg,
      disputeOpenCount,
      settlementRecent,
      withdrawalRecent,
      refundRecent
    ] = await this.prisma.$transaction([
      this.prisma.order.aggregate({
        where: {
          payStatus: PayStatus.PAID,
          createdAt: { gte: since }
        },
        _sum: {
          price: true,
          fee: true
        },
        _count: {
          _all: true
        }
      }),
      this.prisma.settlement.aggregate({
        where: {
          status: SettlementStatus.PENDING,
          createdAt: { gte: since }
        },
        _sum: {
          amount: true,
          fee: true
        },
        _count: {
          _all: true
        }
      }),
      this.prisma.settlement.aggregate({
        where: {
          status: SettlementStatus.RELEASED,
          createdAt: { gte: since }
        },
        _sum: {
          amount: true,
          fee: true
        },
        _count: {
          _all: true
        }
      }),
      this.prisma.settlement.count({
        where: { status: SettlementStatus.PENDING, createdAt: { gte: since } }
      }),
      this.prisma.settlement.count({
        where: { status: SettlementStatus.RELEASED, createdAt: { gte: since } }
      }),
      this.prisma.settlement.count({
        where: { status: SettlementStatus.REJECTED, createdAt: { gte: since } }
      }),
      this.prisma.withdrawal.count({
        where: { status: 'pending', createdAt: { gte: since } }
      }),
      this.prisma.withdrawal.count({
        where: { status: 'approved', createdAt: { gte: since } }
      }),
      this.prisma.withdrawal.count({
        where: { status: 'paid', createdAt: { gte: since } }
      }),
      this.prisma.withdrawal.count({
        where: { status: 'rejected', createdAt: { gte: since } }
      }),
      this.prisma.withdrawal.aggregate({
        where: {
          status: { in: ['pending', 'approved'] },
          createdAt: { gte: since }
        },
        _sum: {
          amount: true,
          fee: true
        }
      }),
      this.prisma.withdrawal.aggregate({
        where: {
          status: 'paid',
          createdAt: { gte: since }
        },
        _sum: {
          amount: true,
          fee: true
        }
      }),
      this.prisma.refund.count({
        where: { status: RefundStatus.PENDING, createdAt: { gte: since } }
      }),
      this.prisma.refund.count({
        where: { status: RefundStatus.APPROVED, createdAt: { gte: since } }
      }),
      this.prisma.refund.count({
        where: { status: RefundStatus.REJECTED, createdAt: { gte: since } }
      }),
      this.prisma.refund.aggregate({
        where: {
          status: RefundStatus.APPROVED,
          createdAt: { gte: since }
        },
        _sum: {
          amount: true
        },
        _count: {
          _all: true
        }
      }),
      this.prisma.payment.groupBy({
        by: ['channel', 'payStatus'],
        where: {
          createdAt: { gte: since }
        },
        _sum: {
          amount: true,
          paidAmount: true
        },
        _count: {
          id: true
        },
        orderBy: [{ channel: 'asc' }, { payStatus: 'asc' }]
      }),
      this.prisma.dispute.count({
        where: {
          status: {
            in: [DisputeStatus.OPEN, DisputeStatus.PROCESSING]
          }
        }
      }),
      this.prisma.settlement.findMany({
        where: { createdAt: { gte: since } },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: {
          id: true,
          orderId: true,
          sellerId: true,
          amount: true,
          fee: true,
          status: true,
          createdAt: true
        }
      }),
      this.prisma.withdrawal.findMany({
        where: { createdAt: { gte: since } },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: {
          id: true,
          wallet: {
            select: {
              userId: true,
              user: {
                select: {
                  email: true
                }
              }
            }
          },
          amount: true,
          fee: true,
          channel: true,
          status: true,
          createdAt: true
        }
      }),
      this.prisma.refund.findMany({
        where: { createdAt: { gte: since } },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: {
          id: true,
          orderId: true,
          applicantId: true,
          amount: true,
          status: true,
          createdAt: true,
          order: {
            select: {
              buyer: {
                select: {
                  email: true
                }
              }
            }
          }
        }
      })
    ]);

    const paymentChannelMap = new Map<
      string,
      {
        channel: string;
        totalCount: number;
        totalAmount: number;
        paidCount: number;
        paidAmount: number;
        unpaidCount: number;
        unpaidAmount: number;
        refundedCount: number;
        refundedAmount: number;
        failedCount: number;
        failedAmount: number;
      }
    >();

    for (const item of paymentChannelStatusAgg) {
      const key = item.channel;
      const current = paymentChannelMap.get(key) || {
        channel: key,
        totalCount: 0,
        totalAmount: 0,
        paidCount: 0,
        paidAmount: 0,
        unpaidCount: 0,
        unpaidAmount: 0,
        refundedCount: 0,
        refundedAmount: 0,
        failedCount: 0,
        failedAmount: 0
      };
      const amount =
        item.payStatus === PayStatus.PAID
          ? this.toNumber(item._sum?.paidAmount ?? item._sum?.amount)
          : this.toNumber(item._sum?.amount);
      const count =
        typeof item._count === 'object' && item._count
          ? Number((item._count as { id?: number; _all?: number }).id ?? 0)
          : 0;
      current.totalCount += count;
      current.totalAmount += amount;
      if (item.payStatus === PayStatus.PAID) {
        current.paidCount += count;
        current.paidAmount += amount;
      } else if (item.payStatus === PayStatus.UNPAID) {
        current.unpaidCount += count;
        current.unpaidAmount += amount;
      } else if (item.payStatus === PayStatus.REFUNDED) {
        current.refundedCount += count;
        current.refundedAmount += amount;
      } else if (item.payStatus === PayStatus.FAILED) {
        current.failedCount += count;
        current.failedAmount += amount;
      }
      paymentChannelMap.set(key, current);
    }

    const events: FinanceEvent[] = [
      ...settlementRecent.map((item) => ({
        type: 'SETTLEMENT' as const,
        id: item.id,
        orderId: item.orderId,
        amount: this.toNumber(item.amount),
        fee: this.toNumber(item.fee),
        netAmount: this.toNumber(item.amount) - this.toNumber(item.fee),
        status: item.status,
        userId: item.sellerId,
        createdAt: item.createdAt.toISOString()
      })),
      ...withdrawalRecent.map((item) => ({
        type: 'WITHDRAWAL' as const,
        id: item.id,
        amount: this.toNumber(item.amount),
        fee: this.toNumber(item.fee),
        netAmount: this.toNumber(item.amount) - this.toNumber(item.fee),
        status: item.status,
        userId: item.wallet.userId,
        userEmail: item.wallet.user.email,
        channel: item.channel,
        createdAt: item.createdAt.toISOString()
      })),
      ...refundRecent.map((item) => ({
        type: 'REFUND' as const,
        id: item.id,
        orderId: item.orderId,
        amount: this.toNumber(item.amount),
        fee: 0,
        netAmount: this.toNumber(item.amount),
        status: item.status,
        userId: item.applicantId,
        userEmail: item.order.buyer.email,
        createdAt: item.createdAt.toISOString()
      }))
    ]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 30);

    const settlementPendingAmount = this.toNumber(settlementPendingAgg._sum.amount);
    const settlementPendingFee = this.toNumber(settlementPendingAgg._sum.fee);
    const settlementReleasedAmount = this.toNumber(settlementReleasedAgg._sum.amount);
    const settlementReleasedFee = this.toNumber(settlementReleasedAgg._sum.fee);
    const withdrawalPendingAmount = this.toNumber(withdrawalPendingAgg._sum.amount);
    const withdrawalPendingFee = this.toNumber(withdrawalPendingAgg._sum.fee);
    const withdrawalPaidAmount = this.toNumber(withdrawalPaidAgg._sum.amount);
    const withdrawalPaidFee = this.toNumber(withdrawalPaidAgg._sum.fee);
    const paidOrderAmount = this.toNumber(orderPaidAgg._sum.price);
    const orderFeeAmount = this.toNumber(orderPaidAgg._sum.fee);
    const refundApprovedAmount = this.toNumber(refundApprovedAgg._sum.amount);

    return {
      range: {
        days,
        since: since.toISOString()
      },
      summary: {
        paidOrderCount: orderPaidAgg._count._all,
        paidOrderAmount,
        orderFeeAmount,
        refundApprovedCount: refundApprovedAgg._count._all,
        refundApprovedAmount,
        platformGrossIncomeEstimate: orderFeeAmount,
        platformNetIncomeEstimate: orderFeeAmount - refundApprovedAmount,
        disputeOpenCount
      },
      settlements: {
        counts: {
          PENDING: settlementPendingCount,
          RELEASED: settlementReleasedCount,
          REJECTED: settlementRejectedCount
        },
        pendingAmount: settlementPendingAmount,
        pendingFee: settlementPendingFee,
        releasedAmount: settlementReleasedAmount,
        releasedFee: settlementReleasedFee
      },
      withdrawals: {
        counts: {
          pending: withdrawalPendingCount,
          approved: withdrawalApprovedCount,
          paid: withdrawalPaidCount,
          rejected: withdrawalRejectedCount
        },
        pendingAmount: withdrawalPendingAmount,
        pendingFee: withdrawalPendingFee,
        paidAmount: withdrawalPaidAmount,
        paidFee: withdrawalPaidFee
      },
      refunds: {
        counts: {
          PENDING: refundPendingCount,
          APPROVED: refundApprovedCount,
          REJECTED: refundRejectedCount
        },
        approvedAmount: refundApprovedAmount
      },
      paymentChannels: Array.from(paymentChannelMap.values()).sort((a, b) =>
        a.channel.localeCompare(b.channel)
      ),
      events
    };
  }

  @Get('export')
  async exportFinance(
    @Query() query: FinanceExportQueryDto,
    @Res({ passthrough: true }) res: Response
  ) {
    const type = query.type;
    const from = this.parseDateInput(query.from);
    const to = this.parseDateInput(query.to);
    const createdAt =
      from || to
        ? {
            ...(from ? { gte: from } : {}),
            ...(to ? { lte: to } : {})
          }
        : undefined;

    let rows: string[][] = [];
    let headers: string[] = [];

    if (type === 'orders') {
      const list = await this.prisma.order.findMany({
        where: {
          ...(createdAt ? { createdAt } : {}),
          ...(query.status ? { status: query.status as any } : {}),
          ...(query.channel ? { payChannel: query.channel as any } : {})
        },
        include: {
          product: {
            select: { code: true, title: true }
          },
          buyer: {
            select: { email: true }
          },
          seller: {
            select: { email: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 5000
      });
      headers = [
        '订单号',
        '商品编号',
        '商品标题',
        '买家',
        '卖家',
        '订单状态',
        '支付状态',
        '支付渠道',
        '订单金额',
        '手续费',
        '托管金额',
        '创建时间'
      ];
      rows = list.map((item) => [
        item.id,
        item.product.code,
        item.product.title,
        item.buyer.email,
        item.seller.email,
        item.status,
        item.payStatus,
        item.payChannel,
        this.toNumber(item.price).toFixed(2),
        this.toNumber(item.fee).toFixed(2),
        this.toNumber(item.escrowAmount).toFixed(2),
        item.createdAt.toISOString()
      ]);
    } else if (type === 'settlements') {
      const list = await this.prisma.settlement.findMany({
        where: {
          ...(createdAt ? { createdAt } : {}),
          ...(query.status ? { status: query.status as any } : {})
        },
        include: {
          order: {
            select: { id: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 5000
      });
      headers = ['结算ID', '订单号', '卖家ID', '状态', '金额', '手续费', '放款时间', '创建时间'];
      rows = list.map((item) => [
        item.id,
        item.order?.id || item.orderId,
        item.sellerId,
        item.status,
        this.toNumber(item.amount).toFixed(2),
        this.toNumber(item.fee).toFixed(2),
        item.releasedAt?.toISOString() || '',
        item.createdAt.toISOString()
      ]);
    } else if (type === 'refunds') {
      const list = await this.prisma.refund.findMany({
        where: {
          ...(createdAt ? { createdAt } : {}),
          ...(query.status ? { status: query.status as any } : {}),
          ...(query.channel
            ? {
                order: {
                  payChannel: query.channel as any
                }
              }
            : {})
        },
        include: {
          order: {
            select: {
              payChannel: true,
              buyer: { select: { email: true } },
              seller: { select: { email: true } }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 5000
      });
      headers = [
        '退款ID',
        '订单号',
        '申请人ID',
        '买家',
        '卖家',
        '退款状态',
        '支付渠道',
        '退款金额',
        '退款原因',
        '创建时间'
      ];
      rows = list.map((item) => [
        item.id,
        item.orderId,
        item.applicantId,
        item.order.buyer.email,
        item.order.seller.email,
        item.status,
        item.order.payChannel,
        this.toNumber(item.amount).toFixed(2),
        item.reason,
        item.createdAt.toISOString()
      ]);
    } else {
      const list = await this.prisma.withdrawal.findMany({
        where: {
          ...(createdAt ? { createdAt } : {}),
          ...(query.status ? { status: query.status } : {}),
          ...(query.channel ? { channel: query.channel } : {})
        },
        include: {
          wallet: {
            select: {
              userId: true,
              user: { select: { email: true } }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 5000
      });
      headers = [
        '提现ID',
        '用户ID',
        '用户邮箱',
        '状态',
        '渠道',
        '提现金额',
        '手续费',
        '到账金额',
        '申请时间',
        '处理时间'
      ];
      rows = list.map((item) => {
        const amount = this.toNumber(item.amount);
        const fee = this.toNumber(item.fee);
        return [
          item.id,
          item.wallet.userId,
          item.wallet.user.email,
          item.status,
          item.channel,
          amount.toFixed(2),
          fee.toFixed(2),
          (amount - fee).toFixed(2),
          item.createdAt.toISOString(),
          item.processedAt?.toISOString() || ''
        ];
      });
    }

    const csv = `\uFEFF${this.toCsv([headers, ...rows])}`;
    const fromLabel = from ? query.from?.slice(0, 10) : 'all';
    const toLabel = to ? query.to?.slice(0, 10) : 'now';
    const filename = `finance-${type}-${fromLabel}-${toLabel}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(filename)}"`
    );
    return csv;
  }
}
