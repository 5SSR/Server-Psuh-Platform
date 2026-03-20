import { createHmac } from 'crypto';

import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import {
  PayChannel,
  PayStatus,
  Prisma,
  OrderStatus,
  ReconcileTaskStatus
} from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { PayOrderDto } from '../order/dto/pay-order.dto';
import { OrderService } from '../order/order.service';

import { QueryPaymentDto } from './dto/query-payment.dto';
import { ReviewPaymentDto } from './dto/review-payment.dto';
import { UpdateOrderFeeConfigDto } from './dto/update-order-fee-config.dto';

type GatewayMode = 'INTERNAL' | 'MANUAL_REVIEW' | 'MOCK' | 'REMOTE' | 'DISABLED';

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
    if (order.riskReviewRequired && order.riskReviewPassed !== true) {
      throw new BadRequestException('订单待风控审核，暂不可支付');
    }
    if (order.payStatus === PayStatus.PAID) {
      return { alreadyPaid: true, orderId, payStatus: order.payStatus };
    }

    if (dto.channel === PayChannel.BALANCE) {
      return this.orderService.pay(orderId, buyerId, dto);
    }

    const amount = order.escrowAmount ?? order.price.add(order.fee ?? new Prisma.Decimal(0));
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

  async listForAdmin(query: QueryPaymentDto) {
    const { page = 1, pageSize = 20, payStatus, channel, orderId, tradeNo, userId } = query;

    const where: Prisma.PaymentWhereInput = {
      ...(payStatus ? { payStatus } : {}),
      ...(channel ? { channel } : {}),
      ...(orderId ? { orderId } : {}),
      ...(tradeNo
        ? {
            tradeNo: {
              contains: tradeNo
            }
          }
        : {}),
      ...(userId
        ? {
            order: {
              OR: [{ buyerId: userId }, { sellerId: userId }]
            }
          }
        : {})
    };

    const [total, list] = await this.prisma.$transaction([
      this.prisma.payment.count({ where }),
      this.prisma.payment.findMany({
        where,
        include: {
          order: {
            select: {
              id: true,
              status: true,
              payStatus: true,
              payChannel: true,
              price: true,
              fee: true,
              feePayer: true,
              buyer: {
                select: { id: true, email: true }
              },
              seller: {
                select: { id: true, email: true }
              },
              product: {
                select: { id: true, title: true, code: true }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize
      })
    ]);

    return { total, list, page, pageSize };
  }

  async reviewPayment(orderId: string, adminId: string, dto: ReviewPaymentDto) {
    const payment = await this.prisma.payment.findUnique({
      where: { orderId },
      select: {
        id: true,
        orderId: true,
        notifyPayload: true
      }
    });
    if (!payment) throw new NotFoundException('支付记录不存在');

    const payload = this.asPayloadObject(payment.notifyPayload);
    const previousReview = this.asPayloadObject(payload['adminReview'] as any);
    const review = {
      ...previousReview,
      status: dto.status,
      remark: dto.remark?.trim() || null,
      reviewedBy: adminId,
      reviewedAt: new Date().toISOString()
    };

    const updated = await this.prisma.$transaction(async (tx) => {
      const nextPayment = await tx.payment.update({
        where: { orderId },
        data: {
          notifyPayload: {
            ...payload,
            adminReview: review
          } as any
        }
      });

      await tx.orderLog.create({
        data: {
          orderId,
          action: 'PAYMENT_REVIEW',
          actorType: 'ADMIN',
          actorId: adminId,
          remark: dto.remark
            ? `支付排查：${dto.status} / ${dto.remark}`
            : `支付排查：${dto.status}`
        }
      });

      return nextPayment;
    });

    return {
      message: '支付排查结果已保存',
      payment: updated
    };
  }

  async getOrderFeeConfig() {
    const envConfig = this.getEnvOrderFeeConfig();
    const config = await this.prisma.feeConfig.findUnique({
      where: { scene: 'ORDER' }
    });

    if (!config) {
      return {
        source: 'ENV',
        ...envConfig
      };
    }

    return {
      source: 'DB',
      mode: config.mode,
      payer: config.payer || envConfig.payer,
      fixedFee:
        config.fixedFee !== null && config.fixedFee !== undefined
          ? Number(config.fixedFee)
          : envConfig.fixedFee,
      rate:
        config.rate !== null && config.rate !== undefined
          ? Number(config.rate)
          : envConfig.rate,
      minFee:
        config.minFee !== null && config.minFee !== undefined
          ? Number(config.minFee)
          : envConfig.minFee,
      tiers: this.normalizeFeeTiers(config.tiers, envConfig.tiers),
      remark: config.remark || '',
      updatedBy: config.updatedBy || null,
      updatedAt: config.updatedAt
    };
  }

  async updateOrderFeeConfig(adminId: string, dto: UpdateOrderFeeConfigDto) {
    const normalizedTiers = this.normalizeFeeTiers(dto.tiers, []);
    if (dto.mode === 'TIER' && normalizedTiers.length === 0) {
      throw new BadRequestException('阶梯模式必须提供 tiers 配置');
    }
    if (dto.mode === 'RATE' && (dto.rate === undefined || dto.rate === null)) {
      throw new BadRequestException('比例模式必须提供 rate');
    }
    if (dto.mode === 'FIXED' && (dto.fixedFee === undefined || dto.fixedFee === null)) {
      throw new BadRequestException('固定模式必须提供 fixedFee');
    }

    const saved = await this.prisma.feeConfig.upsert({
      where: { scene: 'ORDER' },
      create: {
        scene: 'ORDER',
        mode: dto.mode,
        payer: dto.payer,
        fixedFee:
          dto.fixedFee !== undefined ? new Prisma.Decimal(Number(dto.fixedFee)) : null,
        rate: dto.rate !== undefined ? new Prisma.Decimal(Number(dto.rate)) : null,
        minFee:
          dto.minFee !== undefined ? new Prisma.Decimal(Number(dto.minFee)) : null,
        tiers: dto.mode === 'TIER' ? (normalizedTiers as any) : null,
        remark: dto.remark?.trim() || null,
        updatedBy: adminId
      },
      update: {
        mode: dto.mode,
        payer: dto.payer,
        fixedFee:
          dto.fixedFee !== undefined ? new Prisma.Decimal(Number(dto.fixedFee)) : null,
        rate: dto.rate !== undefined ? new Prisma.Decimal(Number(dto.rate)) : null,
        minFee:
          dto.minFee !== undefined ? new Prisma.Decimal(Number(dto.minFee)) : null,
        tiers: dto.mode === 'TIER' ? (normalizedTiers as any) : null,
        remark: dto.remark?.trim() || null,
        updatedBy: adminId
      }
    });

    return {
      message: '订单手续费配置已更新',
      data: {
        mode: saved.mode,
        payer: saved.payer,
        fixedFee: saved.fixedFee ? Number(saved.fixedFee) : null,
        rate: saved.rate ? Number(saved.rate) : null,
        minFee: saved.minFee ? Number(saved.minFee) : null,
        tiers: this.normalizeFeeTiers(saved.tiers, []),
        remark: saved.remark || '',
        updatedBy: saved.updatedBy || null,
        updatedAt: saved.updatedAt
      }
    };
  }

  async getPaymentIntegrations() {
    const channels = [
      PayChannel.BALANCE,
      PayChannel.ALIPAY,
      PayChannel.WECHAT,
      PayChannel.USDT,
      PayChannel.MANUAL
    ];
    const externalChannels = [PayChannel.ALIPAY, PayChannel.WECHAT, PayChannel.USDT];
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [paidStats, taskList] = await Promise.all([
      this.prisma.payment.groupBy({
        by: ['channel'],
        where: {
          payStatus: PayStatus.PAID,
          createdAt: { gte: since }
        },
        _count: { channel: true },
        _max: { paidAt: true }
      }),
      this.prisma.reconcileTask.findMany({
        where: {
          channel: { in: externalChannels }
        },
        orderBy: { createdAt: 'desc' },
        take: 60,
        select: {
          id: true,
          channel: true,
          status: true,
          summary: true,
          error: true,
          startedAt: true,
          finishedAt: true,
          createdAt: true
        }
      })
    ]);

    const paidMap = new Map<
      PayChannel,
      {
        paidCount24h: number;
        lastPaidAt: Date | null;
      }
    >();
    for (const item of paidStats) {
      paidMap.set(item.channel, {
        paidCount24h: item._count.channel ?? 0,
        lastPaidAt: item._max.paidAt ?? null
      });
    }

    const taskMap = new Map<PayChannel, (typeof taskList)[number]>();
    for (const item of taskList) {
      if (!taskMap.has(item.channel)) {
        taskMap.set(item.channel, item);
      }
    }

    return {
      generatedAt: new Date().toISOString(),
      channels: channels.map((channel) => {
        const mode = this.resolveGatewayMode(channel);
        const secretConfigured = this.resolveSecret(channel).trim().length > 0;
        const reconcileEndpoint = this.getReconcileEndpoint(channel);
        const reconcileToken = this.getReconcileToken(channel);
        const paid = paidMap.get(channel);
        const lastTask = taskMap.get(channel);

        const warnings: string[] = [];
        if (mode === 'REMOTE' && !secretConfigured && channel !== PayChannel.BALANCE) {
          warnings.push('回调验签密钥未配置，无法安全验签');
        }
        if (channel !== PayChannel.BALANCE && channel !== PayChannel.MANUAL) {
          if (mode === 'REMOTE' && !reconcileEndpoint) {
            warnings.push('对账接口未配置，无法执行渠道对账');
          }
          if (reconcileEndpoint && !reconcileToken) {
            warnings.push('对账接口 Token 未配置，可能被拒绝访问');
          }
        }
        if (mode === 'DISABLED' && (paid?.paidCount24h || 0) > 0) {
          warnings.push('渠道标记为禁用，但 24 小时内仍有支付流水');
        }

        const summaryRecord = this.asPayloadObject(lastTask?.summary as any);
        const diffCountRaw = summaryRecord['diffCount'];
        const diffCount = Number(diffCountRaw);

        return {
          channel,
          mode,
          enabled: mode !== 'DISABLED',
          payEntryBase: this.payEntryBase,
          webhook: {
            path: `${this.webhookBase}/${channel.toLowerCase()}`,
            secretConfigured,
            enabled:
              channel !== PayChannel.BALANCE && channel !== PayChannel.MANUAL && mode !== 'DISABLED'
          },
          reconcile: {
            endpointConfigured: Boolean(reconcileEndpoint),
            tokenConfigured: Boolean(reconcileToken),
            lastTask: lastTask
              ? {
                  id: lastTask.id,
                  status: lastTask.status,
                  diffCount: Number.isFinite(diffCount) ? diffCount : null,
                  error: lastTask.error,
                  startedAt: lastTask.startedAt,
                  finishedAt: lastTask.finishedAt,
                  createdAt: lastTask.createdAt
                }
              : null
          },
          metrics24h: {
            paidCount: paid?.paidCount24h || 0,
            lastPaidAt: paid?.lastPaidAt || null
          },
          warnings
        };
      })
    };
  }

  async getPaymentDiagnosticsReport() {
    const now = new Date();
    const since24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const since7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [integrations, unpaidCount24h, runningReconcileCount, recentPayments] =
      await Promise.all([
        this.getPaymentIntegrations(),
        this.prisma.payment.count({
          where: {
            createdAt: { gte: since24h },
            payStatus: PayStatus.UNPAID
          }
        }),
        this.prisma.reconcileTask.count({
          where: {
            status: {
              in: [ReconcileTaskStatus.PENDING, ReconcileTaskStatus.RUNNING]
            }
          }
        }),
        this.prisma.payment.findMany({
          where: {
            createdAt: { gte: since7d }
          },
          orderBy: { createdAt: 'desc' },
          take: 200,
          select: {
            id: true,
            orderId: true,
            channel: true,
            amount: true,
            payStatus: true,
            tradeNo: true,
            createdAt: true,
            paidAt: true,
            notifyPayload: true,
            order: {
              select: {
                buyerId: true,
                sellerId: true,
                status: true
              }
            }
          }
        })
      ]);

    const riskyPayments = recentPayments
      .map((item) => {
        const payload = this.asPayloadObject(item.notifyPayload as any);
        const review = this.asPayloadObject(payload['adminReview'] as any);
        const status = String(review['status'] || '').toUpperCase();
        if (status !== 'SUSPICIOUS' && status !== 'FRAUD') return null;
        return {
          id: item.id,
          orderId: item.orderId,
          channel: item.channel,
          amount: Number(item.amount),
          payStatus: item.payStatus,
          tradeNo: item.tradeNo,
          createdAt: item.createdAt,
          paidAt: item.paidAt,
          orderStatus: item.order?.status || null,
          buyerId: item.order?.buyerId || null,
          sellerId: item.order?.sellerId || null,
          reviewStatus: status,
          reviewRemark: typeof review['remark'] === 'string' ? review['remark'] : null,
          reviewedAt:
            typeof review['reviewedAt'] === 'string' ? (review['reviewedAt'] as string) : null,
          reviewedBy:
            typeof review['reviewedBy'] === 'string' ? (review['reviewedBy'] as string) : null
        };
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item));

    const suspiciousCount = riskyPayments.filter(
      (item) => item.reviewStatus === 'SUSPICIOUS'
    ).length;
    const fraudCount = riskyPayments.filter((item) => item.reviewStatus === 'FRAUD').length;

    return {
      generatedAt: now.toISOString(),
      window: {
        last24h: since24h.toISOString(),
        last7d: since7d.toISOString()
      },
      summary: {
        totalChannels: integrations.channels.length,
        enabledChannels: integrations.channels.filter((item) => item.enabled).length,
        remoteChannels: integrations.channels.filter((item) => item.mode === 'REMOTE').length,
        warningChannels: integrations.channels.filter((item) => item.warnings?.length).length,
        unpaidCount24h,
        runningReconcileCount,
        suspiciousCount7d: suspiciousCount,
        fraudCount7d: fraudCount
      },
      channelStatus: integrations.channels,
      highRiskPayments: riskyPayments.slice(0, 60)
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
        fee: Number(order.fee),
        feePayer: order.feePayer
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
    const amount = Number(order.payment?.amount ?? order.escrowAmount ?? order.price);
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
      case PayChannel.USDT:
        return process.env.PAY_WEBHOOK_SECRET_USDT || '';
      default:
        return process.env.PAY_WEBHOOK_SECRET_MANUAL || '';
    }
  }

  private resolveGatewayMode(channel: PayChannel): GatewayMode {
    if (channel === PayChannel.BALANCE) return 'INTERNAL';
    if (channel === PayChannel.MANUAL) return 'MANUAL_REVIEW';
    const value = String(process.env[`PAY_GATEWAY_${channel}_MODE`] || 'MOCK').toUpperCase();
    if (value === 'DISABLED') return 'DISABLED';
    if (value === 'REMOTE') return 'REMOTE';
    return 'MOCK';
  }

  private getReconcileEndpoint(channel: PayChannel) {
    if (channel === PayChannel.ALIPAY) return process.env.ALIPAY_RECONCILE_API || '';
    if (channel === PayChannel.WECHAT) return process.env.WECHAT_RECONCILE_API || '';
    if (channel === PayChannel.USDT) return process.env.USDT_RECONCILE_API || '';
    return '';
  }

  private getReconcileToken(channel: PayChannel) {
    if (channel === PayChannel.ALIPAY) return process.env.ALIPAY_RECONCILE_TOKEN || '';
    if (channel === PayChannel.WECHAT) return process.env.WECHAT_RECONCILE_TOKEN || '';
    if (channel === PayChannel.USDT) return process.env.USDT_RECONCILE_TOKEN || '';
    return '';
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

  private asPayloadObject(input: Prisma.JsonValue | null | undefined) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) return {};
    return { ...(input as Record<string, unknown>) };
  }

  private getEnvOrderFeeConfig() {
    const mode = String(process.env.ORDER_FEE_MODE || 'RATE').toUpperCase();
    const payer = String(process.env.ORDER_FEE_PAYER || 'SELLER').toUpperCase();
    const fixedFee = Number(process.env.ORDER_FEE_FIXED ?? 1);
    const rate = Number(process.env.ORDER_FEE_RATE ?? 0.015);
    const minFee = Number(process.env.ORDER_FEE_MIN ?? 0);
    let tiers = [
      { upTo: 200, rate: 0.03 },
      { upTo: 1000, rate: 0.02 },
      { upTo: null, rate: 0.015 }
    ] as Array<{ upTo: number | null; rate: number }>;
    try {
      if (process.env.ORDER_FEE_TIERS_JSON) {
        const parsed = JSON.parse(process.env.ORDER_FEE_TIERS_JSON);
        tiers = this.normalizeFeeTiers(parsed, tiers);
      }
    } catch {
      // ignore
    }
    return {
      mode: ['FIXED', 'RATE', 'TIER'].includes(mode) ? mode : 'RATE',
      payer: ['BUYER', 'SELLER', 'SHARED'].includes(payer) ? payer : 'SELLER',
      fixedFee: Number.isFinite(fixedFee) ? fixedFee : 1,
      rate: Number.isFinite(rate) ? rate : 0.015,
      minFee: Number.isFinite(minFee) ? minFee : 0,
      tiers
    };
  }

  private normalizeFeeTiers(
    input: unknown,
    fallback: Array<{ upTo: number | null; rate: number }>
  ) {
    if (!Array.isArray(input) || input.length === 0) return fallback;
    const list = input
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
    return list.length > 0 ? list : fallback;
  }
}
