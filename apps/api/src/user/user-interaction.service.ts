import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { NoticeService } from '../notice/notice.service';

@Injectable()
export class UserInteractionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly noticeService: NoticeService
  ) {}

  // ---- Favorites ----
  async addFavorite(userId: string, productId: string) {
    const exists = await this.prisma.favorite.findUnique({
      where: { userId_productId: { userId, productId } }
    });
    if (exists) throw new ConflictException('已收藏');
    return this.prisma.favorite.create({ data: { userId, productId } });
  }

  async removeFavorite(userId: string, productId: string) {
    await this.prisma.favorite.deleteMany({ where: { userId, productId } });
    return { message: '已取消收藏' };
  }

  async listFavorites(userId: string, query: { page?: number; pageSize?: number }) {
    const { page = 1, pageSize = 20 } = query;
    const [total, list] = await this.prisma.$transaction([
      this.prisma.favorite.count({ where: { userId } }),
      this.prisma.favorite.findMany({
        where: { userId },
        include: {
          product: {
            select: { id: true, title: true, salePrice: true, status: true, images: { take: 1 } }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize
      })
    ]);
    return { total, list, page, pageSize };
  }

  // ---- Browsing History ----
  async recordView(userId: string, productId: string) {
    // Upsert: update timestamp if exists
    await this.prisma.browsingHistory.upsert({
      where: { userId_productId: { userId, productId } },
      update: { viewedAt: new Date() },
      create: { userId, productId }
    });
  }

  async listHistory(userId: string, query: { page?: number; pageSize?: number }) {
    const { page = 1, pageSize = 20 } = query;
    const [total, list] = await this.prisma.$transaction([
      this.prisma.browsingHistory.count({ where: { userId } }),
      this.prisma.browsingHistory.findMany({
        where: { userId },
        include: {
          product: {
            select: { id: true, title: true, salePrice: true, status: true, images: { take: 1 } }
          }
        },
        orderBy: { viewedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize
      })
    ]);
    return { total, list, page, pageSize };
  }

  async clearHistory(userId: string) {
    await this.prisma.browsingHistory.deleteMany({ where: { userId } });
    return { message: '浏览记录已清空' };
  }

  // ---- Price Alerts ----
  async createAlert(userId: string, productId: string, targetPrice: number) {
    return this.prisma.priceAlert.create({
      data: { userId, productId, targetPrice }
    });
  }

  async listAlerts(userId: string) {
    return this.prisma.priceAlert.findMany({
      where: { userId, triggered: false },
      include: {
        product: {
          select: { id: true, title: true, salePrice: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async deleteAlert(userId: string, alertId: string) {
    const alert = await this.prisma.priceAlert.findUnique({ where: { id: alertId } });
    if (!alert || alert.userId !== userId) throw new NotFoundException('提醒不存在');
    await this.prisma.priceAlert.delete({ where: { id: alertId } });
    return { message: '提醒已删除' };
  }

  /** Check price alerts - called by cron */
  async checkPriceAlerts() {
    const alerts = await this.prisma.priceAlert.findMany({
      where: { triggered: false },
      include: { product: { select: { id: true, salePrice: true, title: true } } }
    });
    let triggered = 0;
    for (const alert of alerts) {
      if (alert.product.salePrice.toNumber() <= alert.targetPrice.toNumber()) {
        await this.prisma.$transaction([
          this.prisma.priceAlert.update({
            where: { id: alert.id },
            data: { triggered: true }
          })
        ]);
        await this.noticeService.createSystemNotice({
          userId: alert.userId,
          type: 'PRICE_ALERT',
          payload: {
            productId: alert.product.id,
            productTitle: alert.product.title,
            targetPrice: alert.targetPrice,
            currentPrice: alert.product.salePrice.toNumber()
          }
        });
        triggered++;
      }
    }
    return { triggered };
  }
}
