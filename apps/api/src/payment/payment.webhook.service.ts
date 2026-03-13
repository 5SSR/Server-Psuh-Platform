import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { OrderService } from '../order/order.service';
import { createHmac } from 'crypto';
import { PayChannel } from '@prisma/client';
import { PaymentWebhookDto } from './dto/webhook.dto';

@Injectable()
export class PaymentWebhookService {
  constructor(private readonly orderService: OrderService) {}

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
}
