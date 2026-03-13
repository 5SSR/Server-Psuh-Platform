import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { OrderService } from '../order/order.service';
import { createHmac } from 'crypto';
import { PayChannel } from '@prisma/client';

@Injectable()
export class PaymentWebhookService {
  constructor(private readonly orderService: OrderService) {}

  // 占位：根据渠道验签后推进订单为已支付
  async handle(channel: string, payload: Record<string, unknown>) {
    const orderId = payload['orderId'] as string | undefined;
    const sign = (payload['sign'] as string) || '';
    const ts = Number(payload['ts'] ?? 0);
    if (!orderId) return { ok: false, message: '缺少 orderId' };

    const secret = this.resolveSecret(channel);
    if (!this.verifySignature(payload, secret, sign)) {
      throw new UnauthorizedException('签名校验失败');
    }
    if (!this.verifyTimestamp(ts)) {
      throw new BadRequestException('回调超时或时间戳无效');
    }

    await this.orderService.markPaidFromWebhook(
      orderId,
      channel.toUpperCase() as PayChannel
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
    // 时间戳也参与签名
    const data = JSON.stringify(cloned);
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
