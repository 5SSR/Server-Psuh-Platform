import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException
} from '@nestjs/common';
import { BargainActor, BargainStatus, Prisma, ProductStatus } from '@prisma/client';

import { NoticeService } from '../notice/notice.service';
import { OrderService } from '../order/order.service';
import { PrismaService } from '../prisma/prisma.service';

import { ActBargainDto, BargainAction } from './dto/act-bargain.dto';
import { AdminBatchReviewBargainDto } from './dto/admin-batch-review-bargain.dto';
import { AdminQueryBargainDto } from './dto/admin-query-bargain.dto';
import {
  AdminBargainAction,
  AdminReviewBargainDto
} from './dto/admin-review-bargain.dto';
import { CreateBargainDto } from './dto/create-bargain.dto';
import { QueryBargainDto } from './dto/query-bargain.dto';

@Injectable()
export class BargainService {
  private readonly logger = new Logger(BargainService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly noticeService: NoticeService,
    private readonly orderService: OrderService
  ) {}

  private getExpectedActor(status: BargainStatus) {
    if (status === BargainStatus.WAIT_SELLER) return BargainActor.SELLER;
    if (status === BargainStatus.WAIT_BUYER) return BargainActor.BUYER;
    return null;
  }

  private getMyActor(buyerId: string, sellerId: string, userId: string) {
    if (userId === buyerId) return BargainActor.BUYER;
    if (userId === sellerId) return BargainActor.SELLER;
    return null;
  }

  private normalizeRemark(remark?: string | null) {
    const value = remark?.trim();
    return value ? value.slice(0, 500) : null;
  }

  private isFinalStatus(status: BargainStatus) {
    return (
      status === BargainStatus.ACCEPTED ||
      status === BargainStatus.REJECTED ||
      status === BargainStatus.CANCELED
    );
  }

  private async sendSystemNotice(input: {
    userId: string;
    type: string;
    title: string;
    content: string;
    payload?: Record<string, unknown>;
  }) {
    try {
      await this.noticeService.createSystemNotice(input);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      this.logger.warn(`发送通知失败 type=${input.type} userId=${input.userId}: ${reason}`);
    }
  }

  private getRiskSnapshot(input: {
    status: BargainStatus;
    round: number;
    currentPrice: Prisma.Decimal | number | string;
    salePrice: Prisma.Decimal | number | string;
    createdAt: Date;
    updatedAt: Date;
  }) {
    const reasons: string[] = [];
    const salePrice = Number(input.salePrice || 0);
    const currentPrice = Number(input.currentPrice || 0);
    const ageHours = Math.max(
      0,
      Math.floor((Date.now() - new Date(input.createdAt).getTime()) / 3600000)
    );
    const driftRate =
      salePrice > 0 ? Math.abs(currentPrice - salePrice) / salePrice : 0;

    if (input.round >= 6) {
      reasons.push('议价轮次偏高');
    }
    if (
      (input.status === BargainStatus.WAIT_BUYER || input.status === BargainStatus.WAIT_SELLER) &&
      ageHours >= 48
    ) {
      reasons.push('会话长时间未收敛');
    }
    if (driftRate >= 0.4) {
      reasons.push('议价幅度偏大');
    }

    const level =
      reasons.length >= 2 ? 'HIGH' : reasons.length === 1 ? 'MEDIUM' : 'LOW';

    return {
      level,
      reasons,
      ageHours,
      driftRate: Number(driftRate.toFixed(4)),
      lastUpdatedAt: input.updatedAt
    };
  }

