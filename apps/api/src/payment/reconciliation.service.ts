import { Injectable } from '@nestjs/common';
import {
  PayChannel,
  Prisma,
  ReconcileDiffType,
  ReconcileItemStatus,
  ReconcileTaskStatus
} from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

import { AlipayGateway } from './gateways/alipay.gateway';
import { WechatGateway } from './gateways/wechat.gateway';
import { UsdtGateway } from './gateways/usdt.gateway';
import { PaymentGateway } from './gateways/payment-gateway.interface';

@Injectable()
export class ReconciliationService {
  private readonly gateways: PaymentGateway[];

  constructor(
    private readonly prisma: PrismaService,
    alipayGateway: AlipayGateway,
    wechatGateway: WechatGateway,
    usdtGateway: UsdtGateway
  ) {
    this.gateways = [alipayGateway, wechatGateway, usdtGateway];
  }

  async run(channel: PayChannel, bizDate?: string) {
    const date = this.normalizeDate(bizDate);
    const dayStart = new Date(`${date}T00:00:00.000Z`);
    const dayEnd = new Date(`${date}T23:59:59.999Z`);

    const task = await this.prisma.reconcileTask.upsert({
      where: { channel_bizDate: { channel, bizDate: dayStart } },
      create: {
        channel,
        bizDate: dayStart,
        status: ReconcileTaskStatus.PENDING
      },
      update: {}
    });

    await this.prisma.reconcileTask.update({
      where: { id: task.id },
      data: {
        status: ReconcileTaskStatus.RUNNING,
        startedAt: new Date(),
        error: null
      }
    });

    try {
      const local = await this.prisma.payment.findMany({
        where: {
          channel,
          payStatus: 'PAID',
          paidAt: { gte: dayStart, lte: dayEnd }
        },
        select: {
          orderId: true,
          tradeNo: true,
          thirdTradeNo: true,
          amount: true,
          paidAmount: true,
          payStatus: true
        }
      });

      const gateway = this.gateways.find((item) => item.channel === channel);
      const remote = gateway ? await gateway.fetchTransactions(date) : [];

      const diffs = this.diffRecords(local, remote);

      await this.prisma.$transaction(async (tx) => {
        await tx.reconcileItem.deleteMany({ where: { taskId: task.id } });

        if (diffs.length > 0) {
          await tx.reconcileItem.createMany({
            data: diffs.map((item) => ({
              taskId: task.id,
              orderId: item.orderId,
              tradeNo: item.tradeNo,
              thirdTradeNo: item.thirdTradeNo,
              diffType: item.diffType,
              status: ReconcileItemStatus.OPEN,
              localAmount: item.localAmount,
              remoteAmount: item.remoteAmount,
              localStatus: item.localStatus,
              remoteStatus: item.remoteStatus,
              note: item.note
            }))
          });
        }

        await tx.reconcileTask.update({
          where: { id: task.id },
          data: {
            status: ReconcileTaskStatus.COMPLETED,
            finishedAt: new Date(),
            summary: {
              localCount: local.length,
              remoteCount: remote.length,
              diffCount: diffs.length
            } as any
          }
        });
      });

      return { taskId: task.id, localCount: local.length, remoteCount: remote.length, diffCount: diffs.length };
    } catch (error: any) {
      await this.prisma.reconcileTask.update({
        where: { id: task.id },
        data: {
          status: ReconcileTaskStatus.FAILED,
          finishedAt: new Date(),
          error: error?.message || 'unknown error'
        }
      });
      throw error;
    }
  }

  async listTasks(query: { page?: number; pageSize?: number; channel?: PayChannel; status?: ReconcileTaskStatus }) {
    const { page = 1, pageSize = 20, channel, status } = query;
    const where: Prisma.ReconcileTaskWhereInput = {
      ...(channel ? { channel } : {}),
      ...(status ? { status } : {})
    };

    const [total, list] = await this.prisma.$transaction([
      this.prisma.reconcileTask.count({ where }),
      this.prisma.reconcileTask.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize
      })
    ]);

    return { total, list, page, pageSize };
  }

  async listItems(taskId: string, query: { page?: number; pageSize?: number; status?: ReconcileItemStatus }) {
    const { page = 1, pageSize = 20, status } = query;
    const where: Prisma.ReconcileItemWhereInput = {
      taskId,
      ...(status ? { status } : {})
    };
    const [total, list] = await this.prisma.$transaction([
      this.prisma.reconcileItem.count({ where }),
      this.prisma.reconcileItem.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize
      })
    ]);
    return { total, list, page, pageSize };
  }

  async resolveItem(itemId: string, input: { status: ReconcileItemStatus; note?: string }) {
    return this.prisma.reconcileItem.update({
      where: { id: itemId },
      data: {
        status: input.status,
        ...(typeof input.note !== 'undefined' ? { note: input.note } : {})
      }
    });
  }

  private normalizeDate(input?: string) {
    if (!input) return new Date().toISOString().slice(0, 10);
    return input;
  }

  private diffRecords(local: Array<any>, remote: Array<any>) {
    const localMap = new Map<string, any>();
    const remoteMap = new Map<string, any>();

    for (const item of local) {
      const key = item.thirdTradeNo || item.tradeNo || item.orderId;
      if (key) localMap.set(key, item);
    }
    for (const item of remote) {
      const key = item.thirdTradeNo || item.tradeNo || item.orderId;
      if (key) remoteMap.set(key, item);
    }

    const diffs: Array<any> = [];

    for (const [key, localItem] of localMap.entries()) {
      const remoteItem = remoteMap.get(key);
      if (!remoteItem) {
        diffs.push({
          orderId: localItem.orderId,
          tradeNo: localItem.tradeNo,
          thirdTradeNo: localItem.thirdTradeNo,
          diffType: ReconcileDiffType.MISSING_REMOTE,
          localAmount: localItem.paidAmount ?? localItem.amount,
          remoteAmount: null,
          localStatus: localItem.payStatus,
          remoteStatus: null,
          note: '本地有支付记录，渠道账单缺失'
        });
        continue;
      }

      const localAmount = Number(localItem.paidAmount ?? localItem.amount);
      const remoteAmount = Number(remoteItem.amount);
      if (Math.abs(localAmount - remoteAmount) > 0.01) {
        diffs.push({
          orderId: localItem.orderId,
          tradeNo: localItem.tradeNo,
          thirdTradeNo: localItem.thirdTradeNo,
          diffType: ReconcileDiffType.AMOUNT_MISMATCH,
          localAmount: new Prisma.Decimal(localAmount),
          remoteAmount: new Prisma.Decimal(remoteAmount),
          localStatus: localItem.payStatus,
          remoteStatus: remoteItem.status,
          note: '本地与渠道金额不一致'
        });
      }
    }

    for (const [key, remoteItem] of remoteMap.entries()) {
      if (!localMap.has(key)) {
        diffs.push({
          orderId: remoteItem.orderId,
          tradeNo: remoteItem.tradeNo,
          thirdTradeNo: remoteItem.thirdTradeNo,
          diffType: ReconcileDiffType.MISSING_LOCAL,
          localAmount: null,
          remoteAmount: new Prisma.Decimal(Number(remoteItem.amount)),
          localStatus: null,
          remoteStatus: remoteItem.status,
          note: '渠道有支付记录，本地缺失'
        });
      }
    }

    return diffs;
  }
}
