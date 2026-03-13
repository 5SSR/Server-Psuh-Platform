import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, WalletLedgerType } from '@prisma/client';

@Injectable()
export class WalletService {
  constructor(private readonly prisma: PrismaService) {}

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
      const buyerWallet = await tx.wallet.upsert({
        where: { userId: order.buyerId },
        update: {},
        create: { userId: order.buyerId, balance: new Prisma.Decimal(0), frozen: new Prisma.Decimal(0) }
      });

      const wallet = await tx.wallet.upsert({
        where: { userId: settlement.sellerId },
        update: {},
        create: { userId: settlement.sellerId, balance: new Prisma.Decimal(0), frozen: new Prisma.Decimal(0) }
      });

      // 解冻买家托管
      await tx.wallet.update({
        where: { id: buyerWallet.id },
        data: {
          frozen: { decrement: settlement.amount }
        }
      });
      await tx.walletLedger.create({
        data: {
          walletId: buyerWallet.id,
          type: WalletLedgerType.ESCROW_RELEASE,
          amount: settlement.amount.neg(),
          refType: 'order',
          refId: orderId,
          memo: '托管解冻'
        }
      });

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

      return { orderId, released: true };
    });
  }

  async refundToBuyer(orderId: string) {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id: orderId } });
      if (!order) throw new Error('订单不存在');

      const buyerWallet = await tx.wallet.upsert({
        where: { userId: order.buyerId },
        update: {},
        create: { userId: order.buyerId, balance: new Prisma.Decimal(0), frozen: new Prisma.Decimal(0) }
      });

      await tx.wallet.update({
        where: { id: buyerWallet.id },
        data: {
          frozen: { decrement: order.price },
          balance: { increment: order.price }
        }
      });

      await tx.walletLedger.create({
        data: {
          walletId: buyerWallet.id,
          type: WalletLedgerType.REFUND,
          amount: order.price,
          refType: 'order',
          refId: orderId,
          memo: '退款入账'
        }
      });
    });
  }
}