  async start(buyerId: string, dto: CreateBargainDto) {
    const product = await this.prisma.product.findUnique({
      where: {
        id: dto.productId,
        status: ProductStatus.ONLINE
      },
      select: {
        id: true,
        code: true,
        title: true,
        sellerId: true,
        salePrice: true,
        negotiable: true
      }
    });

    if (!product) {
      throw new NotFoundException('商品不存在或未上架');
    }
    if (product.sellerId === buyerId) {
      throw new ForbiddenException('不能对自己的商品发起议价');
    }
    if (!product.negotiable) {
      throw new BadRequestException('该商品未开启议价');
    }

    const active = await this.prisma.bargain.findFirst({
      where: {
        productId: product.id,
        buyerId,
        orderId: null,
        status: {
          in: [BargainStatus.WAIT_BUYER, BargainStatus.WAIT_SELLER]
        }
      },
      orderBy: { updatedAt: 'desc' },
      include: {
        product: {
          select: {
            id: true,
            title: true,
            code: true,
            salePrice: true,
            region: true,
            lineType: true,
            status: true
          }
        }
      }
    });

    if (active) {
      return {
        message: '已存在进行中的议价单，请在议价中心继续沟通',
        reused: true,
        bargain: active
      };
    }

    const offerPrice = new Prisma.Decimal(dto.offerPrice);

    const bargain = await this.prisma.$transaction(async (tx) => {
      const created = await tx.bargain.create({
        data: {
          productId: product.id,
          buyerId,
          sellerId: product.sellerId,
          status: BargainStatus.WAIT_SELLER,
          lastActor: BargainActor.BUYER,
          round: 1,
          currentPrice: offerPrice,
          buyerLastPrice: offerPrice,
          sellerLastPrice: null,
          remark: this.normalizeRemark(dto.remark)
        }
      });

      await tx.bargainLog.create({
        data: {
          bargainId: created.id,
          action: 'START',
          actor: BargainActor.BUYER,
          actorId: buyerId,
          price: offerPrice,
          remark: this.normalizeRemark(dto.remark)
        }
      });

      return tx.bargain.findUnique({
        where: { id: created.id },
        include: {
          product: {
            select: {
              id: true,
              title: true,
              code: true,
              salePrice: true,
              region: true,
              lineType: true,
              status: true
            }
          }
        }
      });
    });

    if (!bargain) {
      throw new BadRequestException('创建议价失败，请重试');
    }

    await this.sendSystemNotice({
      userId: product.sellerId,
      type: 'BARGAIN_NEW',
      title: '收到新的议价请求',
      content: `商品「${product.title}」收到新的议价请求，请及时处理。`,
      payload: {
        bargainId: bargain.id,
        productId: product.id,
        buyerId,
        offerPrice: String(offerPrice)
      }
    });

    return {
      message: '议价请求已发起',
      reused: false,
      bargain
    };
  }

  async listMine(userId: string, query: QueryBargainDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const as = query.as === 'seller' ? 'seller' : 'buyer';

    const where: Prisma.BargainWhereInput = {
      ...(as === 'buyer' ? { buyerId: userId } : { sellerId: userId }),
      ...(query.status ? { status: query.status } : {})
    };

    const [total, list] = await this.prisma.$transaction([
      this.prisma.bargain.count({ where }),
      this.prisma.bargain.findMany({
        where,
        include: {
          product: {
            select: {
              id: true,
              title: true,
              code: true,
              salePrice: true,
              region: true,
              lineType: true,
              status: true,
              negotiable: true
            }
          },
          buyer: {
            select: {
              id: true,
              email: true,
              sellerProfile: {
                select: {
                  level: true,
                  tradeCount: true,
                  positiveRate: true,
                  disputeRate: true
                }
              }
            }
          },
          seller: {
            select: {
              id: true,
              email: true,
              sellerProfile: {
                select: {
                  level: true,
                  tradeCount: true,
                  positiveRate: true,
                  disputeRate: true
                }
              }
            }
          },
          order: {
            select: {
              id: true,
              status: true,
              payStatus: true,
              createdAt: true
            }
          },
          _count: {
            select: {
              logs: true
            }
          }
        },
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize
      })
    ]);

    return { total, list, page, pageSize, as };
  }

