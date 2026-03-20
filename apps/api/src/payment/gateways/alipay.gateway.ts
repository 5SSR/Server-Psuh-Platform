import { Injectable, Logger } from '@nestjs/common';
import { PayChannel } from '@prisma/client';

import {
  PaymentGateway,
  RefundRequest,
  RefundResult,
  RemoteTransaction
} from './payment-gateway.interface';

@Injectable()
export class AlipayGateway implements PaymentGateway {
  readonly channel = PayChannel.ALIPAY;
  private readonly logger = new Logger(AlipayGateway.name);

  private parseRefundResult(body: Record<string, unknown>): RefundResult {
    const successRaw = body.success ?? body.ok ?? body.refunded;
    const success =
      typeof successRaw === 'boolean'
        ? successRaw
        : typeof successRaw === 'number'
          ? successRaw > 0
          : typeof successRaw === 'string'
            ? ['true', 'ok', 'success', 'succeeded'].includes(successRaw.toLowerCase())
            : false;
    const channelRefundNo =
      typeof body.refundNo === 'string'
        ? body.refundNo
        : typeof body.refundId === 'string'
          ? body.refundId
          : typeof body.outRefundNo === 'string'
            ? body.outRefundNo
            : undefined;
    const message =
      typeof body.message === 'string'
        ? body.message
        : typeof body.msg === 'string'
          ? body.msg
          : undefined;
    return {
      success,
      channelRefundNo,
      message,
      raw: body
    };
  }

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
    const endpoint = process.env.ALIPAY_RECONCILE_API;
    if (!endpoint) {
      this.logger.warn('ALIPAY_RECONCILE_API 未配置，返回空账单');
      return [];
    }
    try {
      const url = new URL(endpoint);
      url.searchParams.set('bizDate', bizDate);
      const res = await fetch(url.toString(), {
        headers: {
          Accept: 'application/json',
          ...(process.env.ALIPAY_RECONCILE_TOKEN
            ? { Authorization: `Bearer ${process.env.ALIPAY_RECONCILE_TOKEN}` }
            : {})
        }
      });
      if (!res.ok) {
        const body = await res.text();
        this.logger.error(`ALIPAY 对账接口失败 status=${res.status} body=${body.slice(0, 120)}`);
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
      this.logger.error(`ALIPAY 拉取对账失败: ${reason}`);
      return [];
    }
  }

  async refundTransaction(request: RefundRequest): Promise<RefundResult> {
    const endpoint = process.env.ALIPAY_REFUND_API;
    if (!endpoint) {
      return { success: false, message: 'ALIPAY_REFUND_API 未配置' };
    }
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          ...(process.env.ALIPAY_REFUND_TOKEN
            ? { Authorization: `Bearer ${process.env.ALIPAY_REFUND_TOKEN}` }
            : {})
        },
        body: JSON.stringify({
          orderId: request.orderId,
          amount: request.amount,
          currency: request.currency || 'CNY',
          tradeNo: request.tradeNo,
          thirdTradeNo: request.thirdTradeNo,
          reason: request.reason,
          operatorId: request.operatorId
        })
      });
      const text = await res.text();
      let body: Record<string, unknown> = {};
      try {
        body = text ? (JSON.parse(text) as Record<string, unknown>) : {};
      } catch {
        body = {};
      }
      if (!res.ok) {
        this.logger.error(`ALIPAY 退款接口失败 status=${res.status} body=${text.slice(0, 120)}`);
        return {
          success: false,
          message: `HTTP_${res.status}`,
          raw: text
        };
      }
      return this.parseRefundResult(body);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      this.logger.error(`ALIPAY 发起退款失败: ${reason}`);
      return { success: false, message: reason };
    }
  }
}
