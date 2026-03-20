import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException
} from '@nestjs/common';
import {
  Prisma,
  ProductCategory,
  WantedOfferStatus,
  WantedStatus
} from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { NoticeService } from '../notice/notice.service';

import { CreateWantedDto } from './dto/create-wanted.dto';
import { QueryWantedDto } from './dto/query-wanted.dto';
import { CreateWantedOfferDto } from './dto/create-wanted-offer.dto';
import {
  ReviewWantedOfferDto,
  WantedOfferReviewAction
} from './dto/review-wanted-offer.dto';
import { QueryWantedOfferDto } from './dto/query-wanted-offer.dto';

@Injectable()
export class WantedService {
  private readonly logger = new Logger(WantedService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly noticeService: NoticeService
  ) {}

  private async sendSystemNotice(input: {
    userId: string;
    type: string;
    payload?: Record<string, unknown>;
    title?: string;
    content?: string;
  }) {
    try {
      await this.noticeService.createSystemNotice(input);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      this.logger.warn(`发送通知失败 type=${input.type} userId=${input.userId}: ${reason}`);
    }
  }

  private buildWantedWhere(query: QueryWantedDto, onlyOpenByDefault = true) {
    const where: Prisma.WantedRequestWhereInput = {
      status: query.status ?? (onlyOpenByDefault ? WantedStatus.OPEN : undefined),
      category: query.category,
      ...(query.region
        ? {
            region: { contains: query.region }
          }
        : {}),
      ...(query.lineType
        ? {
            lineType: { contains: query.lineType }
          }
        : {})
    };

    if (query.keyword) {
      where.OR = [
        { title: { contains: query.keyword } },
        { description: { contains: query.keyword } }
      ];
    }

    return where;
  }

  async createWanted(buyerId: string, dto: CreateWantedDto) {
    if (dto.budgetMin !== undefined && dto.budgetMax !== undefined && dto.budgetMin > dto.budgetMax) {
      throw new BadRequestException('预算下限不能大于预算上限');
    }

    return this.prisma.wantedRequest.create({
      data: {
        buyerId,
        title: dto.title,
        category: dto.category,
        region: dto.region,
        lineType: dto.lineType,
        cpuCores: dto.cpuCores,
        memoryGb: dto.memoryGb,
        diskGb: dto.diskGb,
        bandwidthMbps: dto.bandwidthMbps,
        budgetMin: dto.budgetMin !== undefined ? new Prisma.Decimal(dto.budgetMin) : undefined,
        budgetMax: dto.budgetMax !== undefined ? new Prisma.Decimal(dto.budgetMax) : undefined,
        acceptPremium: dto.acceptPremium ?? false,
        description: dto.description,
        expireAt: dto.expireAt ? new Date(dto.expireAt) : undefined,
        status: WantedStatus.OPEN
      }
    });
  }

