import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Inject,
  NotFoundException,
  Logger,
  forwardRef
} from '@nestjs/common';
import {
  OrderStatus,
  PayChannel,
  PayStatus,
  Prisma,
  RiskAction,
  SettlementStatus,
  VerifyResult,
  RefundStatus,
  DisputeStatus,
  RiskScene
} from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import { NoticeService } from '../notice/notice.service';
import { RiskService } from '../risk/risk.service';
import { PaymentRefundService } from '../payment/payment-refund.service';

import { CreateOrderDto } from './dto/create-order.dto';
import { PayOrderDto } from './dto/pay-order.dto';
import { DeliverDto } from './dto/deliver.dto';
import { VerifyDto } from './dto/verify.dto';
import { ConfirmDto } from './dto/confirm.dto';
import { RefundDto } from './dto/refund.dto';
import { DisputeDto } from './dto/dispute.dto';
import { DisputeEvidenceDto } from './dto/dispute-evidence.dto';
import { AdminOrderQueryDto } from './dto/admin-order-query.dto';
import { CreateOrderReviewDto } from './dto/create-order-review.dto';

type NegotiationOrderInput = {
  buyerId: string;
  sellerId: string;
  productId: string;
  price: Prisma.Decimal | number | string;
  bargainId: string;
};

type FeeTier = { upTo: number | null; rate: number };
type FeePayerMode = 'BUYER' | 'SELLER' | 'SHARED';
type ResolvedOrderFeeConfig = {
  mode: 'FIXED' | 'RATE' | 'TIER';
  payer: FeePayerMode;
  fixedFee: number;
  rate: number;
  minFee: number;
  tiers: FeeTier[];
};


