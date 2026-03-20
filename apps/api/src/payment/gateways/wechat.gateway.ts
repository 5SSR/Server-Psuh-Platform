import { Injectable, Logger } from '@nestjs/common';
import { PayChannel } from '@prisma/client';

import { PaymentGateway, RemoteTransaction } from './payment-gateway.interface';

@Injectable()
export class WechatGateway implements PaymentGateway {
  readonly channel = PayChannel.WECHAT;
  private readonly logger = new Logger(WechatGateway.name);

  private normalize(items: unknown): RemoteTransaction[] {
    if (!Array.isArray(items)) return [];
    return items
      .map((item) => {
        const record = item as Record<string, unknown>;
        const amount = Number(record.amount ?? record.totalAmount ?? record.payAmount ?? 0);
        if (!Number.isFinite(amount) || amount <= 0) return null;
        return {
          orderId: typeof record.orderId === 'string' ? record.orderId : undefined,
          tradeNo: typeof record.tradeNo === 'string' ? record.tradeNo : undefined,
          thirdTradeNo:
            typeof record.thirdTradeNo === 'string'
              ? record.thirdTradeNo
              : typeof record.channelOrderId === 'string'
                ? record.channelOrderId
                : undefined,
          amount,
          status:
            typeof record.status === 'string'
              ? record.status
              : typeof record.payStatus === 'string'
                ? record.payStatus
                : 'PAID',
          paidAt: typeof record.paidAt === 'string' ? record.paidAt : undefined
        } as RemoteTransaction;
      })
      .filter((item): item is RemoteTransaction => item !== null);
  }

  async fetchTransactions(bizDate: string): Promise<RemoteTransaction[]> {
    const endpoint = process.env.WECHAT_RECONCILE_API;
    if (!endpoint) {
      this.logger.warn('WECHAT_RECONCILE_API 未配置，返回空账单');
      return [];
    }
    try {
      const url = new URL(endpoint);
      url.searchParams.set('bizDate', bizDate);
      const res = await fetch(url.toString(), {
        headers: {
          Accept: 'application/json',
          ...(process.env.WECHAT_RECONCILE_TOKEN
            ? { Authorization: `Bearer ${process.env.WECHAT_RECONCILE_TOKEN}` }
            : {})
        }
      });
      if (!res.ok) {
        const body = await res.text();
        this.logger.error(`WECHAT 对账接口失败 status=${res.status} body=${body.slice(0, 120)}`);
        return [];
      }
      const body = (await res.json()) as unknown;
      if (Array.isArray(body)) {
        return this.normalize(body);
      }
      if (body && typeof body === 'object') {
        const list = (body as Record<string, unknown>).list;
        return this.normalize(list);
      }
      return [];
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      this.logger.error(`WECHAT 拉取对账失败: ${reason}`);
      return [];
    }
  }
}
