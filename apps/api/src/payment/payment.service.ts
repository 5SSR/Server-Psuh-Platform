import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import { PayChannel, PayStatus, Prisma, OrderStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PayOrderDto } from '../order/dto/pay-order.dto';
import { OrderService } from '../order/order.service';
import { createHmac } from 'crypto';

@Injectable()
export class PaymentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly orderService: OrderService
  ) {}

  /**
   * 买家发起支付：
   * - 余额：直接扣款并进入已支付
   * - 其他渠道：生成支付意图，返回模拟跳转/回调参数，等待 webhook 确认
   */
  async initiatePayment(orderId: string, buyerId: string, dto: PayOrderDto) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { payment: true }
    });
    if (!order) throw new NotFoundException('订单不存在');
    if (order.buyerId !== buyerId) throw new ForbiddenException('无权操作');
    if (order.status !== OrderStatus.PENDING_PAYMENT) {
      throw new BadRequestException('当前状态不可支付');
    }
    if (order.payStatus === PayStatus.PAID) {
      return { alreadyPaid: true, orderId, payStatus: order.payStatus };
    }

    if (dto.channel === PayChannel.BALANCE) {
      return this.orderService.pay(orderId, buyerId, dto);
    }

    const amount = order.price.add(order.fee ?? new Prisma.Decimal(0));
    const tradeNo = order.payment?.tradeNo ?? this.generateTradeNo(orderId);

    const payment = await this.prisma.payment.upsert({
      where: { orderId },
      update: {
        channel: dto.channel,
        amount,
        payStatus: PayStatus.UNPAID,
        tradeNo,
        notifyPayload: dto.meta as any
      },
      create: {
        orderId,
        channel: dto.channel,
        amount,
        payStatus: PayStatus.UNPAID,
        tradeNo,
        notifyPayload: dto.meta as any
      }
    });

    await this.prisma.order.update({
      where: { id: orderId },
      data: { payChannel: dto.channel, payStatus: PayStatus.UNPAID }
    });

    await this.prisma.orderLog.create({
      data: {
        orderId,
        action: 'PAY_INIT',
        actorType: 'USER',
        actorId: buyerId,
        remark: `channel=${dto.channel}`
      }
    });

    const signedPayload = this.buildSignedPayload({
      orderId,
      channel: dto.channel,
      amount: Number(amount),
      tradeNo
    });

    return {
      payment: {
        id: payment.id,
        orderId,
        tradeNo,
        channel: payment.channel,
        amount: Number(payment.amount),
        payStatus: payment.payStatus
      },
      checkout: {
        payUrl: this.buildPayUrl(tradeNo, dto.channel),
        qrData: this.buildQrData(tradeNo, dto.channel),
        webhook: {
          url: `${this.webhookBase}/${dto.channel.toLowerCase()}`,
          payload: signedPayload
        }
      },
      message: '请跳转第三方支付或在本地调用 webhook 完成模拟'
    };
  }

  // 查询支付状态，买家/卖家均可查看
  async getPaymentStatus(orderId: string, userId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { payment: true }
    });
    if (!order) throw new NotFoundException('订单不存在');
    if (order.buyerId !== userId && order.sellerId !== userId) {
      throw new ForbiddenException('无权查看');
    }

    return {
      order: {
        id: order.id,
        status: order.status,
        payStatus: order.payStatus,
        payChannel: order.payChannel,
        price: Number(order.price),
        fee: Number(order.fee)
      },
      payment: order.payment,
      nextAction:
        order.payStatus === PayStatus.PAID
          ? 'WAIT_DELIVERY'
          : 'COMPLETE_PAYMENT'
    };
  }

  // 本地/测试环境模拟支付成功，直接走 webhook 逻辑
  async simulateSuccess(orderId: string, userId: string) {
    if (process.env.NODE_ENV === 'production') {
      throw new ForbiddenException('生产环境禁止模拟支付');
    }
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { payment: true }
    });
    if (!order) throw new NotFoundException('订单不存在');
    if (order.buyerId !== userId) throw new ForbiddenException('只能由买家触发');

    const channel = order.payChannel ?? order.payment?.channel ?? PayChannel.MANUAL;
    const amount = Number(order.payment?.amount ?? order.price);
    const tradeNo = order.payment?.tradeNo ?? undefined;
    return this.orderService.markPaidFromWebhook(orderId, channel, amount, { mock: true }, tradeNo);
  }

  private buildSignedPayload(base: {
    orderId: string;
    channel: PayChannel;
    amount: number;
    tradeNo: string;
  }) {
    const ts = Math.floor(Date.now() / 1000);
    const payload: Record<string, any> = {
      ...base,
      ts
    };
    const secret = this.resolveSecret(base.channel);
    payload.sign = this.sign(payload, secret);
    return payload;
  }

  private buildPayUrl(tradeNo: string, channel: PayChannel) {
    // 模拟支付跳转链接，前端可展示给用户或直接复制
    return `${this.payEntryBase}/${channel.toLowerCase()}?tradeNo=${tradeNo}`;
  }

  private buildQrData(tradeNo: string, channel: PayChannel) {
    return `PAY:${channel}:${tradeNo}`;
  }

  private generateTradeNo(orderId: string) {
    return `PAY-${Date.now()}-${orderId.slice(0, 6)}`;
  }

  private resolveSecret(channel: PayChannel) {
    switch (channel) {
      case PayChannel.ALIPAY:
        return process.env.PAY_WEBHOOK_SECRET_ALIPAY || '';
      case PayChannel.WECHAT:
        return process.env.PAY_WEBHOOK_SECRET_WECHAT || '';
      default:
        return process.env.PAY_WEBHOOK_SECRET_MANUAL || '';
    }
  }

  private sign(payload: Record<string, unknown>, secret: string) {
    const cloned = { ...payload };
    delete cloned['sign'];
    const sorted = Object.keys(cloned)
      .sort()
      .reduce((acc, key) => {
        acc[key] = cloned[key];
        return acc;
      }, {} as Record<string, unknown>);
    const data = JSON.stringify(sorted);
    return createHmac('sha256', secret).update(data).digest('hex');
  }

  private get webhookBase() {
    return process.env.PAY_WEBHOOK_BASE || 'http://localhost:4000/api/v1/webhook/payment';
  }

  private get payEntryBase() {
    return process.env.PAY_ENTRY_BASE || 'https://pay.mock.local';
  }
}