@Injectable()
export class OrderService {
  private readonly logger = new Logger(OrderService.name);
  private readonly feeTierFallback = [
    { upTo: 200, rate: 0.03 },
    { upTo: 1000, rate: 0.02 },
    { upTo: null, rate: 0.015 }
  ];
  private orderFeeConfigCache: { expireAt: number; value: ResolvedOrderFeeConfig } | null =
    null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly walletService: WalletService,
    private readonly noticeService: NoticeService,
    private readonly riskService: RiskService,
    @Inject(forwardRef(() => PaymentRefundService))
    private readonly paymentRefundService: PaymentRefundService
  ) {}

  private readNonNegativeNumber(name: string, fallback: number) {
    const value = Number(process.env[name]);
    return Number.isFinite(value) && value >= 0 ? value : fallback;
  }

  private roundMoney(value: Prisma.Decimal | number) {
    const n = value instanceof Prisma.Decimal ? value : new Prisma.Decimal(value);
    return new Prisma.Decimal(n.toFixed(2));
  }

  private clampToPrice(value: Prisma.Decimal, price: Prisma.Decimal) {
    if (value.lt(0)) return new Prisma.Decimal(0);
    if (value.gt(price)) return price;
    return value;
  }

  private get envOrderFeeMode() {
    const mode = String(process.env.ORDER_FEE_MODE || 'RATE').toUpperCase();
    return ['FIXED', 'RATE', 'TIER'].includes(mode) ? mode : 'RATE';
  }

  private get envOrderFeePayer() {
    const payer = String(process.env.ORDER_FEE_PAYER || 'SELLER').toUpperCase();
    return ['BUYER', 'SELLER', 'SHARED'].includes(payer)
      ? (payer as FeePayerMode)
      : 'SELLER';
  }

  private shouldFallbackWalletOnChannelRefundFailure() {
    const value = String(process.env.ORDER_REFUND_FALLBACK_WALLET || 'true').toLowerCase();
    return value !== 'false' && value !== '0' && value !== 'no';
  }

  private normalizeFeePayer(input?: unknown): FeePayerMode {
    const payer = String(input || this.envOrderFeePayer).toUpperCase();
    if (payer === 'BUYER') return 'BUYER';
    if (payer === 'SHARED') return 'SHARED';
    return 'SELLER';
  }

  private parseFeeTiers(raw: unknown): FeeTier[] {
    if (!Array.isArray(raw) || raw.length === 0) {
      return this.feeTierFallback;
    }
    const list = raw
      .map((item) => {
        const source = item as Record<string, unknown>;
        const rate = Number(source?.rate);
        const upToRaw = source?.upTo;
        const upTo =
          upToRaw === null || upToRaw === undefined || upToRaw === ''
            ? null
            : Number(upToRaw);
        return { upTo, rate };
      })
      .filter(
        (item) =>
          Number.isFinite(item.rate) &&
          item.rate >= 0 &&
          (item.upTo === null || (Number.isFinite(item.upTo) && item.upTo >= 0))
      )
      .sort((a, b) => {
        if (a.upTo === null) return 1;
        if (b.upTo === null) return -1;
        return a.upTo - b.upTo;
      });
    return list.length > 0 ? list : this.feeTierFallback;
  }

  private getEnvFeeTiers() {
    try {
      const raw = process.env.ORDER_FEE_TIERS_JSON;
      if (!raw) return this.feeTierFallback;
      return this.parseFeeTiers(JSON.parse(raw));
    } catch {
      return this.feeTierFallback;
    }
  }

  private async resolveOrderFeeConfig(): Promise<ResolvedOrderFeeConfig> {
    const now = Date.now();
    if (this.orderFeeConfigCache && this.orderFeeConfigCache.expireAt > now) {
      return this.orderFeeConfigCache.value;
    }

    const envConfig: ResolvedOrderFeeConfig = {
      mode: this.envOrderFeeMode as ResolvedOrderFeeConfig['mode'],
      payer: this.envOrderFeePayer,
      fixedFee: this.readNonNegativeNumber('ORDER_FEE_FIXED', 1),
      rate: this.readNonNegativeNumber('ORDER_FEE_RATE', 0.015),
      minFee: this.readNonNegativeNumber('ORDER_FEE_MIN', 0),
      tiers: this.getEnvFeeTiers()
    };

    const remote = await this.prisma.feeConfig.findUnique({
      where: { scene: 'ORDER' }
    });

    const resolved: ResolvedOrderFeeConfig = remote
      ? {
          mode: ['FIXED', 'RATE', 'TIER'].includes(String(remote.mode))
            ? (String(remote.mode) as ResolvedOrderFeeConfig['mode'])
            : envConfig.mode,
          payer: this.normalizeFeePayer(remote.payer),
          fixedFee:
            remote.fixedFee !== null && remote.fixedFee !== undefined
              ? Number(remote.fixedFee)
              : envConfig.fixedFee,
          rate:
            remote.rate !== null && remote.rate !== undefined
              ? Number(remote.rate)
              : envConfig.rate,
          minFee:
            remote.minFee !== null && remote.minFee !== undefined
              ? Number(remote.minFee)
              : envConfig.minFee,
          tiers: remote.tiers ? this.parseFeeTiers(remote.tiers as unknown[]) : envConfig.tiers
        }
      : envConfig;

    this.orderFeeConfigCache = {
      expireAt: now + 30_000,
      value: resolved
    };
    return resolved;
  }

  private async calcOrderFee(price: Prisma.Decimal) {
    const config = await this.resolveOrderFeeConfig();

    if (config.mode === 'FIXED') {
      return {
        fee: this.clampToPrice(this.roundMoney(config.fixedFee), price),
        payer: config.payer
      };
    }

    if (config.mode === 'TIER') {
      const priceNum = Number(price);
      const matched =
        config.tiers.find((item) => item.upTo !== null && priceNum <= Number(item.upTo)) ??
        config.tiers.find((item) => item.upTo === null) ??
        config.tiers[config.tiers.length - 1];
      return {
        fee: this.clampToPrice(this.roundMoney(price.mul(Number(matched?.rate ?? 0))), price),
        payer: config.payer
      };
    }

    let fee = this.roundMoney(price.mul(config.rate));
    const minFeeDecimal = this.roundMoney(config.minFee);
    if (fee.lt(minFeeDecimal)) fee = minFeeDecimal;
    return {
      fee: this.clampToPrice(fee, price),
      payer: config.payer
    };
  }

  private calcBuyerFee(fee: Prisma.Decimal, payer: FeePayerMode) {
    if (payer === 'BUYER') return fee;
    if (payer === 'SHARED') return this.roundMoney(fee.div(2));
    return new Prisma.Decimal(0);
  }

  private calcSellerFee(fee: Prisma.Decimal, payer: FeePayerMode) {
    if (payer === 'SELLER') return fee;
    if (payer === 'SHARED') return fee.minus(this.calcBuyerFee(fee, payer));
    return new Prisma.Decimal(0);
  }

  private asDecimal(value: Prisma.Decimal | number | string) {
    return value instanceof Prisma.Decimal ? value : new Prisma.Decimal(value);
  }

  private calcEscrowAmount(
    price: Prisma.Decimal | number | string,
    fee: Prisma.Decimal | number | string,
    payerInput?: unknown
  ) {
    const basePrice = this.asDecimal(price);
    const feeDecimal = this.asDecimal(fee);
    const payer = this.normalizeFeePayer(payerInput);
    return this.roundMoney(basePrice.add(this.calcBuyerFee(feeDecimal, payer)));
  }

  private calcSettlementAmount(
    price: Prisma.Decimal | number | string,
    fee: Prisma.Decimal | number | string,
    payerInput?: unknown
  ) {
    const basePrice = this.asDecimal(price);
    const feeDecimal = this.asDecimal(fee);
    const payer = this.normalizeFeePayer(payerInput);
    return this.roundMoney(basePrice.minus(this.calcSellerFee(feeDecimal, payer)));
  }

  private async createOrderRecord(
    db: Prisma.TransactionClient | PrismaService,
    input: {
      buyerId: string;
      sellerId: string;
      productId: string;
      price: Prisma.Decimal;
      actorId: string;
      action: string;
      remarkPrefix: string;
      riskAction?: RiskAction;
      riskReviewRequired?: boolean;
      riskReviewPassed?: boolean | null;
    }
  ) {
    const prefix = input.remarkPrefix ? `${input.remarkPrefix} ` : '';
    const { fee, payer } = await this.calcOrderFee(input.price);
    const escrowAmount = this.calcEscrowAmount(input.price, fee, payer);
    const settlementAmount = this.calcSettlementAmount(input.price, fee, payer);

    const order = await db.order.create({
      data: {
        buyerId: input.buyerId,
        sellerId: input.sellerId,
        productId: input.productId,
        price: input.price,
        fee,
        feePayer: payer,
        payChannel: PayChannel.BALANCE,
        payStatus: PayStatus.UNPAID,
        escrowAmount,
        status: OrderStatus.PENDING_PAYMENT,
        riskAction: input.riskAction ?? RiskAction.ALLOW,
        riskReviewRequired: input.riskReviewRequired ?? false,
        riskReviewPassed:
          input.riskReviewPassed !== undefined ? input.riskReviewPassed : input.riskReviewRequired ? null : true
      },
      include: { product: true }
    });

    await db.orderLog.create({
      data: {
        orderId: order.id,
        action: input.action,
        actorType: 'USER',
        actorId: input.actorId,
        remark: `${prefix}fee=${fee.toFixed(2)} payer=${payer} escrow=${escrowAmount.toFixed(2)} settlement=${settlementAmount.toFixed(2)}`
      }
    });

    return order;
  }

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

    const risk = await this.riskService.evaluate(RiskScene.CREATE_ORDER, {
      userId: buyerId,
      amount: Number(product.salePrice),
      productId: product.id,
      sellerId: product.sellerId
    });
    if (risk.action === 'BLOCK' || risk.action === 'LIMIT') {
      throw new ForbiddenException('下单请求触发风控拦截，请联系平台客服处理');
    }
    const needsManualReview = risk.action === 'REVIEW';

    return this.createOrderRecord(this.prisma, {
      buyerId,
      sellerId: product.sellerId,
      productId: product.id,
      price: new Prisma.Decimal(product.salePrice),
      actorId: buyerId,
      action: 'ORDER_CREATE',
      remarkPrefix: risk.action !== 'ALLOW' ? `risk=${risk.action}` : '',
      riskAction: risk.action,
      riskReviewRequired: needsManualReview,
      riskReviewPassed: needsManualReview ? null : true
    });
  }

  async createByNegotiation(
    input: NegotiationOrderInput,
    tx?: Prisma.TransactionClient
  ) {
    if (input.buyerId === input.sellerId) {
      throw new ForbiddenException('买卖双方不能为同一用户');
    }

    const db = tx ?? this.prisma;
    const product = await db.product.findUnique({
      where: { id: input.productId },
      select: {
        id: true,
        status: true,
        sellerId: true
      }
    });

    if (!product || product.status !== 'ONLINE') {
      throw new NotFoundException('商品不存在或未上架');
    }
    if (product.sellerId !== input.sellerId) {
      throw new ForbiddenException('议价卖家与商品归属不一致');
    }

    return this.createOrderRecord(db, {
      buyerId: input.buyerId,
      sellerId: input.sellerId,
      productId: input.productId,
      price: this.asDecimal(input.price),
      actorId: input.buyerId,
      action: 'ORDER_CREATE_NEGOTIATION',
      remarkPrefix: `bargain=${input.bargainId}`
    });
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
      include: {
        product: true,
        buyer: {
          select: { id: true, email: true }
        },
        seller: {
          select: { id: true, email: true }
        },
        payment: true,
        settlement: true,
        deliveryRecords: {
          orderBy: { createdAt: 'desc' },
          take: 1
        },
        verifyRecords: {
          orderBy: { createdAt: 'desc' },
          take: 1
        },
        review: true
      }
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
      if (order.riskReviewRequired && order.riskReviewPassed !== true) {
        throw new BadRequestException('订单需先通过平台风控审核，暂不可支付');
      }

      const now = new Date();
      // 若余额支付，先冻结买家托管
      if (dto.channel === PayChannel.BALANCE) {
        await this.walletService.freezeEscrow(
          buyerId,
          order.escrowAmount,
          orderId
        );
      }

      const payment = await tx.payment.upsert({
        where: { orderId },
        update: {
          channel: dto.channel,
          amount: order.escrowAmount,
          payStatus: PayStatus.PAID,
          paidAt: now
        },
        create: {
          orderId,
          channel: dto.channel,
          amount: order.escrowAmount,
          payStatus: PayStatus.PAID,
          paidAt: now
        }
      });

      await tx.order.update({
        where: { id: orderId },
        data: {
          payChannel: dto.channel,
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
  async markPaidFromWebhook(
    orderId: string,
    channel: PayChannel,
    amount: number,
    notifyPayload?: Record<string, unknown>,
    tradeNo?: string
  ) {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id: orderId } });
      if (!order) throw new NotFoundException('订单不存在');
      if (order.payStatus === PayStatus.PAID) {
        return { alreadyPaid: true };
      }
      if (order.riskReviewRequired && order.riskReviewPassed !== true) {
        throw new BadRequestException('订单需先通过平台风控审核，暂不可支付');
      }
      const now = new Date();

      await tx.payment.upsert({
        where: { orderId },
        update: {
          channel,
          amount: new Prisma.Decimal(amount),
          payStatus: PayStatus.PAID,
          paidAt: now,
          tradeNo: tradeNo ?? undefined,
          notifyPayload: notifyPayload as any
        },
        create: {
          orderId,
          channel,
          amount: new Prisma.Decimal(amount),
          payStatus: PayStatus.PAID,
          paidAt: now,
          tradeNo: tradeNo ?? `PAY-${Date.now()}`,
          notifyPayload: notifyPayload as any
        }
      });

      await tx.order.update({
        where: { id: orderId },
        data: {
          payChannel: channel,
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
          status: this.requirePlatformVerify ? OrderStatus.VERIFYING : OrderStatus.BUYER_CHECKING
        }
      });

      await tx.orderLog.create({
        data: {
          orderId,
          action: 'DELIVER',
          actorType: 'USER',
          actorId: sellerId,
          remark: this.requirePlatformVerify ? '交付完成，等待平台核验' : '交付完成，进入买家验机'
        }
      });
    });
  }

  async deliverByAdmin(orderId: string, adminId: string, dto: DeliverDto) {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: {
          product: {
            select: {
              id: true,
              title: true,
              code: true,
              consignment: true
            }
          }
        }
      });
      if (!order) throw new NotFoundException('订单不存在');
      if (order.status !== OrderStatus.PAID_WAITING_DELIVERY) {
        throw new BadRequestException('当前状态不可交付');
      }
      if (!order.product?.consignment) {
        throw new BadRequestException('仅寄售商品支持平台代交付');
      }

      await tx.deliveryRecord.create({
        data: {
          orderId,
          providerAccount: dto.providerAccount,
          panelUrl: dto.panelUrl,
          loginInfo: dto.loginInfo,
          remark: dto.remark?.trim()
            ? `[平台代交付] ${dto.remark.trim()}`
            : '[平台代交付] 平台已代卖家完成交付'
        }
      });

      const nextStatus = this.requirePlatformVerify
        ? OrderStatus.VERIFYING
        : OrderStatus.BUYER_CHECKING;

      await tx.order.update({
        where: { id: orderId },
        data: { status: nextStatus }
      });

      await tx.orderLog.create({
        data: {
          orderId,
          action: 'DELIVER_ADMIN',
          actorType: 'ADMIN',
          actorId: adminId,
          remark: this.requirePlatformVerify
            ? '寄售订单平台代交付完成，等待平台核验'
            : '寄售订单平台代交付完成，进入买家验机'
        }
      });

      return {
        ok: true,
        nextStatus,
        message: '寄售订单平台代交付已完成'
      };
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

      let nextStatus: OrderStatus = order.status;
      if (dto.result === VerifyResult.PASS) {
        nextStatus = OrderStatus.BUYER_CHECKING;
      } else if (dto.result === VerifyResult.FAIL) {
        nextStatus = OrderStatus.PAID_WAITING_DELIVERY;
      } else {
        nextStatus = OrderStatus.VERIFYING;
      }

      await tx.verifyRecord.create({
        data: {
          orderId,
          verifierId: adminId,
          result: dto.result,
          checklist: dto.checklist as any
        }
      });

      await tx.order.update({
        where: { id: orderId },
        data: {
          status: nextStatus
        }
      });

      await tx.orderLog.create({
        data: {
          orderId,
          action: 'VERIFY',
          actorType: 'ADMIN',
          actorId: adminId,
          remark: `result=${dto.result}`
        }
      });

      return { ok: true, nextStatus };
    });
  }

  async buyerConfirm(orderId: string, buyerId: string, dto: ConfirmDto) {
    return this.confirmInternal(orderId, 'USER', buyerId, dto.remark, dto.checklist as any);
  }

  async systemConfirm(orderId: string, remark?: string) {
    return this.confirmInternal(orderId, 'SYSTEM', null, remark);
  }

  private async confirmInternal(
    orderId: string,
    actorType: 'USER' | 'SYSTEM',
    actorId: string | null,
    remark?: string,
    checklist?: Record<string, unknown>
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
          amount: this.calcSettlementAmount(order.price, order.fee, order.feePayer),
          fee: order.fee,
          status: SettlementStatus.PENDING
        }
      });

      if (actorType === 'USER' && checklist && Object.keys(checklist).length > 0) {
        await tx.orderLog.create({
          data: {
            orderId,
            action: 'BUYER_CHECKLIST',
            actorType: 'USER',
            actorId: actorId ?? undefined,
            remark: JSON.stringify(checklist)
          }
        });
      }

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

  get requirePlatformVerify() {
    return String(process.env.ORDER_REQUIRE_PLATFORM_VERIFY || 'true') !== 'false';
  }

  get deliveryReminderMinutes() {
    const value = Number(process.env.ORDER_DELIVERY_REMIND_MINUTES || 60);
    return Number.isFinite(value) && value > 0 ? value : 60;
  }

  get deliveryReminderCooldownMinutes() {
    const value = Number(process.env.ORDER_DELIVERY_REMIND_COOLDOWN_MINUTES || 120);
    return Number.isFinite(value) && value > 0 ? value : 120;
  }

  // 创建订单后计算自动确认时间
  calcAutoConfirmAt() {
    return new Date(Date.now() + this.autoConfirmHours * 60 * 60 * 1000);
  }

  async remindSellerDelivery(
    remindMinutes = this.deliveryReminderMinutes,
    cooldownMinutes = this.deliveryReminderCooldownMinutes
  ) {
    const now = Date.now();
    const remindBefore = now - remindMinutes * 60 * 1000;
    const cooldownMs = cooldownMinutes * 60 * 1000;

    const orders = await this.prisma.order.findMany({
      where: {
        status: OrderStatus.PAID_WAITING_DELIVERY,
        payStatus: PayStatus.PAID
      },
      include: {
        payment: {
          select: {
            paidAt: true
          }
        },
        product: {
          select: {
            title: true
          }
        }
      }
    });

    let reminded = 0;
    for (const order of orders) {
      const paidAtMs = order.payment?.paidAt
        ? order.payment.paidAt.getTime()
        : order.updatedAt.getTime();
      if (paidAtMs > remindBefore) continue;

      const lastReminder = await this.prisma.orderLog.findFirst({
        where: {
          orderId: order.id,
          action: 'DELIVERY_REMIND'
        },
        orderBy: {
          createdAt: 'desc'
        },
        select: {
          createdAt: true
        }
      });
      if (lastReminder && now - lastReminder.createdAt.getTime() < cooldownMs) continue;

      await this.noticeService.createSystemNotice({
        userId: order.sellerId,
        type: 'ORDER_DELIVERY_REMIND',
        title: '订单待交付提醒',
        content: `订单 ${order.id.slice(0, 8)} 已支付，请尽快提交交付信息`,
        payload: {
          orderId: order.id,
          productTitle: order.product?.title || '未知商品',
          paidAt: new Date(paidAtMs).toISOString(),
          remindMinutes
        }
      });

      await this.prisma.orderLog.create({
        data: {
          orderId: order.id,
          action: 'DELIVERY_REMIND',
          actorType: 'SYSTEM',
          remark: `已提醒卖家交付，超时 ${remindMinutes} 分钟`
        }
      });
      reminded += 1;
    }

    return { reminded };
  }

  async applyRefund(orderId: string, buyerId: string, dto: RefundDto) {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id: orderId } });
      if (!order) throw new NotFoundException('订单不存在');
      if (order.buyerId !== buyerId) throw new ForbiddenException('无权操作');
      if (
        ![OrderStatus.PAID_WAITING_DELIVERY, OrderStatus.BUYER_CHECKING].includes(
          order.status as any
        )
      ) {
        throw new BadRequestException('当前状态不可申请退款');
      }

      await tx.refund.upsert({
        where: { orderId },
        update: {
          applicantId: buyerId,
          reason: dto.reason,
          amount: order.escrowAmount,
          status: 'PENDING'
        },
        create: {
          orderId,
          applicantId: buyerId,
          reason: dto.reason,
          amount: order.escrowAmount
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
    const existingRefund = await this.prisma.refund.findUnique({ where: { orderId } });
    if (!existingRefund) throw new NotFoundException('退款记录不存在');

    let refundExecutionRemark = '';
    let refundedViaWallet = false;
    let usedChannel: PayChannel = PayChannel.BALANCE;

    if (decision === 'APPROVED') {
      const order = await this.prisma.order.findUnique({
        where: { id: orderId },
        include: {
          payment: {
            select: {
              channel: true
            }
          }
        }
      });
      if (!order) throw new NotFoundException('订单不存在');

      usedChannel = order.payment?.channel ?? order.payChannel;

      if (usedChannel === PayChannel.BALANCE) {
        await this.walletService.refundToBuyer(orderId, {
          memoForNonBalance: '退款入账（余额托管退回）'
        });
        refundedViaWallet = true;
        refundExecutionRemark = '余额托管退款已退回买家钱包';
      } else {
        const channelResult = await this.paymentRefundService.attemptRefund(orderId, {
          reason: remark || '管理员审核通过退款',
          operatorId: adminId
        });

        if (channelResult.supported && channelResult.success) {
          refundExecutionRemark = `原路退款成功（${usedChannel}${channelResult.channelRefundNo ? ` / ${channelResult.channelRefundNo}` : ''}）`;
        } else {
          const fallbackEnabled = this.shouldFallbackWalletOnChannelRefundFailure();
          if (!fallbackEnabled) {
            throw new BadRequestException(
              `原路退款失败：${channelResult.reason || '渠道未返回失败原因'}`
            );
          }
          await this.walletService.refundToBuyer(orderId, {
            memoForNonBalance: `退款入账（${usedChannel} 原路退款失败，退回站内余额）`
          });
          refundedViaWallet = true;
          refundExecutionRemark = `原路退款失败，已退回站内余额（${channelResult.reason || '渠道不支持或失败'}）`;
        }
      }
    }

    return this.prisma.$transaction(async (tx) => {
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
          remark:
            decision === 'APPROVED'
              ? `${decision} ${refundExecutionRemark} ${remark ?? ''}`.trim()
              : `${decision} ${remark ?? ''}`.trim()
        }
      });

      if (decision === 'APPROVED') {
        await tx.order.update({
          where: { id: orderId },
          data: {
            status: OrderStatus.CANCELED,
            payStatus: PayStatus.REFUNDED
          }
        });

        await tx.payment.updateMany({
          where: { orderId },
          data: {
            payStatus: PayStatus.REFUNDED,
            failReason:
              refundedViaWallet && usedChannel !== PayChannel.BALANCE
                ? 'CHANNEL_REFUND_FAILED_FALLBACK_WALLET'
                : null
          }
        });

        this.logger.log(
          `订单 ${orderId} 退款完成 channel=${usedChannel} fallbackWallet=${refundedViaWallet}`
        );
      } else {
        await tx.order.update({
          where: { id: orderId },
          data: {
            status: OrderStatus.BUYER_CHECKING
          }
        });
      }

      const sellerMeta = await tx.order.findUnique({
        where: { id: orderId },
        select: { sellerId: true }
      });
      if (sellerMeta?.sellerId) {
        await this.walletService.refreshSellerProfileMetrics(sellerMeta.sellerId, tx);
      }
    });
  }

  async openDispute(orderId: string, userId: string, dto: DisputeDto) {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id: orderId } });
      if (!order) throw new NotFoundException('订单不存在');
      if (order.buyerId !== userId && order.sellerId !== userId) {
        throw new ForbiddenException('无权操作');
      }
      const initiator = order.sellerId === userId ? 'SELLER' : 'BUYER';

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

  async openDisputeByAdmin(orderId: string, adminId: string, reason: string) {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id: orderId } });
      if (!order) throw new NotFoundException('订单不存在');

      const dispute = await tx.dispute.upsert({
        where: { orderId },
        update: {
          initiator: 'ADMIN',
          status: DisputeStatus.OPEN,
          result: reason,
          resolution: null,
          updatedAt: new Date()
        },
        create: {
          orderId,
          initiator: 'ADMIN',
          status: DisputeStatus.OPEN,
          result: reason
        }
      });

      await tx.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.DISPUTING }
      });

      await tx.orderLog.create({
        data: {
          orderId,
          action: 'DISPUTE_OPEN_ADMIN',
          actorType: 'ADMIN',
          actorId: adminId,
          remark: reason
        }
      });

      return { message: '订单已转入纠纷流程', dispute };
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

  async listRefunds(query: { status?: string; page?: number; pageSize?: number }) {
    const { status, page = 1, pageSize = 20 } = query;
    const where = status ? { status: status as RefundStatus } : undefined;
    const [total, list] = await this.prisma.$transaction([
      this.prisma.refund.count({ where }),
      this.prisma.refund.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize
      })
    ]);
    return { total, list, page, pageSize };
  }

  async listDisputes(query: { status?: string; page?: number; pageSize?: number }) {
    const { status, page = 1, pageSize = 20 } = query;
    const where = status ? { status: status as DisputeStatus } : undefined;
    const [total, list] = await this.prisma.$transaction([
      this.prisma.dispute.count({ where }),
      this.prisma.dispute.findMany({
        where,
        include: { evidences: true },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize
      })
    ]);
    return { total, list, page, pageSize };
  }

  async resolveDispute(
    orderId: string,
    status: DisputeStatus,
    action: 'REFUND' | 'RELEASE',
    result?: string,
    resolution?: string
  ) {
    return this.prisma.$transaction(async (tx) => {
      const dispute = await tx.dispute.findUnique({ where: { orderId } });
      if (!dispute) throw new NotFoundException('纠纷不存在');
      const order = await tx.order.findUnique({ where: { id: orderId } });
      if (!order) throw new NotFoundException('订单不存在');

      if (status !== DisputeStatus.RESOLVED && status !== DisputeStatus.REJECTED) {
        throw new BadRequestException('状态仅支持 RESOLVED/REJECTED');
      }

      await tx.dispute.update({
        where: { orderId },
        data: { status, result, resolution, updatedAt: new Date() }
      });

      // 仲裁动作：退款或放款
      if (status === DisputeStatus.RESOLVED) {
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
              amount: this.calcSettlementAmount(order.price, order.fee, order.feePayer),
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

      await this.walletService.refreshSellerProfileMetrics(order.sellerId, tx);

      this.logger.log(`纠纷裁决 order=${orderId} status=${status}`);
    });
  }

  /** 买家主动取消（仅待支付订单可取消） */
  async cancelOrder(orderId: string, buyerId: string) {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id: orderId } });
      if (!order) throw new NotFoundException('订单不存在');
      if (order.buyerId !== buyerId) throw new ForbiddenException('无权操作');
      if (order.status !== OrderStatus.PENDING_PAYMENT) {
        throw new BadRequestException('当前状态不可取消');
      }
      await tx.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.CANCELED }
      });
      await tx.orderLog.create({
        data: {
          orderId,
          action: 'USER_CANCEL',
          actorType: 'USER',
          actorId: buyerId,
          remark: '买家主动取消'
        }
      });
      return { message: '订单已取消' };
    });
  }

  /** 管理员强制完成（可跳过验机流程） */
  async forceComplete(orderId: string, adminId: string, remark?: string) {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id: orderId } });
      if (!order) throw new NotFoundException('订单不存在');
      if ([OrderStatus.COMPLETED, OrderStatus.COMPLETED_PENDING_SETTLEMENT, OrderStatus.CANCELED].includes(order.status as any)) {
        throw new BadRequestException('订单已终态，无法操作');
      }

      await tx.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.COMPLETED_PENDING_SETTLEMENT }
      });

      await tx.settlement.upsert({
        where: { orderId },
        update: {},
        create: {
          orderId,
          sellerId: order.sellerId,
          amount: this.calcSettlementAmount(order.price, order.fee, order.feePayer),
          fee: order.fee,
          status: SettlementStatus.PENDING
        }
      });

      await tx.orderLog.create({
        data: {
          orderId,
          action: 'ADMIN_FORCE_COMPLETE',
          actorType: 'ADMIN',
          actorId: adminId,
          remark: remark || '管理员强制完成'
        }
      });

      return { message: '订单已强制完成' };
    });
  }

  async reviewOrderRisk(orderId: string, adminId: string, input: { approved: boolean; remark?: string }) {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        select: {
          id: true,
          status: true,
          payStatus: true,
          riskReviewRequired: true,
          riskReviewPassed: true
        }
      });

      if (!order) {
        throw new NotFoundException('订单不存在');
      }
      if (!order.riskReviewRequired) {
        throw new BadRequestException('该订单无需风控审核');
      }
      if (order.riskReviewPassed === true) {
        return {
          ok: true,
          message: '该订单已通过风控审核',
          nextStatus: order.status
        };
      }
      if (order.payStatus === PayStatus.PAID) {
        throw new BadRequestException('订单已支付，无法再次执行风控审核');
      }

      const nextStatus = input.approved
        ? order.status === OrderStatus.CANCELED
          ? OrderStatus.PENDING_PAYMENT
          : order.status
        : OrderStatus.CANCELED;
      const nextRiskPassed = input.approved;
      const action = input.approved ? 'RISK_REVIEW_PASS' : 'RISK_REVIEW_REJECT';

      await tx.order.update({
        where: { id: orderId },
        data: {
          status: nextStatus,
          riskReviewPassed: nextRiskPassed,
          riskReviewedAt: new Date(),
          riskReviewedBy: adminId,
          riskReviewRemark: input.remark?.trim() || null
        }
      });

      await tx.orderLog.create({
        data: {
          orderId,
          action,
          actorType: 'ADMIN',
          actorId: adminId,
          remark: input.remark?.trim() || undefined
        }
      });

      return {
        ok: true,
        message: input.approved ? '风控审核通过，订单可继续支付' : '风控审核拒绝，订单已关闭',
        nextStatus
      };
    });
  }

  async orderTimeline(orderId: string) {
    return this.prisma.orderLog.findMany({
      where: { orderId },
      orderBy: { createdAt: 'asc' }
    });
  }

  async getOrderReview(orderId: string, userId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        buyerId: true,
        sellerId: true
      }
    });
    if (!order) throw new NotFoundException('订单不存在');
    if (order.buyerId !== userId && order.sellerId !== userId) {
      throw new ForbiddenException('无权查看该订单评价');
    }
    return this.prisma.orderReview.findUnique({
      where: { orderId },
      include: {
        buyer: {
          select: {
            id: true,
            email: true
          }
        },
        seller: {
          select: {
            id: true,
            email: true
          }
        }
      }
    });
  }

  async submitOrderReview(orderId: string, buyerId: string, dto: CreateOrderReviewDto) {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        select: {
          id: true,
          buyerId: true,
          sellerId: true,
          status: true
        }
      });
      if (!order) throw new NotFoundException('订单不存在');
      if (order.buyerId !== buyerId) {
        throw new ForbiddenException('仅买家可提交评价');
      }
      if (
        order.status !== OrderStatus.COMPLETED &&
        order.status !== OrderStatus.COMPLETED_PENDING_SETTLEMENT
      ) {
        throw new BadRequestException('订单未完成，暂不可评价');
      }

      const exists = await tx.orderReview.findUnique({ where: { orderId } });
      if (exists) {
        throw new BadRequestException('该订单已评价，不可重复提交');
      }

      const review = await tx.orderReview.create({
        data: {
          orderId,
          buyerId,
          sellerId: order.sellerId,
          rating: dto.rating,
          content: dto.content?.trim() || null,
          tags: dto.tags ?? []
        }
      });

      await tx.orderLog.create({
        data: {
          orderId,
          action: 'ORDER_REVIEW',
          actorType: 'USER',
          actorId: buyerId,
          remark: `rating=${dto.rating}`
        }
      });

      await this.walletService.refreshSellerProfileMetrics(order.sellerId, tx);

      return {
        message: '评价提交成功',
        review
      };
    });
  }

  async listForAdmin(query: AdminOrderQueryDto) {
    const { page = 1, pageSize = 20, status } = query;
    const where = status ? { status } : undefined;
    const [total, list] = await this.prisma.$transaction([
      this.prisma.order.count({ where }),
      this.prisma.order.findMany({
        where,
        include: {
          product: {
            select: { id: true, title: true, code: true, consignment: true }
          },
          buyer: {
            select: { id: true, email: true }
          },
          seller: {
            select: { id: true, email: true }
          },
          payment: true,
          verifyRecords: {
            orderBy: { createdAt: 'desc' },
            take: 1
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize
      })
    ]);
    return { total, list, page, pageSize };
  }
}
