import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import {
  Prisma,
  ProductAuditStatus,
  ProductCategory,
  ProductStatus,
  RiskLevel
} from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

import { AdminQueryDto } from './dto/admin-query.dto';
import { AdminProductMarketQueryDto } from './dto/admin-product-market-query.dto';
import { UpdateProductMarketDto } from './dto/update-product-market.dto';

interface AuditDto {
  status: ProductAuditStatus;
  reason?: string;
}

@Controller('admin/products')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProductAuditController {
  constructor(private readonly prisma: PrismaService) {}

  private parseBooleanFlag(value?: string) {
    if (value === undefined || value === null || value === '') return undefined;
    const normalized = String(value).trim().toLowerCase();
    if (['1', 'true', 'yes', 'y'].includes(normalized)) return true;
    if (['0', 'false', 'no', 'n'].includes(normalized)) return false;
    return undefined;
  }

  @Get()
  @Roles('ADMIN')
  listAll(@Query() query: AdminProductMarketQueryDto) {
    const page = query.page && query.page > 0 ? query.page : 1;
    const pageSize = query.pageSize && query.pageSize > 0 ? Math.min(query.pageSize, 100) : 30;
    const featured = this.parseBooleanFlag(query.featured);

    const where: Prisma.ProductWhereInput = {
      ...(query.keyword
        ? {
            OR: [
              { title: { contains: query.keyword } },
              { code: { contains: query.keyword } },
              { sellerId: { contains: query.keyword } },
              { seller: { email: { contains: query.keyword } } }
            ]
          }
        : {}),
      ...(query.status ? { status: query.status as ProductStatus } : {}),
      ...(query.category ? { category: query.category as ProductCategory } : {}),
      ...(query.region ? { region: { contains: query.region } } : {}),
      ...(query.riskLevel ? { riskLevel: query.riskLevel as RiskLevel } : {}),
      ...(typeof featured === 'boolean' ? { isPremium: featured } : {})
    };

    return this.prisma
      .$transaction([
        this.prisma.product.count({ where }),
        this.prisma.product.findMany({
          where,
          include: {
            audits: {
              orderBy: { createdAt: 'desc' },
              take: 1
            },
            seller: {
              select: {
                id: true,
                email: true,
                sellerProfile: {
                  select: {
                    level: true,
                    tradeCount: true,
                    disputeRate: true,
                    positiveRate: true
                  }
                }
              }
            }
          },
          orderBy: [{ isPremium: 'desc' }, { updatedAt: 'desc' }],
          skip: (page - 1) * pageSize,
          take: pageSize
        })
      ])
      .then(([total, list]) => ({ total, list, page, pageSize }));
  }

  @Get('pending')
  @Roles('ADMIN')
  pending(@Query() query: AdminQueryDto) {
    const { page = 1, pageSize = 20 } = query;
    const where = { status: 'PENDING' as const };
    return this.prisma.$transaction([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        include: {
          audits: {
            orderBy: { createdAt: 'desc' },
            take: 1
          },
          consignmentApplications: {
            orderBy: { updatedAt: 'desc' },
            take: 1,
            select: {
              id: true,
              status: true,
              sellerNote: true,
              adminRemark: true,
              reviewedAt: true,
              createdAt: true,
              reviewer: {
                select: {
                  id: true,
                  email: true
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
                  disputeRate: true,
                  positiveRate: true
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize
      })
    ]).then(([total, list]) => ({ total, list, page, pageSize }));
  }

  @Get(':id/audits')
  @Roles('ADMIN')
  logs(@Param('id') id: string) {
    return this.prisma.productAudit.findMany({
      where: { productId: id },
      orderBy: { createdAt: 'desc' }
    });
  }

  @Patch(':id/audit')
  @Roles('ADMIN')
  async audit(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
    @Body() dto: AuditDto
  ) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) return { message: '商品不存在' };
    if (dto.status === 'REJECTED' && !dto.reason) {
      return { message: '审核拒绝必须提供原因' };
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.productAudit.create({
        data: {
          productId: id,
          adminId: user.userId,
          status: dto.status,
          reason: dto.reason
        }
      });

      await tx.product.update({
        where: { id },
        data: { status: dto.status === 'APPROVED' ? 'ONLINE' : 'OFFLINE' }
      });
    });
    return { ok: true };
  }

  @Patch(':id/market')
  @Roles('ADMIN')
  async updateMarketConfig(@Param('id') id: string, @Body() dto: UpdateProductMarketDto) {
    const exists = await this.prisma.product.findUnique({
      where: { id },
      select: { id: true }
    });
    if (!exists) return { message: '商品不存在' };

    const payload: Prisma.ProductUpdateInput = {
      ...(dto.status ? { status: dto.status } : {}),
      ...(dto.riskLevel ? { riskLevel: dto.riskLevel } : {}),
      ...(dto.riskTags !== undefined ? { riskTags: dto.riskTags } : {}),
      ...(dto.isPremium !== undefined ? { isPremium: dto.isPremium } : {}),
      ...(dto.premiumRate === null
        ? { premiumRate: null }
        : dto.premiumRate !== undefined
          ? { premiumRate: new Prisma.Decimal(dto.premiumRate) }
          : {})
    };

    const updated = await this.prisma.product.update({
      where: { id },
      data: payload,
      select: {
        id: true,
        status: true,
        riskLevel: true,
        riskTags: true,
        isPremium: true,
        premiumRate: true,
        updatedAt: true
      }
    });

    return {
      message: '商品运营配置已更新',
      data: updated
    };
  }
}
