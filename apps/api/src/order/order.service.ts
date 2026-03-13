import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Logger
} from '@nestjs/common';
import {
  OrderStatus,
  PayChannel,
  PayStatus,
  Prisma,
  SettlementStatus,
  VerifyResult
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { PayOrderDto } from './dto/pay-order.dto';
import { DeliverDto } from './dto/deliver.dto';
import { VerifyDto } from './dto/verify.dto';
import { ConfirmDto } from './dto/confirm.dto';
import { WalletService } from '../wallet/wallet.service';
import { RefundDto } from './dto/refund.dto';
import { DisputeDto } from './dto/dispute.dto';
import { DisputeEvidenceDto } from './dto/dispute-evidence.dto';

@Injectable()
export class OrderService {
  private readonly logger = new Logger(OrderService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly walletService: WalletService
  ) {}

  async create(buyerId: string, dto: CreateOrderDto) {
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId, status: 'ONLINE' },
      select: {
        id: true,
        salePrice: true,
        sellerId: true,
        title: true
      }
    });
    if (!product) throw new NotFoundException('商品不存在或未上架');
    if (product.sellerId === buyerId) {
      throw new ForbiddenException('不可购买自己发布的商品');
    }

    const order = await this.prisma.order.create({
      data: {
        buyerId,
        sellerId: product.sellerId,
        productId: product.id,
        price: product.salePrice,
        fee: new Prisma.Decimal(0),
        payChannel: PayChannel.BALANCE,
        payStatus: PayStatus.UNPAID,
        escrowAmount: product.salePrice,
        status: OrderStatus.PENDING_PAYMENT
      },
      include: { product: true }
    });
    return order;
  }

  async listMine(userId: string, role: 'buyer' | 'seller') {
    const where =
      role === 'buyer'
        ? { buyerId: userId }
        : {
            sellerId: userId
          };
    return this.prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { product: true, payment: true, settlement: true }
    });
  }

  async pay(orderId: string, buyerId: string, dto: PayOrderDto) {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id: orderId } });
      if (!order) throw new NotFoundException('订单不存在');
      if (order.buyerId !== buyerId) throw new ForbiddenException('无权操作');
      if (order.status !== OrderStatus.PENDING_PAYMENT) {
        throw new BadRequestException('当前状态不可支付');
      }

      const now = new Date();
      // 若余额支付，先冻结买家托管
      if (dto.channel === PayChannel.BALANCE) {
        await this.walletService.freezeEscrow(
          buyerId,
          order.price,
          orderId
        );
      }

      const payment = await tx.payment.upsert({
        where: { orderId },
        update: {
          channel: dto.channel,
          amount: order.price,
          payStatus: PayStatus.PAID,
          paidAt: now
        },
        create: {
          orderId,
          channel: dto.channel,
          amount: order.price,
          payStatus: PayStatus.PAID,
          paidAt: now
        }
      });

      await tx.order.update({
        where: { id: orderId },
        data: {
          payStatus: PayStatus.PAID,
          status: OrderStatus.PAID_WAITING_DELIVERY,
          autoConfirmAt: this.calcAutoConfirmAt() // 默认 72h 自动确认，可配
        }
      });

      await tx.orderLog.create({
        data: {
          orderId,
          action: 'PAY',
          actorType: 'USER',
          actorId: buyerId,
          remark: `支付渠道: ${dto.channel}`
        }
      });

      return { payment };
    });
  }

  // Webhook 支付回调专用（绕过 buyerId 校验）
  async markPaidFromWebhook(orderId: string, channel: PayChannel) {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id: orderId } });
      if (!order) throw new NotFoundException('订单不存在');
      if (order.payStatus === PayStatus.PAID) {
        return { alreadyPaid: true };
      }
      const now = new Date();

      await tx.payment.upsert({
        where: { orderId },
        update: {
          channel,
          amount: order.price,
          payStatus: PayStatus.PAID,
          paidAt: now
        },
        create: {
          orderId,
          channel,
          amount: order.price,
          payStatus: PayStatus.PAID,
          paidAt: now
        }
      });

      await tx.order.update({
        where: { id: orderId },
        data: {
          payStatus: PayStatus.PAID,
          status: OrderStatus.PAID_WAITING_DELIVERY,
          autoConfirmAt: this.calcAutoConfirmAt()
        }
      });

      await tx.orderLog.create({
        data: {
          orderId,
          action: 'PAY_WEBHOOK',
          actorType: 'SYSTEM',
          remark: `channel=${channel}`
        }
      });
      return { ok: true };
    });
  }

  async deliver(orderId: string, sellerId: string, dto: DeliverDto) {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id: orderId } });
      if (!order) throw new NotFoundException('订单不存在');
      if (order.sellerId !== sellerId) throw new ForbiddenException('无权操作');
      if (order.status !== OrderStatus.PAID_WAITING_DELIVERY) {
        throw new BadRequestException('当前状态不可交付');
      }

      await tx.deliveryRecord.create({
        data: {
          orderId,
          providerAccount: dto.providerAccount,
          panelUrl: dto.panelUrl,
          loginInfo: dto.loginInfo,
          remark: dto.remark
        }
      });

      await tx.order.update({
        where: { id: orderId },
        data: {
          status: OrderStatus.BUYER_CHECKING
        }
      });

      await tx.orderLog.create({
        data: {
          orderId,
          action: 'DELIVER',
          actorType: 'USER',
          actorId: sellerId
        }
      });
    });
  }

  // 平台核验结果（可选）
  async verify(orderId: string, adminId: string, dto: VerifyDto) {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id: orderId } });
      if (!order) throw new NotFoundException('订单不存在');
      if (order.status !== OrderStatus.BUYER_CHECKING && order.status !== OrderStatus.VERIFYING) {
        throw new BadRequestException('当前状态不可核验');
      }

      await tx.verifyRecord.create({
        data: {
          orderId,
          verifierId: adminId,
          result: dto.result,
          checklist: dto.checklist
        }
      });

      await tx.order.update({
        where: { id: orderId },
        data: {
          status:
            dto.result === VerifyResult.PASS
              ? OrderStatus.BUYER_CHECKING
              : OrderStatus.PAID_WAITING_DELIVERY
        }
      });
    });
  }

  async buyerConfirm(orderId: string, buyerId: string, dto: ConfirmDto) {
    return this.confirmInternal(orderId, 'USER', buyerId, dto.remark);
  }

  async systemConfirm(orderId: string, remark?: string) {
    return this.confirmInternal(orderId, 'SYSTEM', null, remark);
  }

  private async confirmInternal(
    orderId: string,
    actorType: 'USER' | 'SYSTEM',
    actorId: string | null,
    remark?: string
  ) {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id: orderId } });
      if (!order) throw new NotFoundException('订单不存在');
      if (order.status !== OrderStatus.BUYER_CHECKING) {
        throw new BadRequestException('当前状态不可确认');
      }

      await tx.order.update({
        where: { id: orderId },
        data: {
          status: OrderStatus.COMPLETED_PENDING_SETTLEMENT
        }
      });

      await tx.settlement.upsert({
        where: { orderId },
        update: {},
        create: {
          orderId,
          sellerId: order.sellerId,
          amount: order.price,
          fee: order.fee,
          status: SettlementStatus.PENDING
        }
      });

      await tx.orderLog.create({
        data: {
          orderId,
          action: 'BUYER_CONFIRM',
          actorType,
          actorId: actorId ?? undefined,
          remark
        }
      });
    });
  }

  async cancelUnpaid(timeoutMinutes = 30) {
    const deadline = new Date(Date.now() - timeoutMinutes * 60 * 1000);
    const targets = await this.prisma.order.findMany({
      where: {
        status: OrderStatus.PENDING_PAYMENT,
        createdAt: { lt: deadline }
      }
    });
    for (const order of targets) {
      await this.prisma.$transaction(async (tx) => {
        await tx.order.update({
          where: { id: order.id },
          data: { status: OrderStatus.CANCELED }
        });
        await tx.orderLog.create({
          data: {
            orderId: order.id,
            action: 'AUTO_CANCEL',
            actorType: 'SYSTEM',
            remark: '超时未支付自动取消'
          }
        });
      });
    }
    return { canceled: targets.length };
  }

  async autoConfirmTimeout() {
    const now = new Date();
    const targets = await this.prisma.order.findMany({
      where: {
        status: OrderStatus.BUYER_CHECKING,
        autoConfirmAt: { lte: now }
      }
    });
    for (const order of targets) {
      await this.systemConfirm(order.id, '超时自动确认');
    }
    return { confirmed: targets.length };
  }

  async autoReleaseSettlements() {
    const targets = await this.prisma.settlement.findMany({
      where: { status: SettlementStatus.PENDING },
      include: { order: true }
    });
    let released = 0;
    for (const settlement of targets) {
      // 仅在订单已进入待结算状态时释放
      if (settlement.order.status === OrderStatus.COMPLETED_PENDING_SETTLEMENT) {
        await this.walletService.releaseSettlement(settlement.orderId);
        released += 1;
      }
    }
    return { released };
  }

  // 读取配置的超时（分钟/小时），可从 env 覆盖
  get cancelTimeoutMinutes() {
    return Number(process.env.ORDER_UNPAID_CANCEL_MINUTES || 30);
  }

  get autoConfirmHours() {
    return Number(process.env.ORDER_AUTO_CONFIRM_HOURS || 72);
  }

  // 创建订单后计算自动确认时间
  calcAutoConfirmAt() {
    return new Date(Date.now() + this.autoConfirmHours * 60 * 60 * 1000);
  }

  async applyRefund(orderId: string, buyerId: string, dto: RefundDto) {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id: orderId } });
      if (!order) throw new NotFoundException('订单不存在');
      if (order.buyerId !== buyerId) throw new ForbiddenException('无权操作');
      if (![OrderStatus.PAID_WAITING_DELIVERY, OrderStatus.BUYER_CHECKING].includes(order.status)) {
        throw new BadRequestException('当前状态不可申请退款');
      }

      await tx.refund.upsert({
        where: { orderId },
        update: {
          applicantId: buyerId,
          reason: dto.reason,
          status: 'PENDING'
        },
        create: {
          orderId,
          applicantId: buyerId,
          reason: dto.reason,
          amount: order.price
        }
      });

      await tx.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.REFUNDING }
      });

      await tx.orderLog.create({
        data: {
          orderId,
          action: 'REFUND_APPLY',
          actorType: 'USER',
          actorId: buyerId,
          remark: dto.reason
        }
      });
    });
  }

  async handleRefund(orderId: string, adminId: string, decision: 'APPROVED' | 'REJECTED', remark?: string) {
    return this.prisma.$transaction(async (tx) => {
      const refund = await tx.refund.findUnique({ where: { orderId } });
      if (!refund) throw new NotFoundException('退款记录不存在');

      await tx.refund.update({
        where: { orderId },
        data: { status: decision, updatedAt: new Date() }
      });

      await tx.orderLog.create({
        data: {
          orderId,
          action: 'REFUND_DECISION',
          actorType: 'ADMIN',
          actorId: adminId,
          remark: `${decision} ${remark ?? ''}`.trim()
        }
      });

      if (decision === 'APPROVED') {
        await this.walletService.refundToBuyer(orderId);
        await tx.order.update({
          where: { id: orderId },
          data: {
            status: OrderStatus.CANCELED,
            payStatus: PayStatus.REFUNDED
          }
        });
        this.logger.log(`订单 ${orderId} 退款完成`);
      } else {
        await tx.order.update({
          where: { id: orderId },
          data: {
            status: OrderStatus.BUYER_CHECKING
          }
        });
      }
    });
  }

  async openDispute(orderId: string, userId: string, initiator: 'BUYER' | 'SELLER', dto: DisputeDto) {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id: orderId } });
      if (!order) throw new NotFoundException('订单不存在');
      if (initiator === 'BUYER' && order.buyerId !== userId) throw new ForbiddenException('无权操作');
      if (initiator === 'SELLER' && order.sellerId !== userId) throw new ForbiddenException('无权操作');

      await tx.dispute.upsert({
        where: { orderId },
        update: {
          initiator,
          status: 'OPEN'
        },
        create: {
          orderId,
          initiator,
          status: 'OPEN',
          result: dto.reason
        }
      });

      await tx.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.DISPUTING }
      });

      await tx.orderLog.create({
        data: {
          orderId,
          action: 'DISPUTE_OPEN',
          actorType: 'USER',
          actorId: userId,
          remark: dto.reason
        }
      });
    });
  }

  async addDisputeEvidence(orderId: string, userId: string, dto: DisputeEvidenceDto) {
    const dispute = await this.prisma.dispute.findUnique({ where: { orderId } });
    if (!dispute) throw new NotFoundException('纠纷不存在');
    return this.prisma.disputeEvidence.create({
      data: {
        disputeId: dispute.id,
        userId,
        url: dto.url,
        note: dto.note
      }
    });
  }

  async getDispute(orderId: string) {
    return this.prisma.dispute.findUnique({
      where: { orderId },
      include: { evidences: true }
    });
  }

  async listRefunds(status?: string) {
    return this.prisma.refund.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: 'desc' }
    });
  }

  async listDisputes(status?: string) {
    return this.prisma.dispute.findMany({
      where: status ? { status } : undefined,
      include: { evidences: true },
      orderBy: { createdAt: 'desc' }
    });
  }

  async resolveDispute(
    orderId: string,
    status: 'RESOLVED' | 'REJECTED',
    action: 'REFUND' | 'RELEASE',
    result?: string,
    resolution?: string
  ) {
    return this.prisma.$transaction(async (tx) => {
      const dispute = await tx.dispute.findUnique({ where: { orderId } });
      if (!dispute) throw new NotFoundException('纠纷不存在');
      const order = await tx.order.findUnique({ where: { id: orderId } });
      if (!order) throw new NotFoundException('订单不存在');

      await tx.dispute.update({
        where: { orderId },
        data: { status, result, resolution, updatedAt: new Date() }
      });

      // 仲裁动作：退款或放款
      if (status === 'RESOLVED') {
        if (action === 'REFUND') {
          await this.walletService.refundToBuyer(orderId);
          await tx.order.update({
            where: { id: orderId },
            data: { status: OrderStatus.CANCELED, payStatus: PayStatus.REFUNDED }
          });
        } else if (action === 'RELEASE') {
          // 如无结算记录则创建
          await tx.settlement.upsert({
            where: { orderId },
            update: {},
            create: {
              orderId,
              sellerId: order.sellerId,
              amount: order.price,
              fee: order.fee,
              status: SettlementStatus.PENDING
            }
          });
          await this.walletService.releaseSettlement(orderId);
          await tx.order.update({
            where: { id: orderId },
            data: { status: OrderStatus.COMPLETED }
          });
        }
      }

      await tx.orderLog.create({
        data: {
          orderId,
          action: 'DISPUTE_DECISION',
          actorType: 'ADMIN',
          remark: `${status} ${result ?? ''}`.trim()
        }
      });

      this.logger.log(`纠纷裁决 order=${orderId} status=${status}`);
    });
  }

  async orderTimeline(orderId: string) {
    return this.prisma.orderLog.findMany({
      where: { orderId },
      orderBy: { createdAt: 'asc' }
    });
  }
}
