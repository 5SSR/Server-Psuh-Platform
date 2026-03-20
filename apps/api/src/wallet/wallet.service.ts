import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException
} from '@nestjs/common';
import { Prisma, RiskScene, WalletLedgerType } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { RiskService } from '../risk/risk.service';
import { NoticeService } from '../notice/notice.service';

import { ApplyWithdrawDto } from './dto/apply-withdraw.dto';
import { QueryWithdrawDto } from './dto/query-withdraw.dto';
import { ReviewWithdrawDto } from './dto/review-withdraw.dto';
import { QuerySettlementDto } from './dto/query-settlement.dto';


@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly riskService: RiskService,
    private readonly noticeService: NoticeService
  ) {}

  private async sendSystemNotice(input: {
    userId: string;
    type: string;
    payload?: Record<string, unknown>;
    title?: string;
    content?: string;
  }) {
    try {
      await this.noticeService.createSystemNotice(input);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      this.logger.warn(`发送通知失败 type=${input.type} userId=${input.userId}: ${reason}`);
    }
  }

  private presentRole(role: string) {
    return role === 'ADMIN' ? 'ADMIN' : 'USER';
  }

  private clampRatio(value: number) {
    if (!Number.isFinite(value)) return 0;
    if (value < 0) return 0;
    if (value > 1) return 1;
    return Number(value.toFixed(4));
  }

  private calcLevelByTradeCount(tradeCount: number) {
    if (tradeCount >= 100) return 5;
    if (tradeCount >= 50) return 4;
    if (tradeCount >= 20) return 3;
    if (tradeCount >= 5) return 2;
    return 1;
  }

  private async ensureWallet(userId: string) {
    return this.prisma.wallet.upsert({
      where: { userId },
      update: {},
      create: { userId, balance: new Prisma.Decimal(0), frozen: new Prisma.Decimal(0) }
    });
  }

  async getSummary(userId: string) {
    const wallet = await this.ensureWallet(userId);
    return wallet;
  }

  async getLedger(userId: string, page = 1, pageSize = 20) {
    const wallet = await this.ensureWallet(userId);
    const [total, list] = await this.prisma.$transaction([
      this.prisma.walletLedger.count({ where: { walletId: wallet.id } }),
      this.prisma.walletLedger.findMany({
        where: { walletId: wallet.id },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize
      })
    ]);
    return { total, list, page, pageSize };
  }

  get withdrawMinAmount() {
    return this.readPositiveNumber('WITHDRAW_MIN_AMOUNT', 100);
  }

  get withdrawFeeRate() {
    return this.readPositiveNumber('WITHDRAW_FEE_RATE', 0.006);
  }

  get withdrawMinFee() {
    return this.readPositiveNumber('WITHDRAW_MIN_FEE', 1);
  }

  private readPositiveNumber(name: string, fallback: number) {
    const value = Number(process.env[name]);
    return Number.isFinite(value) && value >= 0 ? value : fallback;
  }

  private calcWithdrawFee(amount: Prisma.Decimal) {
    const byRate = new Prisma.Decimal(amount.mul(this.withdrawFeeRate).toFixed(2));
    const minFee = new Prisma.Decimal(this.withdrawMinFee);
    let fee = byRate.lt(minFee) ? minFee : byRate;
    if (fee.gt(amount)) fee = amount;
    return fee;
  }

  async applyWithdrawal(userId: string, dto: ApplyWithdrawDto) {
    const amount = new Prisma.Decimal(dto.amount);
    const minAmount = new Prisma.Decimal(this.withdrawMinAmount);
    if (amount.lt(minAmount)) {
      throw new BadRequestException(`单笔提现最低 ¥${minAmount.toFixed(2)}`);
    }

    const fee = this.calcWithdrawFee(amount);
    const netAmount = amount.minus(fee);
    if (netAmount.lte(0)) {
      throw new BadRequestException('提现金额过小，扣除手续费后到账金额需大于 0');
    }

    const risk = await this.riskService.evaluate(RiskScene.WITHDRAW, {
      userId,
      amount: Number(amount)
    });
    if (risk.action === 'BLOCK') {
      throw new ForbiddenException('提现申请触发风控拦截');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { id: true, role: true, status: true }
      });
      if (!user) throw new NotFoundException('用户不存在');
      if (user.status !== 'ACTIVE') {
        throw new ForbiddenException('当前账号状态不可提现');
      }

      const wallet = await tx.wallet.upsert({
        where: { userId },
        update: {},
        create: { userId, balance: new Prisma.Decimal(0), frozen: new Prisma.Decimal(0) }
      });
      if (wallet.balance.lt(amount)) {
        throw new BadRequestException('可用余额不足，无法发起提现');
      }

      const withdrawal = await tx.withdrawal.create({
        data: {
          walletId: wallet.id,
          amount,
          fee,
          channel: dto.channel,
          accountInfo: dto.accountInfo,
          status: 'pending'
        }
      });

      await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          balance: { decrement: amount },
          frozen: { increment: amount }
        }
      });

      await tx.walletLedger.create({
        data: {
          walletId: wallet.id,
          type: WalletLedgerType.WITHDRAW,
          amount,
          refType: 'withdrawal',
          refId: withdrawal.id,
          memo: `提现申请，冻结资金（预计到账 ¥${netAmount.toFixed(2)}）`
        }
      });

      return {
        message: '提现申请已提交，等待管理员审核',
        withdrawal: {
          ...withdrawal,
          netAmount: netAmount.toFixed(2)
        }
      };
    });

    await this.sendSystemNotice({
      userId,
      type: 'WITHDRAW_APPLY',
      payload: {
        withdrawalId: result.withdrawal.id,
        amount: amount.toFixed(2),
        fee: fee.toFixed(2),
        netAmount: netAmount.toFixed(2),
        at: new Date().toISOString()
      }
    });

    return result;
  }

  async listWithdrawals(userId: string, query: QueryWithdrawDto) {
    const wallet = await this.ensureWallet(userId);
    const { page = 1, pageSize = 20, status } = query;
    const where = {
      walletId: wallet.id,
      ...(status ? { status } : {})
    };
    const [total, list] = await this.prisma.$transaction([
      this.prisma.withdrawal.count({ where }),
      this.prisma.withdrawal.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize
      })
    ]);
    return { total, list, page, pageSize };
  }

  async listWithdrawalsForAdmin(query: QueryWithdrawDto) {
    const { page = 1, pageSize = 20, status } = query;
    const where = status ? { status } : undefined;
    const [total, list] = await this.prisma.$transaction([
      this.prisma.withdrawal.count({ where }),
      this.prisma.withdrawal.findMany({
        where,
        include: {
          wallet: {
            select: {
              id: true,
              userId: true,
              user: { select: { id: true, email: true, role: true } }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize
      })
    ]);
    return {
      total,
      list: list.map((item) => ({
        ...item,
        wallet: item.wallet
          ? {
              ...item.wallet,
              user: item.wallet.user
                ? {
                    ...item.wallet.user,
                    role: this.presentRole(item.wallet.user.role)
                  }
                : item.wallet.user
            }
          : item.wallet
      })),
      page,
      pageSize
    };
  }

  async listSettlementsForAdmin(query: QuerySettlementDto) {
    const { page = 1, pageSize = 20, status, sellerId, orderId } = query;
    const where = {
      ...(status ? { status } : {}),
      ...(sellerId ? { sellerId } : {}),
      ...(orderId ? { orderId } : {})
    };

    const [total, list] = await this.prisma.$transaction([
      this.prisma.settlement.count({ where }),
      this.prisma.settlement.findMany({
        where,
        include: {
          order: {
            select: {
              id: true,
              status: true,
              price: true,
              createdAt: true,
              product: {
                select: {
                  id: true,
                  title: true,
                  code: true
                }
              },
              buyer: {
                select: { id: true, email: true }
              },
              seller: {
                select: { id: true, email: true }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize
      })
    ]);

    return { total, list, page, pageSize };
  }

  async listSettlementsForSeller(sellerId: string, query: QuerySettlementDto) {
    const { page = 1, pageSize = 20, status, orderId } = query;
    const where = {
      sellerId,
      ...(status ? { status } : {}),
      ...(orderId ? { orderId } : {})
    };

    const [total, list, stats] = await this.prisma.$transaction([
      this.prisma.settlement.count({ where }),
      this.prisma.settlement.findMany({
        where,
        include: {
          order: {
            select: {
              id: true,
              status: true,
              price: true,
              createdAt: true,
              product: {
                select: {
                  id: true,
                  title: true,
                  code: true
                }
              },
              buyer: {
                select: { id: true, email: true }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize
      }),
      this.prisma.settlement.aggregate({
        where: { sellerId },
        _sum: {
          amount: true,
          fee: true
        },
        _count: { _all: true }
      })
    ]);

    return {
      total,
      list,
      page,
      pageSize,
      stats: {
        totalCount: stats._count._all,
        totalAmount: stats._sum.amount ?? new Prisma.Decimal(0),
        totalFee: stats._sum.fee ?? new Prisma.Decimal(0)
      }
    };
  }

  async refreshSellerProfileMetrics(
    sellerId: string,
    txClient?: Prisma.TransactionClient
  ) {
    const executor = txClient ?? this.prisma;

    const [
      releasedTradeCount,
      disputeCount,
      refundApprovedCount,
      deliveredOrders,
      reviewTotalCount,
      reviewPositiveCount
    ] = await Promise.all([
      executor.settlement.count({
        where: {
          sellerId,
          status: 'RELEASED'
        }
      }),
      executor.dispute.count({
        where: {
          order: { sellerId }
        }
      }),
      executor.refund.count({
        where: {
          status: 'APPROVED',
          order: { sellerId }
        }
      }),
      executor.order.findMany({
        where: {
          sellerId,
          settlement: { status: 'RELEASED' }
        },
        select: {
          id: true,
          payment: {
            select: { paidAt: true }
          },
          deliveryRecords: {
            orderBy: { createdAt: 'asc' },
            take: 1,
            select: { createdAt: true }
          }
        }
      }),
      executor.orderReview.count({
        where: { sellerId }
      }),
      executor.orderReview.count({
        where: {
          sellerId,
          rating: { gte: 4 }
        }
      })
    ]);

    const deliveryMinutesList = deliveredOrders
      .map((item) => {
        const paidAt = item.payment?.paidAt;
        const deliveredAt = item.deliveryRecords[0]?.createdAt;
        if (!paidAt || !deliveredAt) return null;
        const diff = Math.floor((deliveredAt.getTime() - paidAt.getTime()) / 60000);
        return diff >= 0 ? diff : null;
      })
      .filter((item): item is number => item !== null);

    const avgDeliveryMinutes =
      deliveryMinutesList.length === 0
        ? 0
        : Math.round(
            deliveryMinutesList.reduce((sum, item) => sum + item, 0) /
              deliveryMinutesList.length
          );

    const disputeRate =
      releasedTradeCount === 0
        ? 0
        : this.clampRatio(disputeCount / releasedTradeCount);
    const refundRate =
      releasedTradeCount === 0
        ? 0
        : this.clampRatio(refundApprovedCount / releasedTradeCount);
    const positiveRate =
      reviewTotalCount > 0
        ? this.clampRatio(reviewPositiveCount / reviewTotalCount)
        : this.clampRatio(1 - Math.max(disputeRate, refundRate));
    const level = this.calcLevelByTradeCount(releasedTradeCount);

    const profile = await executor.sellerProfile.upsert({
      where: { userId: sellerId },
      update: {
        level,
        tradeCount: releasedTradeCount,
        disputeRate,
        refundRate,
        avgDeliveryMinutes,
        positiveRate
      },
      create: {
        userId: sellerId,
        level,
        tradeCount: releasedTradeCount,
        disputeRate,
        refundRate,
        avgDeliveryMinutes,
        positiveRate
      }
    });

    return profile;
  }

  async reviewWithdrawal(withdrawalId: string, adminId: string, dto: ReviewWithdrawDto) {
    const result = await this.prisma.$transaction(async (tx) => {
      const withdrawal = await tx.withdrawal.findUnique({
        where: { id: withdrawalId },
        include: {
          wallet: {
            select: { id: true, userId: true, balance: true, frozen: true }
          }
        }
      });
      if (!withdrawal) throw new NotFoundException('提现记录不存在');

      const remark = dto.remark?.trim();

      if (dto.action === 'APPROVED') {
        if (withdrawal.status !== 'pending') {
          throw new BadRequestException('仅待审核状态可通过');
        }

        const updated = await tx.withdrawal.update({
          where: { id: withdrawal.id },
          data: { status: 'approved' }
        });

        return {
          message: '提现审核已通过，等待打款',
          withdrawal: updated,
          notice: {
            userId: withdrawal.wallet.userId,
            type: 'WITHDRAW_APPROVED',
            payload: {
              withdrawalId: withdrawal.id,
              adminId,
              remark,
              at: new Date().toISOString()
            }
          }
        };
      }

      if (dto.action === 'REJECTED') {
        if (!['pending', 'approved'].includes(withdrawal.status)) {
          throw new BadRequestException('当前状态不可驳回');
        }
        if (withdrawal.wallet.frozen.lt(withdrawal.amount)) {
          throw new BadRequestException('冻结金额异常，无法驳回');
        }

        const updated = await tx.withdrawal.update({
          where: { id: withdrawal.id },
          data: {
            status: 'rejected',
            processedAt: new Date()
          }
        });

        await tx.wallet.update({
          where: { id: withdrawal.wallet.id },
          data: {
            frozen: { decrement: withdrawal.amount },
            balance: { increment: withdrawal.amount }
          }
        });

        await tx.walletLedger.create({
          data: {
            walletId: withdrawal.wallet.id,
            type: WalletLedgerType.ADJUST,
            amount: withdrawal.amount,
            refType: 'withdrawal',
            refId: withdrawal.id,
            memo: `提现驳回，资金退回（管理员 ${adminId}${remark ? `: ${remark}` : ''}）`
          }
        });

        return {
          message: '提现已驳回，资金已退回可用余额',
          withdrawal: updated,
          notice: {
            userId: withdrawal.wallet.userId,
            type: 'WITHDRAW_REJECTED',
            payload: {
              withdrawalId: withdrawal.id,
              adminId,
              remark,
              at: new Date().toISOString()
            }
          }
        };
      }

      if (withdrawal.status !== 'approved') {
        throw new BadRequestException('仅已通过的提现可标记为打款完成');
      }
      if (withdrawal.wallet.frozen.lt(withdrawal.amount)) {
        throw new BadRequestException('冻结金额异常，无法完成打款');
      }

      const netAmount = withdrawal.amount.minus(withdrawal.fee);
      const updated = await tx.withdrawal.update({
        where: { id: withdrawal.id },
        data: {
          status: 'paid',
          processedAt: new Date()
        }
      });

      await tx.wallet.update({
        where: { id: withdrawal.wallet.id },
        data: {
          frozen: { decrement: withdrawal.amount }
        }
      });

      await tx.walletLedger.create({
        data: {
          walletId: withdrawal.wallet.id,
          type: WalletLedgerType.WITHDRAW,
          amount: netAmount,
          refType: 'withdrawal',
          refId: withdrawal.id,
          memo: `提现打款成功（管理员 ${adminId}${remark ? `: ${remark}` : ''}）`
        }
      });

      if (withdrawal.fee.gt(0)) {
        await tx.walletLedger.create({
          data: {
            walletId: withdrawal.wallet.id,
            type: WalletLedgerType.FEE,
            amount: withdrawal.fee,
            refType: 'withdrawal',
            refId: withdrawal.id,
            memo: '提现手续费'
          }
        });
      }

      return {
        message: '提现打款完成',
        withdrawal: updated,
        notice: {
          userId: withdrawal.wallet.userId,
          type: 'WITHDRAW_PAID',
          payload: {
            withdrawalId: withdrawal.id,
            amount: withdrawal.amount.toFixed(2),
            fee: withdrawal.fee.toFixed(2),
            netAmount: netAmount.toFixed(2),
            at: new Date().toISOString()
          }
        }
      };
    });

    await this.sendSystemNotice(result.notice);
    return {
      message: result.message,
      withdrawal: result.withdrawal
    };
  }

  // 开发期充值接口（仅测试）
  async recharge(userId: string, amount: number) {
    return this.prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.upsert({
        where: { userId },
        update: {},
        create: { userId, balance: new Prisma.Decimal(0), frozen: new Prisma.Decimal(0) }
      });

      await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: { increment: amount } }
      });

      await tx.walletLedger.create({
        data: {
          walletId: wallet.id,
          type: WalletLedgerType.PAY,
          amount: new Prisma.Decimal(amount),
          memo: '测试充值'
        }
      });

      return tx.wallet.findUnique({ where: { id: wallet.id } });
    });
  }

  async freezeEscrow(buyerId: string, amount: Prisma.Decimal, orderId: string) {
    return this.prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.upsert({
        where: { userId: buyerId },
        update: {},
        create: { userId: buyerId, balance: new Prisma.Decimal(0), frozen: new Prisma.Decimal(0) }
      });

      if (wallet.balance.lt(amount)) {
        throw new BadRequestException('余额不足，无法支付');
      }

      await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          balance: { decrement: amount },
          frozen: { increment: amount }
        }
      });

      await tx.walletLedger.create({
        data: {
          walletId: wallet.id,
          type: WalletLedgerType.ESCROW_FREEZE,
          amount,
          refType: 'order',
          refId: orderId,
          memo: '订单托管冻结'
        }
      });
    });
  }

  async releaseSettlement(orderId: string) {
    return this.prisma.$transaction(async (tx) => {
      const settlement = await tx.settlement.findUnique({
        where: { orderId }
      });
      if (!settlement) {
        throw new Error('结算记录不存在');
      }
      if (settlement.status !== 'PENDING') {
        throw new Error('结算状态不可放款');
      }
      const order = await tx.order.findUnique({ where: { id: orderId } });
      if (!order) throw new Error('订单不存在');
      const escrowAmount = order.escrowAmount ?? order.price;
      const isBalanceEscrow = order.payChannel === 'BALANCE';

      let buyerWallet:
        | {
            id: string;
            userId: string;
            balance: Prisma.Decimal;
            frozen: Prisma.Decimal;
          }
        | null = null;
      if (isBalanceEscrow) {
        buyerWallet = await tx.wallet.upsert({
          where: { userId: order.buyerId },
          update: {},
          create: { userId: order.buyerId, balance: new Prisma.Decimal(0), frozen: new Prisma.Decimal(0) }
        });
        if (buyerWallet.frozen.lt(escrowAmount)) {
          throw new BadRequestException('买家托管余额不足，无法放款');
        }
      }

      const wallet = await tx.wallet.upsert({
        where: { userId: settlement.sellerId },
        update: {},
        create: { userId: settlement.sellerId, balance: new Prisma.Decimal(0), frozen: new Prisma.Decimal(0) }
      });

      if (buyerWallet) {
        // 余额支付订单：解冻全额托管（含服务费承担部分）
        await tx.wallet.update({
          where: { id: buyerWallet.id },
          data: {
            frozen: { decrement: escrowAmount }
          }
        });
        await tx.walletLedger.create({
          data: {
            walletId: buyerWallet.id,
            type: WalletLedgerType.ESCROW_RELEASE,
            amount: escrowAmount.neg(),
            refType: 'order',
            refId: orderId,
            memo: '托管解冻'
          }
        });
      }

      // 放款给卖家
      await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          balance: { increment: settlement.amount }
        }
      });

      await tx.walletLedger.create({
        data: {
          walletId: wallet.id,
          type: WalletLedgerType.ESCROW_RELEASE,
          amount: settlement.amount,
          refType: 'order',
          refId: orderId,
          memo: '订单放款'
        }
      });

      await tx.settlement.update({
        where: { orderId },
        data: { status: 'RELEASED', releasedAt: new Date() }
      });

      await tx.order.update({
        where: { id: orderId },
        data: { status: 'COMPLETED' }
      });

      await tx.orderLog.create({
        data: {
          orderId,
          action: 'SETTLEMENT_RELEASE',
          actorType: 'SYSTEM',
          remark: '平台放款'
        }
      });

      await this.refreshSellerProfileMetrics(settlement.sellerId, tx);

      return { orderId, released: true };
    });
  }

  async refundToBuyer(
    orderId: string,
    options?: {
      memoOverride?: string;
      memoForNonBalance?: string;
    }
  ) {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id: orderId } });
      if (!order) throw new Error('订单不存在');
      const refundAmount = order.escrowAmount ?? order.price;
      const isBalanceEscrow = order.payChannel === 'BALANCE';

      const buyerWallet = await tx.wallet.upsert({
        where: { userId: order.buyerId },
        update: {},
        create: { userId: order.buyerId, balance: new Prisma.Decimal(0), frozen: new Prisma.Decimal(0) }
      });

      if (isBalanceEscrow) {
        if (buyerWallet.frozen.lt(refundAmount)) {
          throw new BadRequestException('买家托管余额不足，无法退款');
        }
        await tx.wallet.update({
          where: { id: buyerWallet.id },
          data: {
            frozen: { decrement: refundAmount },
            balance: { increment: refundAmount }
          }
        });
      } else {
        // 非余额支付：开发期先退回站内余额，后续可扩展原路退回通道
        await tx.wallet.update({
          where: { id: buyerWallet.id },
          data: {
            balance: { increment: refundAmount }
          }
        });
      }

      await tx.walletLedger.create({
        data: {
          walletId: buyerWallet.id,
          type: WalletLedgerType.REFUND,
          amount: refundAmount,
          refType: 'order',
          refId: orderId,
          memo:
            options?.memoOverride ||
            (isBalanceEscrow
              ? '退款入账（托管退回）'
              : options?.memoForNonBalance || '退款入账（非余额支付退回余额）')
        }
      });
    });
  }
}
