import { createHmac } from 'crypto';

import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { PayChannel, RiskScene } from '@prisma/client';

import { OrderService } from '../order/order.service';
import { PrismaService } from '../prisma/prisma.service';
import { RiskService } from '../risk/risk.service';

import { PaymentWebhookDto } from './dto/webhook.dto';

@Injectable()
export class PaymentWebhookService {
  constructor(
    private readonly orderService: OrderService,
    private readonly prisma: PrismaService,
    private readonly riskService: RiskService
  ) {}

  // 占位：根据渠道验签后推进订单为已支付
  async handle(channel: string, payload: PaymentWebhookDto) {
    const orderId = payload.orderId;
    const sign = payload.sign || '';
    const ts = Number(payload.ts ?? 0);
    if (!orderId) throw new BadRequestException('缺少 orderId');
    const amountNum = Number(payload.amount);
    if (!amountNum || amountNum <= 0) throw new BadRequestException('金额无效');

    const secret = this.resolveSecret(channel);
    if (!this.verifySignature(payload as Record<string, unknown>, secret, sign)) {
      throw new UnauthorizedException('签名校验失败');
    }
    if (!this.verifyTimestamp(ts)) {
      throw new BadRequestException('回调超时或时间戳无效');
    }

    const payChannel = channel.toUpperCase() as PayChannel;
    this.validateChannelConsistency(channel, payload.channel);
    await this.validateAmount(orderId, amountNum);

    const risk = await this.riskService.evaluate(RiskScene.PAYMENT_CALLBACK, {
      orderId,
      amount: amountNum,
      channel: payChannel,
      tradeNo: payload.tradeNo
    });
    if (risk.action === 'BLOCK') {
      throw new BadRequestException('风控拦截：支付回调已阻断');
    }

    await this.orderService.markPaidFromWebhook(
      orderId,
      payChannel,
      amountNum,
      payload.payload ?? payload,
      payload.tradeNo
    );
    return { ok: true };
  }

  private resolveSecret(channel: string) {
    switch (channel.toLowerCase()) {
      case 'alipay':
        return process.env.PAY_WEBHOOK_SECRET_ALIPAY || '';
      case 'wechat':
        return process.env.PAY_WEBHOOK_SECRET_WECHAT || '';
      case 'usdt':
        return process.env.PAY_WEBHOOK_SECRET_USDT || '';
      default:
        return process.env.PAY_WEBHOOK_SECRET_MANUAL || '';
    }
  }

  private verifySignature(payload: Record<string, unknown>, secret: string, sign: string) {
    const cloned = { ...payload };
    delete cloned['sign'];
    // 规范化顺序：按 key 排序后 JSON 序列化
    const sorted = Object.keys(cloned)
      .sort()
      .reduce((acc, key) => {
        acc[key] = cloned[key];
        return acc;
      }, {} as Record<string, unknown>);
    const data = JSON.stringify(sorted);
    const digest = createHmac('sha256', secret).update(data).digest('hex');
    return digest === sign;
  }

  private verifyTimestamp(ts: number) {
    if (!ts) return false;
    const skew = Number(process.env.PAY_WEBHOOK_MAX_SKEW || 300);
    const now = Math.floor(Date.now() / 1000);
    return Math.abs(now - ts) <= skew;
  }

  private validateChannelConsistency(routeChannel: string, bodyChannel: PayChannel) {
    const normalizedRoute = routeChannel.toUpperCase();
    const normalizedBody = bodyChannel?.toUpperCase?.();
    if (normalizedBody && normalizedRoute !== normalizedBody) {
      throw new BadRequestException('渠道参数不一致');
    }
  }

  private async validateAmount(orderId: string, amount: number) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        price: true,
        fee: true,
        escrowAmount: true,
        payment: {
          select: { amount: true }
        }
      }
    });
    if (!order) throw new BadRequestException('订单不存在');

    const expected = order.payment
      ? Number(order.payment.amount)
      : Number(order.escrowAmount ?? Number(order.price) + Number(order.fee));
    if (Math.abs(expected - amount) > 0.01) {
      throw new BadRequestException(`回调金额不匹配，期望 ${expected.toFixed(2)}`);
    }
  }
}