  async listForAdmin(query: AdminQueryBargainDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const keyword = query.keyword?.trim();
    const andWhere: Prisma.BargainWhereInput[] = [];

    if (query.userId) {
      andWhere.push({
        OR: [{ buyerId: query.userId }, { sellerId: query.userId }]
      });
    }

    if (keyword) {
      andWhere.push({
        OR: [
          { id: { contains: keyword } },
          { product: { title: { contains: keyword } } },
          { product: { code: { contains: keyword } } },
          { buyer: { email: { contains: keyword } } },
          { seller: { email: { contains: keyword } } }
        ]
      });
    }

    const where: Prisma.BargainWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.productId ? { productId: query.productId } : {}),
      ...(query.hasOrder === undefined
        ? {}
        : query.hasOrder
          ? { orderId: { not: null } }
          : { orderId: null }),
      ...(andWhere.length > 0 ? { AND: andWhere } : {})
    };

    const [total, list] = await this.prisma.$transaction([
      this.prisma.bargain.count({ where }),
      this.prisma.bargain.findMany({
        where,
        include: {
          product: {
            select: {
              id: true,
              title: true,
              code: true,
              status: true,
              salePrice: true,
              region: true,
              lineType: true,
              riskLevel: true
            }
          },
          buyer: {
            select: {
              id: true,
              email: true,
              status: true,
              sellerProfile: {
                select: {
                  level: true,
                  tradeCount: true,
                  positiveRate: true,
                  disputeRate: true
                }
              }
            }
          },
          seller: {
            select: {
              id: true,
              email: true,
              status: true,
              sellerProfile: {
                select: {
                  level: true,
                  tradeCount: true,
                  positiveRate: true,
                  disputeRate: true
                }
              }
            }
          },
          order: {
            select: {
              id: true,
              status: true,
              payStatus: true,
              createdAt: true
            }
          },
          _count: {
            select: { logs: true }
          }
        },
        orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize
      })
    ]);

    return {
      total,
      page,
      pageSize,
      list: list.map((item) => ({
        ...item,
        risk: this.getRiskSnapshot({
          status: item.status,
          round: item.round,
          currentPrice: item.currentPrice,
          salePrice: item.product.salePrice,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt
        })
      }))
    };
  }

  async getDetailForAdmin(bargainId: string) {
    const bargain = await this.prisma.bargain.findUnique({
      where: { id: bargainId },
      include: {
        product: {
          select: {
            id: true,
            title: true,
            code: true,
            status: true,
            salePrice: true,
            region: true,
            lineType: true,
            cpuCores: true,
            memoryGb: true,
            diskGb: true,
            bandwidthMbps: true,
            trafficLimit: true,
            expireAt: true,
            riskLevel: true,
            riskTags: true
          }
        },
        buyer: {
          select: {
            id: true,
            email: true,
            status: true,
            role: true,
            sellerProfile: {
              select: {
                level: true,
                tradeCount: true,
                positiveRate: true,
                disputeRate: true,
                avgDeliveryMinutes: true
              }
            }
          }
        },
        seller: {
          select: {
            id: true,
            email: true,
            status: true,
            role: true,
            sellerProfile: {
              select: {
                level: true,
                tradeCount: true,
                positiveRate: true,
                disputeRate: true,
                avgDeliveryMinutes: true
              }
            }
          }
        },
        order: {
          select: {
            id: true,
            status: true,
            payStatus: true,
            payChannel: true,
            createdAt: true
          }
        },
        logs: {
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    if (!bargain) {
      throw new NotFoundException('议价记录不存在');
    }

    return {
      ...bargain,
      risk: this.getRiskSnapshot({
        status: bargain.status,
        round: bargain.round,
        currentPrice: bargain.currentPrice,
        salePrice: bargain.product.salePrice,
        createdAt: bargain.createdAt,
        updatedAt: bargain.updatedAt
      })
    };
  }

  async reviewByAdmin(adminId: string, bargainId: string, dto: AdminReviewBargainDto) {
    const bargain = await this.prisma.bargain.findUnique({
      where: { id: bargainId },
      select: {
        id: true,
        status: true,
        orderId: true,
        currentPrice: true,
        remark: true,
        buyerId: true,
        sellerId: true,
        lastActor: true,
        product: {
          select: {
            title: true
          }
        }
      }
    });

    if (!bargain) {
      throw new NotFoundException('议价记录不存在');
    }

    if (dto.action === AdminBargainAction.CLOSE) {
      if (this.isFinalStatus(bargain.status)) {
        return { message: '该议价会话已结束，无需重复关闭' };
      }
      if (bargain.orderId) {
        throw new BadRequestException('该议价已生成订单，不可强制关闭');
      }

      const closeRemark = dto.remarkForClose?.trim();
      if (!closeRemark) {
        throw new BadRequestException('关闭议价必须填写处置说明');
      }

      const updated = await this.prisma.$transaction(async (tx) => {
        const result = await tx.bargain.update({
          where: { id: bargainId },
          data: {
            status: BargainStatus.CANCELED,
            remark: `[ADMIN:${adminId}] ${closeRemark}`
          }
        });

        await tx.bargainLog.create({
          data: {
            bargainId,
            action: 'ADMIN_CLOSE',
            actor: bargain.lastActor,
            actorId: adminId,
            price: bargain.currentPrice,
            remark: closeRemark
          }
        });

        return result;
      });

      await Promise.all([
        this.sendSystemNotice({
          userId: bargain.buyerId,
          type: 'BARGAIN_ADMIN_CLOSED',
          title: '议价会话已被平台关闭',
          content: `商品「${bargain.product.title}」议价会话已由平台关闭，请按规范重新发起。`,
          payload: {
            bargainId,
            adminId,
            reason: closeRemark
          }
        }),
        this.sendSystemNotice({
          userId: bargain.sellerId,
          type: 'BARGAIN_ADMIN_CLOSED',
          title: '议价会话已被平台关闭',
          content: `商品「${bargain.product.title}」议价会话已由平台关闭，请按规范重新发起。`,
          payload: {
            bargainId,
            adminId,
            reason: closeRemark
          }
        })
      ]);

      return { message: '议价会话已关闭', bargain: updated };
    }

    if (dto.action === AdminBargainAction.ESCALATE_DISPUTE) {
      const reason = dto.remark?.trim();
      if (!reason) {
        throw new BadRequestException('转纠纷必须填写说明');
      }
      if (!bargain.orderId) {
        throw new BadRequestException('当前议价尚未建单，无法转订单纠纷');
      }

      const dispute = await this.orderService.openDisputeByAdmin(
        bargain.orderId,
        adminId,
        reason
      );

      await this.prisma.bargainLog.create({
        data: {
          bargainId,
          action: 'ADMIN_ESCALATE_DISPUTE',
          actor: bargain.lastActor,
          actorId: adminId,
          price: bargain.currentPrice,
          remark: reason
        }
      });

      await Promise.all([
        this.sendSystemNotice({
          userId: bargain.buyerId,
          type: 'BARGAIN_ADMIN_ESCALATE_DISPUTE',
          title: '议价关联订单已转入纠纷',
          content: `商品「${bargain.product.title}」关联订单已转入平台纠纷流程，请补充证据。`,
          payload: {
            bargainId,
            orderId: bargain.orderId,
            adminId,
            reason
          }
        }),
        this.sendSystemNotice({
          userId: bargain.sellerId,
          type: 'BARGAIN_ADMIN_ESCALATE_DISPUTE',
          title: '议价关联订单已转入纠纷',
          content: `商品「${bargain.product.title}」关联订单已转入平台纠纷流程，请补充证据。`,
          payload: {
            bargainId,
            orderId: bargain.orderId,
            adminId,
            reason
          }
        })
      ]);

      return {
        message: '已将关联订单转入纠纷流程',
        dispute
      };
    }

    const note = dto.remark?.trim();
    if (!note) {
      throw new BadRequestException('请填写备注后再提交');
    }

    const withNote = await this.prisma.$transaction(async (tx) => {
      const result = await tx.bargain.update({
        where: { id: bargainId },
        data: {
          remark: `[ADMIN:${adminId}] ${note}`
        }
      });

      await tx.bargainLog.create({
        data: {
          bargainId,
          action: 'ADMIN_NOTE',
          actor: bargain.lastActor,
          actorId: adminId,
          price: bargain.currentPrice,
          remark: note
        }
      });

      return result;
    });

    return { message: '管理员备注已记录', bargain: withNote };
  }

  async reviewBatchByAdmin(adminId: string, dto: AdminBatchReviewBargainDto) {
    const uniqueIds = Array.from(new Set(dto.ids.map((item) => item.trim()).filter(Boolean)));
    if (!uniqueIds.length) {
      throw new BadRequestException('请至少选择一条会话');
    }

    const success: Array<{ id: string; message: string }> = [];
    const failed: Array<{ id: string; reason: string }> = [];

    for (const id of uniqueIds) {
      try {
        const result = await this.reviewByAdmin(adminId, id, {
          action: dto.action,
          remark: dto.remark,
          remarkForClose: dto.remarkForClose
        });
        success.push({ id, message: result?.message || '处理成功' });
      } catch (error) {
        failed.push({
          id,
          reason: error instanceof Error ? error.message : '未知错误'
        });
      }
    }

    return {
      total: uniqueIds.length,
      successCount: success.length,
      failedCount: failed.length,
      success,
      failed
    };
  }

  get riskReminderHours() {
    const value = Number(process.env.BARGAIN_RISK_REMIND_HOURS || 24);
    return Number.isFinite(value) && value > 0 ? value : 24;
  }

  get riskReminderCooldownHours() {
    const value = Number(process.env.BARGAIN_RISK_REMIND_COOLDOWN_HOURS || 12);
    return Number.isFinite(value) && value > 0 ? value : 12;
  }

  get autoCloseHours() {
    const value = Number(process.env.BARGAIN_AUTO_CLOSE_HOURS || 72);
    return Number.isFinite(value) && value > 0 ? value : 72;
  }

  async remindHighRiskBargains(
    remindHours = this.riskReminderHours,
    cooldownHours = this.riskReminderCooldownHours
  ) {
    const remindBefore = new Date(Date.now() - remindHours * 60 * 60 * 1000);
    const cooldownAfter = new Date(Date.now() - cooldownHours * 60 * 60 * 1000);

    const targets = await this.prisma.bargain.findMany({
      where: {
        status: {
          in: [BargainStatus.WAIT_BUYER, BargainStatus.WAIT_SELLER]
        },
        createdAt: {
          lte: remindBefore
        }
      },
      select: {
        id: true,
        buyerId: true,
        sellerId: true,
        status: true,
        round: true,
        lastActor: true,
        currentPrice: true,
        createdAt: true,
        updatedAt: true,
        product: {
          select: {
            title: true,
            salePrice: true
          }
        }
      }
    });

    let reminded = 0;
    for (const item of targets) {
      const risk = this.getRiskSnapshot({
        status: item.status,
        round: item.round,
        currentPrice: item.currentPrice,
        salePrice: item.product.salePrice,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt
      });

      if (risk.level === 'LOW') {
        continue;
      }

      const lastReminder = await this.prisma.bargainLog.findFirst({
        where: {
          bargainId: item.id,
          action: 'SYSTEM_RISK_REMIND',
          createdAt: {
            gte: cooldownAfter
          }
        },
        orderBy: { createdAt: 'desc' },
        select: { id: true }
      });
      if (lastReminder) {
        continue;
      }

      const reasonText = risk.reasons.join('，') || '长时间未收敛';
      await Promise.all([
        this.sendSystemNotice({
          userId: item.buyerId,
          type: 'BARGAIN_RISK_REMIND',
          title: '议价会话存在风险，请尽快处理',
          content: `商品「${item.product.title}」议价风险：${reasonText}。建议尽快响应或关闭会话。`,
          payload: {
            bargainId: item.id,
            riskLevel: risk.level,
            reasons: risk.reasons
          }
        }),
        this.sendSystemNotice({
          userId: item.sellerId,
          type: 'BARGAIN_RISK_REMIND',
          title: '议价会话存在风险，请尽快处理',
          content: `商品「${item.product.title}」议价风险：${reasonText}。建议尽快响应或关闭会话。`,
          payload: {
            bargainId: item.id,
            riskLevel: risk.level,
            reasons: risk.reasons
          }
        })
      ]);

      await this.prisma.bargainLog.create({
        data: {
          bargainId: item.id,
          action: 'SYSTEM_RISK_REMIND',
          actor: item.lastActor,
          price: item.currentPrice,
          remark: `${risk.level} ${reasonText}`
        }
      });

      reminded += 1;
    }

    return { reminded };
  }

  async autoCloseStaleBargains(closeAfterHours = this.autoCloseHours) {
    const before = new Date(Date.now() - closeAfterHours * 60 * 60 * 1000);
    const targets = await this.prisma.bargain.findMany({
      where: {
        status: {
          in: [BargainStatus.WAIT_BUYER, BargainStatus.WAIT_SELLER]
        },
        orderId: null,
        updatedAt: {
          lte: before
        }
      },
      select: {
        id: true,
        buyerId: true,
        sellerId: true,
        status: true,
        lastActor: true,
        currentPrice: true,
        updatedAt: true,
        product: {
          select: {
            title: true
          }
        }
      }
    });

    let closed = 0;
    for (const item of targets) {
      const lock = await this.prisma.bargain.updateMany({
        where: {
          id: item.id,
          status: item.status,
          orderId: null
        },
        data: {
          status: BargainStatus.CANCELED,
          remark: `[SYSTEM] 会话超过 ${closeAfterHours} 小时未推进，自动关闭`
        }
      });
      if (!lock.count) continue;

      await this.prisma.bargainLog.create({
        data: {
          bargainId: item.id,
          action: 'SYSTEM_AUTO_CLOSE',
          actor: item.lastActor,
          price: item.currentPrice,
          remark: `会话超过 ${closeAfterHours} 小时未推进，系统自动关闭`
        }
      });

      await Promise.all([
        this.sendSystemNotice({
          userId: item.buyerId,
          type: 'BARGAIN_AUTO_CLOSED',
          title: '议价会话已自动关闭',
          content: `商品「${item.product.title}」议价超过 ${closeAfterHours} 小时未推进，已自动关闭。`,
          payload: {
            bargainId: item.id,
            closeAfterHours
          }
        }),
        this.sendSystemNotice({
          userId: item.sellerId,
          type: 'BARGAIN_AUTO_CLOSED',
          title: '议价会话已自动关闭',
          content: `商品「${item.product.title}」议价超过 ${closeAfterHours} 小时未推进，已自动关闭。`,
          payload: {
            bargainId: item.id,
            closeAfterHours
          }
        })
      ]);

      closed += 1;
    }

    return { closed };
  }

  async getDetail(userId: string, bargainId: string) {
    const bargain = await this.prisma.bargain.findUnique({
      where: { id: bargainId },
      include: {
        product: {
          select: {
            id: true,
            title: true,
            code: true,
            salePrice: true,
            region: true,
            lineType: true,
            status: true,
            cpuCores: true,
            memoryGb: true,
            diskGb: true,
            bandwidthMbps: true,
            trafficLimit: true,
            expireAt: true
          }
        },
        buyer: {
          select: {
            id: true,
            email: true,
            sellerProfile: {
              select: {
                level: true,
                tradeCount: true,
                positiveRate: true,
                disputeRate: true,
                avgDeliveryMinutes: true
              }
            }
          }
        },
        seller: {
          select: {
            id: true,
            email: true,
            sellerProfile: {
              select: {
                level: true,
                tradeCount: true,
                positiveRate: true,
                disputeRate: true,
                avgDeliveryMinutes: true
              }
            }
          }
        },
        order: {
          select: {
            id: true,
            status: true,
            payStatus: true,
            createdAt: true
          }
        },
        logs: {
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    if (!bargain) {
      throw new NotFoundException('议价记录不存在');
    }

    const myActor = this.getMyActor(bargain.buyerId, bargain.sellerId, userId);
    if (!myActor) {
      throw new ForbiddenException('无权查看该议价记录');
    }

    const expectedActor = this.getExpectedActor(bargain.status);
    const myTurn = Boolean(expectedActor && expectedActor === myActor);
    const allowedActions: BargainAction[] = [];

    if (!this.isFinalStatus(bargain.status)) {
      allowedActions.push(BargainAction.CANCEL);
      if (myTurn) {
        allowedActions.push(BargainAction.COUNTER, BargainAction.ACCEPT, BargainAction.REJECT);
      }
    }

    return {
      ...bargain,
      myActor,
      expectedActor,
      myTurn,
      allowedActions
    };
  }

  async act(userId: string, bargainId: string, dto: ActBargainDto) {
    const bargain = await this.prisma.bargain.findUnique({
      where: { id: bargainId },
      select: {
        id: true,
        productId: true,
        buyerId: true,
        sellerId: true,
        status: true,
        orderId: true,
        currentPrice: true,
        round: true,
        remark: true,
        product: {
          select: {
            title: true,
            status: true
          }
        }
      }
    });

    if (!bargain) {
      throw new NotFoundException('议价记录不存在');
    }

    const myActor = this.getMyActor(bargain.buyerId, bargain.sellerId, userId);
    if (!myActor) {
      throw new ForbiddenException('无权操作该议价记录');
    }

    const peerUserId = myActor === BargainActor.BUYER ? bargain.sellerId : bargain.buyerId;
    const expectedActor = this.getExpectedActor(bargain.status);

    if (dto.action === BargainAction.CANCEL) {
      if (this.isFinalStatus(bargain.status)) {
        return { message: '该议价记录已结束，无需取消' };
      }

      const cancelled = await this.prisma.$transaction(async (tx) => {
        const updated = await tx.bargain.update({
          where: { id: bargainId },
          data: {
            status: BargainStatus.CANCELED,
            lastActor: myActor,
            remark: this.normalizeRemark(dto.remark) ?? bargain.remark
          }
        });

        await tx.bargainLog.create({
          data: {
            bargainId,
            action: 'CANCEL',
            actor: myActor,
            actorId: userId,
            price: bargain.currentPrice,
            remark: this.normalizeRemark(dto.remark)
          }
        });

        return updated;
      });

      await this.sendSystemNotice({
        userId: peerUserId,
        type: 'BARGAIN_CANCELED',
        title: '议价会话已取消',
        content: `商品「${bargain.product.title}」的议价会话已被取消。`,
        payload: {
          bargainId,
          action: dto.action,
          actor: myActor
        }
      });

      return {
        message: '议价已取消',
        bargain: cancelled
      };
    }

    if (this.isFinalStatus(bargain.status)) {
      throw new BadRequestException('该议价记录已结束，无法继续操作');
    }

    if (!expectedActor || expectedActor !== myActor) {
      throw new BadRequestException('当前不在你的应答轮次，请等待对方处理');
    }

    if (dto.action === BargainAction.COUNTER) {
      const nextPrice = new Prisma.Decimal(dto.price || 0);
      const nextStatus =
        myActor === BargainActor.BUYER ? BargainStatus.WAIT_SELLER : BargainStatus.WAIT_BUYER;

      const updated = await this.prisma.$transaction(async (tx) => {
        const next = await tx.bargain.update({
          where: { id: bargainId },
          data: {
            status: nextStatus,
            lastActor: myActor,
            currentPrice: nextPrice,
            round: {
              increment: 1
            },
            buyerLastPrice:
              myActor === BargainActor.BUYER ? nextPrice : undefined,
            sellerLastPrice:
              myActor === BargainActor.SELLER ? nextPrice : undefined,
            remark: this.normalizeRemark(dto.remark) ?? bargain.remark
          }
        });

        await tx.bargainLog.create({
          data: {
            bargainId,
            action: 'COUNTER',
            actor: myActor,
            actorId: userId,
            price: nextPrice,
            remark: this.normalizeRemark(dto.remark)
          }
        });

        return next;
      });

      await this.sendSystemNotice({
        userId: peerUserId,
        type: 'BARGAIN_COUNTER',
        title: '收到新的还价',
        content: `商品「${bargain.product.title}」收到新的还价，请及时处理。`,
        payload: {
          bargainId,
          action: dto.action,
          actor: myActor,
          currentPrice: String(nextPrice)
        }
      });

      return {
        message: '还价已提交',
        bargain: updated
      };
    }

    if (dto.action === BargainAction.REJECT) {
      const rejected = await this.prisma.$transaction(async (tx) => {
        const updated = await tx.bargain.update({
          where: { id: bargainId },
          data: {
            status: BargainStatus.REJECTED,
            lastActor: myActor,
            remark: this.normalizeRemark(dto.remark) ?? bargain.remark
          }
        });

        await tx.bargainLog.create({
          data: {
            bargainId,
            action: 'REJECT',
            actor: myActor,
            actorId: userId,
            price: bargain.currentPrice,
            remark: this.normalizeRemark(dto.remark)
          }
        });

        return updated;
      });

      await this.sendSystemNotice({
        userId: peerUserId,
        type: 'BARGAIN_REJECTED',
        title: '议价请求已被拒绝',
        content: `商品「${bargain.product.title}」的议价请求已被拒绝。`,
        payload: {
          bargainId,
          action: dto.action,
          actor: myActor,
          currentPrice: String(bargain.currentPrice)
        }
      });

      return {
        message: '已拒绝本轮议价',
        bargain: rejected
      };
    }

    if (dto.action !== BargainAction.ACCEPT) {
      throw new BadRequestException('不支持的议价操作');
    }

    const acceptedResult = await this.prisma.$transaction(async (tx) => {
      const current = await tx.bargain.findUnique({
        where: { id: bargainId },
        select: {
          id: true,
          productId: true,
          buyerId: true,
          sellerId: true,
          status: true,
          currentPrice: true,
          remark: true,
          orderId: true,
          product: {
            select: {
              title: true,
              status: true
            }
          }
        }
      });

      if (!current) {
        throw new NotFoundException('议价记录不存在');
      }

      if (current.orderId) {
        throw new BadRequestException('该议价已创建订单，请直接进入订单流程');
      }

      const expected = this.getExpectedActor(current.status);
      if (!expected || expected !== myActor) {
        throw new BadRequestException('议价状态已变化，请刷新后重试');
      }

      if (current.product.status !== ProductStatus.ONLINE) {
        throw new BadRequestException('商品当前不可售，无法确认议价');
      }

      const lock = await tx.bargain.updateMany({
        where: {
          id: bargainId,
          status: current.status,
          orderId: null
        },
        data: {
          status: BargainStatus.ACCEPTED,
          lastActor: myActor,
          remark: this.normalizeRemark(dto.remark) ?? current.remark
        }
      });

      if (!lock.count) {
        throw new BadRequestException('议价状态已变化，请刷新后重试');
      }

      const order = await this.orderService.createByNegotiation(
        {
          buyerId: current.buyerId,
          sellerId: current.sellerId,
          productId: current.productId,
          price: current.currentPrice,
          bargainId: current.id
        },
        tx
      );

      const accepted = await tx.bargain.update({
        where: { id: bargainId },
        data: {
          orderId: order.id
        }
      });

      await tx.bargainLog.create({
        data: {
          bargainId,
          action: 'ACCEPT',
          actor: myActor,
          actorId: userId,
          price: current.currentPrice,
          remark: this.normalizeRemark(dto.remark) ?? `议价达成，生成订单 ${order.id}`
        }
      });

      return {
        order,
        bargain: accepted,
        productTitle: current.product.title,
        currentPrice: current.currentPrice
      };
    });

    await this.sendSystemNotice({
      userId: peerUserId,
      type: 'BARGAIN_ACCEPTED',
      title: '议价已达成，已生成担保订单',
      content: `商品「${acceptedResult.productTitle}」议价已达成，请进入订单流程继续支付与交付。`,
      payload: {
        bargainId,
        action: dto.action,
        actor: myActor,
        orderId: acceptedResult.order.id,
        currentPrice: String(acceptedResult.currentPrice)
      }
    });

    return {
      message: '议价达成，已创建担保订单',
      order: acceptedResult.order,
      bargain: acceptedResult.bargain
    };
  }
}
