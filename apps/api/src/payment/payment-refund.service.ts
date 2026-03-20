import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PayChannel } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

import { AlipayGateway } from './gateways/alipay.gateway';
import { WechatGateway } from './gateways/wechat.gateway';
import { UsdtGateway } from './gateways/usdt.gateway';
import { PaymentGateway } from './gateways/payment-gateway.interface';

type GatewayMode = 'MOCK' | 'REMOTE' | 'DISABLED';

export type ChannelRefundAttemptResult = {
  channel: PayChannel;
  supported: boolean;
  success: boolean;
  mode?: GatewayMode;
  reason?: string;
  channelRefundNo?: string;
  raw?: unknown;
};

@Injectable()
export class PaymentRefundService {
  private readonly logger = new Logger(PaymentRefundService.name);
  private readonly gateways: PaymentGateway[];

  constructor(
    private readonly prisma: PrismaService,
    alipayGateway: AlipayGateway,
    wechatGateway: WechatGateway,
    usdtGateway: UsdtGateway
  ) {
    this.gateways = [alipayGateway, wechatGateway, usdtGateway];
  }

  async attemptRefund(
    orderId: string,
    input?: {
      reason?: string;
      operatorId?: string;
    }
  ): Promise<ChannelRefundAttemptResult> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        payment: {
          select: {
            id: true,
            channel: true,
            tradeNo: true,
            thirdTradeNo: true,
            amount: true,
            paidAmount: true,
            currency: true
          }
        }
      }
    });
    if (!order) throw new NotFoundException('订单不存在');

    const channel = order.payment?.channel ?? order.payChannel;
    if (channel === PayChannel.BALANCE) {
      return {
        channel,
        supported: false,
        success: false,
        reason: 'BALANCE_CHANNEL_USE_WALLET'
      };
    }
    if (channel === PayChannel.MANUAL) {
      return {
        channel,
        supported: false,
        success: false,
        reason: 'MANUAL_CHANNEL_NEED_OFFLINE_REVIEW'
      };
    }
    if (!order.payment) {
      return {
        channel,
        supported: false,
        success: false,
        reason: 'PAYMENT_RECORD_MISSING'
      };
    }

    const mode = this.resolveGatewayMode(channel);
    if (mode === 'DISABLED') {
      return {
        channel,
        mode,
        supported: true,
        success: false,
        reason: 'CHANNEL_DISABLED'
      };
    }

    const amount = Number(order.escrowAmount ?? order.payment.paidAmount ?? order.payment.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return {
        channel,
        mode,
        supported: true,
        success: false,
        reason: 'INVALID_REFUND_AMOUNT'
      };
    }

    if (mode === 'MOCK') {
      const channelRefundNo = `RF-MOCK-${Date.now()}-${order.id.slice(0, 6)}`;
      await this.appendEvent(order.payment.id, 'REFUND_CHANNEL_MOCK_SUCCESS', {
        orderId,
        channel,
        amount,
        channelRefundNo,
        reason: input?.reason || null,
        operatorId: input?.operatorId || null
      });
      return {
        channel,
        mode,
        supported: true,
        success: true,
        reason: 'MOCK_CHANNEL_REFUND_SUCCESS',
        channelRefundNo
      };
    }

    const gateway = this.gateways.find((item) => item.channel === channel);
    if (!gateway?.refundTransaction) {
      return {
        channel,
        mode,
        supported: false,
        success: false,
        reason: 'GATEWAY_REFUND_NOT_IMPLEMENTED'
      };
    }

    const result = await gateway.refundTransaction({
      orderId,
      amount,
      currency: order.payment.currency,
      tradeNo: order.payment.tradeNo || undefined,
      thirdTradeNo: order.payment.thirdTradeNo || undefined,
      reason: input?.reason,
      operatorId: input?.operatorId
    });

    if (result.success) {
      await this.appendEvent(order.payment.id, 'REFUND_CHANNEL_SUCCESS', {
        orderId,
        channel,
        amount,
        channelRefundNo: result.channelRefundNo || null,
        reason: input?.reason || null,
        operatorId: input?.operatorId || null,
        response: result.raw ?? null
      });
      return {
        channel,
        mode,
        supported: true,
        success: true,
        channelRefundNo: result.channelRefundNo,
        reason: result.message,
        raw: result.raw
      };
    }

    await this.appendEvent(order.payment.id, 'REFUND_CHANNEL_FAILED', {
      orderId,
      channel,
      amount,
      reason: result.message || null,
      operatorId: input?.operatorId || null,
      response: result.raw ?? null
    });
    return {
      channel,
      mode,
      supported: true,
      success: false,
      reason: result.message || 'CHANNEL_REFUND_FAILED',
      raw: result.raw
    };
  }

  private resolveGatewayMode(channel: PayChannel): GatewayMode {
    const raw = String(process.env[`PAY_GATEWAY_${channel}_MODE`] || '').trim().toUpperCase();
    if (raw === 'REMOTE') return 'REMOTE';
    if (raw === 'DISABLED') return 'DISABLED';
    if (raw === 'MOCK') return 'MOCK';
    return 'DISABLED';
  }

  private async appendEvent(paymentId: string, eventType: string, payload: Record<string, unknown>) {
    try {
      await this.prisma.paymentEvent.create({
        data: {
          paymentId,
          eventType,
          source: 'REFUND',
          payload: payload as any
        }
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      this.logger.warn(`记录支付退款事件失败 paymentId=${paymentId}: ${reason}`);
    }
  }
}
