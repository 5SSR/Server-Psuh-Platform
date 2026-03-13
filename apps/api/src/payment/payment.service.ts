import { Injectable } from '@nestjs/common';
import { PayChannel, PayStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PayOrderDto } from '../order/dto/pay-order.dto';
import { OrderService } from '../order/order.service';

@Injectable()
export class PaymentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly orderService: OrderService
  ) {}

  /**
   * 模拟/占位：余额支付直接走订单 pay；其他渠道将支付信息记录为待回调
   */
  async initiatePayment(orderId: string, buyerId: string, dto: PayOrderDto) {
    if (dto.channel === PayChannel.BALANCE) {
      return this.orderService.pay(orderId, buyerId, dto);
    }
    // 其他渠道：生成 payment 记录，标记未支付，等待 webhook
    const payment = await this.prisma.payment.upsert({
      where: { orderId },
      update: {
        channel: dto.channel,
        payStatus: PayStatus.UNPAID
      },
      create: {
        orderId,
        channel: dto.channel,
        amount: new Prisma.Decimal(0), // 实付金额待回调更新
        payStatus: PayStatus.UNPAID
      }
    });
    return { payment, message: '等待支付回调' };
  }
}