  async listWanted(query: QueryWantedDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where = this.buildWantedWhere(query, true);

    const [total, list] = await this.prisma.$transaction([
      this.prisma.wantedRequest.count({ where }),
      this.prisma.wantedRequest.findMany({
        where,
        include: {
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
          _count: {
            select: {
              offers: true
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

  async getWantedDetail(wantedId: string) {
    const wanted = await this.prisma.wantedRequest.findUnique({
      where: { id: wantedId },
      include: {
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
        _count: {
          select: {
            offers: true
          }
        }
      }
    });
    if (!wanted) throw new NotFoundException('求购需求不存在');
    return wanted;
  }

  async listMine(userId: string, query: QueryWantedDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where = {
      ...this.buildWantedWhere(query, false),
      buyerId: userId
    };

    const [total, list] = await this.prisma.$transaction([
      this.prisma.wantedRequest.count({ where }),
      this.prisma.wantedRequest.findMany({
        where,
        include: {
          _count: {
            select: {
              offers: true
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

  async closeWanted(userId: string, wantedId: string) {
    const wanted = await this.prisma.wantedRequest.findUnique({
      where: { id: wantedId },
      select: { id: true, buyerId: true, status: true }
    });
    if (!wanted) throw new NotFoundException('求购需求不存在');
    if (wanted.buyerId !== userId) throw new ForbiddenException('无权关闭他人求购需求');
    if (wanted.status === WantedStatus.CLOSED) {
      return { message: '求购需求已关闭' };
    }

    await this.prisma.wantedRequest.update({
      where: { id: wantedId },
      data: { status: WantedStatus.CLOSED }
    });

    return { message: '求购需求已关闭' };
  }

  async createOffer(sellerId: string, wantedId: string, dto: CreateWantedOfferDto) {
    const wanted = await this.prisma.wantedRequest.findUnique({
      where: { id: wantedId },
      select: {
        id: true,
        title: true,
        buyerId: true,
        status: true,
        category: true,
        region: true
      }
    });
    if (!wanted) throw new NotFoundException('求购需求不存在');
    if (wanted.buyerId === sellerId) {
      throw new BadRequestException('不能给自己的求购单报价');
    }
    if (wanted.status !== WantedStatus.OPEN) {
      throw new BadRequestException('当前求购单已关闭，无法继续报价');
    }

    if (dto.productId) {
      const product = await this.prisma.product.findUnique({
        where: { id: dto.productId },
        select: {
          id: true,
          sellerId: true,
          category: true,
          region: true,
          status: true
        }
      });
      if (!product || product.sellerId !== sellerId) {
        throw new ForbiddenException('仅可关联自己的商品进行报价');
      }
      if (product.status !== 'ONLINE') {
        throw new BadRequestException('仅可关联已上架商品报价');
      }
      if (wanted.category && product.category !== wanted.category) {
        throw new BadRequestException('关联商品类型与求购需求不一致');
      }
    }

    const offer = await this.prisma.wantedOffer.upsert({
      where: {
        wantedId_sellerId: {
          wantedId,
          sellerId
        }
      },
      update: {
        offerPrice: new Prisma.Decimal(dto.offerPrice),
        productId: dto.productId ?? null,
        message: dto.message,
        status: WantedOfferStatus.PENDING
      },
      create: {
        wantedId,
        sellerId,
        offerPrice: new Prisma.Decimal(dto.offerPrice),
        productId: dto.productId,
        message: dto.message,
        status: WantedOfferStatus.PENDING
      }
    });

    await this.sendSystemNotice({
      userId: wanted.buyerId,
      type: 'WANTED_OFFER_NEW',
      title: '你的求购单收到新报价',
      content: `求购单「${wanted.title}」有卖家提交了新的匹配报价`,
      payload: {
        wantedId,
        offerId: offer.id,
        sellerId,
        offerPrice: dto.offerPrice,
        productId: dto.productId
      }
    });

    return offer;
  }

  async listOffersForBuyer(userId: string, wantedId: string) {
    const wanted = await this.prisma.wantedRequest.findUnique({
      where: { id: wantedId },
      select: { id: true, buyerId: true }
    });
    if (!wanted) throw new NotFoundException('求购需求不存在');
    if (wanted.buyerId !== userId) throw new ForbiddenException('无权查看该求购单报价');

    return this.prisma.wantedOffer.findMany({
      where: { wantedId },
      include: {
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
        product: {
          select: {
            id: true,
            code: true,
            title: true,
            salePrice: true,
            category: true,
            region: true,
            lineType: true,
            status: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async listOffersForSeller(sellerId: string, query: QueryWantedOfferDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where = {
      sellerId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.wantedId ? { wantedId: query.wantedId } : {})
    };

    const [total, list] = await this.prisma.$transaction([
      this.prisma.wantedOffer.count({ where }),
      this.prisma.wantedOffer.findMany({
        where,
        include: {
          wanted: {
            select: {
              id: true,
              title: true,
              category: true,
              region: true,
              lineType: true,
              status: true,
              budgetMin: true,
              budgetMax: true,
              createdAt: true
            }
          },
          product: {
            select: {
              id: true,
              code: true,
              title: true,
              salePrice: true,
              status: true
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

  async reviewOffer(
    userId: string,
    wantedId: string,
    offerId: string,
    dto: ReviewWantedOfferDto
  ) {
    const wanted = await this.prisma.wantedRequest.findUnique({
      where: { id: wantedId },
      select: { id: true, title: true, buyerId: true, status: true }
    });
    if (!wanted) throw new NotFoundException('求购需求不存在');
    if (wanted.buyerId !== userId) throw new ForbiddenException('无权处理该求购单报价');

    const targetOffer = await this.prisma.wantedOffer.findUnique({
      where: { id: offerId },
      select: {
        id: true,
        wantedId: true,
        sellerId: true,
        status: true,
        offerPrice: true,
        productId: true
      }
    });
    if (!targetOffer || targetOffer.wantedId !== wantedId) {
      throw new NotFoundException('报价记录不存在');
    }

    if (dto.action === WantedOfferReviewAction.REJECT) {
      if (targetOffer.status === WantedOfferStatus.REJECTED) {
        return { message: '该报价已驳回' };
      }

      const offer = await this.prisma.wantedOffer.update({
        where: { id: offerId },
        data: { status: WantedOfferStatus.REJECTED }
      });

      await this.sendSystemNotice({
        userId: offer.sellerId,
        type: 'WANTED_OFFER_REJECTED',
        title: '求购报价未通过',
        content: `你在求购单「${wanted.title}」上的报价已被买家拒绝`,
        payload: {
          wantedId,
          offerId: offer.id,
          offerPrice: String(offer.offerPrice)
        }
      });

      return { message: '报价已驳回', offer };
    }

    if (targetOffer.status === WantedOfferStatus.ACCEPTED) {
      return { message: '该报价已接受', offerId: targetOffer.id };
    }

    const accepted = await this.prisma.$transaction(async (tx) => {
      await tx.wantedOffer.updateMany({
        where: {
          wantedId,
          id: { not: offerId },
          status: WantedOfferStatus.PENDING
        },
        data: { status: WantedOfferStatus.REJECTED }
      });

      const acceptedOffer = await tx.wantedOffer.update({
        where: { id: offerId },
        data: { status: WantedOfferStatus.ACCEPTED }
      });

      await tx.wantedRequest.update({
        where: { id: wantedId },
        data: { status: WantedStatus.CLOSED }
      });

      return acceptedOffer;
    });

    await this.sendSystemNotice({
      userId: accepted.sellerId,
      type: 'WANTED_OFFER_ACCEPTED',
      title: '求购报价已被接受',
      content: `你在求购单「${wanted.title}」上的报价已被买家接受，可继续推进交易。`,
      payload: {
        wantedId,
        offerId: accepted.id,
        offerPrice: String(accepted.offerPrice),
        productId: accepted.productId
      }
    });

    return { message: '报价已接受，求购单已关闭', offer: accepted };
  }

  async getWantedSummary() {
    const [openCount, closedCount] = await this.prisma.$transaction([
      this.prisma.wantedRequest.count({ where: { status: WantedStatus.OPEN } }),
      this.prisma.wantedRequest.count({ where: { status: WantedStatus.CLOSED } })
    ]);

    return {
      openCount,
      closedCount,
      categories: await this.prisma.wantedRequest.groupBy({
        by: ['category'],
        where: {
          status: WantedStatus.OPEN,
          category: {
            in: Object.values(ProductCategory)
          }
        },
        _count: { _all: true }
      })
    };
  }
}
