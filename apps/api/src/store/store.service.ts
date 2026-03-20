import {
  BadRequestException,
  Injectable,
  NotFoundException
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

import { UpsertStoreProfileDto } from './dto/upsert-store-profile.dto';

@Injectable()
export class StoreService {
  constructor(private readonly prisma: PrismaService) {}

  private normalizeSlug(input: string) {
    return input
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\u4e00-\u9fa5-]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  private async ensureUniqueSlug(slug: string, userId: string) {
    const exists = await this.prisma.storeProfile.findUnique({
      where: { slug }
    });
    if (exists && exists.userId !== userId) {
      throw new BadRequestException('店铺短链已被占用，请修改后重试');
    }
  }

  private toViewCountHint(createdAt: Date) {
    const days = Math.max(1, Math.floor((Date.now() - createdAt.getTime()) / 86400000));
    return Math.min(99999, days * 13 + 200);
  }

  async mine(userId: string) {
    return this.prisma.storeProfile.findUnique({
      where: { userId }
    });
  }

  async upsertMine(userId: string, dto: UpsertStoreProfileDto) {
    const name = dto.name.trim();
    if (!name) throw new BadRequestException('店铺名称不能为空');

    const slug = this.normalizeSlug(dto.slug || name);
    if (!slug) {
      throw new BadRequestException('店铺短链无效，请使用字母、数字或中文');
    }
    await this.ensureUniqueSlug(slug, userId);

    return this.prisma.storeProfile.upsert({
      where: { userId },
      update: {
        name,
        slug,
        logo: dto.logo?.trim() || null,
        banner: dto.banner?.trim() || null,
        intro: dto.intro?.trim() || null,
        notice: dto.notice?.trim() || null,
        ...(typeof dto.verifiedBadge === 'boolean' ? { verifiedBadge: dto.verifiedBadge } : {}),
        ...(typeof dto.responseMinutes === 'number'
          ? { responseMinutes: dto.responseMinutes }
          : {})
      },
      create: {
        userId,
        name,
        slug,
        logo: dto.logo?.trim() || null,
        banner: dto.banner?.trim() || null,
        intro: dto.intro?.trim() || null,
        notice: dto.notice?.trim() || null,
        verifiedBadge: dto.verifiedBadge ?? false,
        responseMinutes: dto.responseMinutes ?? 30
      }
    });
  }

  async publicBySlug(slug: string) {
    const store = await this.prisma.storeProfile.findUnique({
      where: { slug },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            createdAt: true,
            sellerProfile: {
              select: {
                level: true,
                tradeCount: true,
                disputeRate: true,
                avgDeliveryMinutes: true,
                positiveRate: true
              }
            }
          }
        }
      }
    });
    if (!store) throw new NotFoundException('店铺不存在');

    const [products, reviews] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where: {
          sellerId: store.userId,
          status: 'ONLINE'
        },
        orderBy: { updatedAt: 'desc' },
        take: 20,
        select: {
          id: true,
          code: true,
          title: true,
          category: true,
          region: true,
          lineType: true,
          salePrice: true,
          expireAt: true,
          deliveryType: true,
          riskLevel: true,
          consignment: true,
          negotiable: true,
          riskTags: true,
          updatedAt: true
        }
      }),
      this.prisma.orderReview.findMany({
        where: { sellerId: store.userId },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: {
          id: true,
          rating: true,
          content: true,
          tags: true,
          createdAt: true,
          orderId: true,
          buyer: {
            select: {
              id: true,
              email: true
            }
          }
        }
      })
    ]);

    return {
      store,
      stats: {
        onlineProducts: products.length,
        reviewCount: reviews.length,
        estimatedVisits: this.toViewCountHint(store.createdAt)
      },
      products,
      reviews
    };
  }

  async publicByUserId(userId: string) {
    const store = await this.prisma.storeProfile.findUnique({
      where: { userId },
      select: { slug: true }
    });
    if (store) return this.publicBySlug(store.slug);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, createdAt: true, sellerProfile: true }
    });
    if (!user) throw new NotFoundException('卖家不存在');

    const [products, reviews] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where: {
          sellerId: userId,
          status: 'ONLINE'
        },
        orderBy: { updatedAt: 'desc' },
        take: 20,
        select: {
          id: true,
          code: true,
          title: true,
          category: true,
          region: true,
          lineType: true,
          salePrice: true,
          expireAt: true,
          deliveryType: true,
          riskLevel: true,
          consignment: true,
          negotiable: true,
          riskTags: true,
          updatedAt: true
        }
      }),
      this.prisma.orderReview.findMany({
        where: { sellerId: userId },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: {
          id: true,
          rating: true,
          content: true,
          tags: true,
          createdAt: true,
          orderId: true,
          buyer: {
            select: {
              id: true,
              email: true
            }
          }
        }
      })
    ]);

    return {
      store: {
        id: `virtual-${user.id}`,
        userId,
        name: `卖家 ${user.email.split('@')[0]}`,
        slug: user.id,
        logo: null,
        banner: null,
        intro: null,
        notice: null,
        verifiedBadge: false,
        responseMinutes: 30,
        createdAt: user.createdAt,
        updatedAt: user.createdAt,
        user
      },
      stats: {
        onlineProducts: products.length,
        reviewCount: reviews.length,
        estimatedVisits: this.toViewCountHint(user.createdAt)
      },
      products,
      reviews
    };
  }
}
