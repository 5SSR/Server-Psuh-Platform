import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { QueryProductDto } from './dto/query-product.dto';
import { Prisma, ProductStatus } from '@prisma/client';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductImageDto } from './dto/image.dto';

@Injectable()
export class ProductService {
  constructor(private readonly prisma: PrismaService) {}

  async findMany(query: QueryProductDto) {
    const { page = 1, pageSize = 20, keyword, category, region, minPrice, maxPrice, status } = query;
    const where: Prisma.ProductWhereInput = {
      status: status ?? ProductStatus.ONLINE,
      ...(keyword
        ? {
            OR: [
              { title: { contains: keyword } },
              { description: { contains: keyword } }
            ]
          }
        : undefined),
      ...(category ? { category } : undefined),
      ...(region ? { region: { contains: region } } : undefined),
      ...(minPrice || maxPrice
        ? {
            salePrice: {
              gte: minPrice,
              lte: maxPrice
            }
          }
        : undefined)
    };

    const [total, list] = await this.prisma.$transaction([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          images: true
        }
      })
    ]);

    return {
      list,
      total,
      page,
      pageSize
    };
  }

  async findOne(id: string) {
    return this.prisma.product.findUnique({
      where: { id },
      include: { images: true }
    });
  }

  async create(sellerId: string, dto: CreateProductDto) {
    const code = `P${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`.toUpperCase();
    return this.prisma.product.create({
      data: {
        sellerId,
        code,
        status: ProductStatus.PENDING,
        ...dto,
        salePrice: new Prisma.Decimal(dto.salePrice),
        renewPrice: dto.renewPrice ? new Prisma.Decimal(dto.renewPrice) : null,
        expireAt: dto.expireAt ? new Date(dto.expireAt) : null,
        riskTags: dto.riskTags ?? []
      }
    });
  }

  async update(sellerId: string, id: string, dto: UpdateProductDto) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundException('商品不存在');
    if (product.sellerId !== sellerId) throw new ForbiddenException('无权操作');
    if (product.status === ProductStatus.ONLINE) throw new ForbiddenException('上架状态不可编辑');
    return this.prisma.product.update({
      where: { id },
      data: {
        ...dto,
        salePrice: dto.salePrice !== undefined ? new Prisma.Decimal(dto.salePrice) : undefined,
        renewPrice:
          dto.renewPrice !== undefined ? new Prisma.Decimal(dto.renewPrice) : undefined,
        expireAt: dto.expireAt ? new Date(dto.expireAt) : undefined,
        riskTags: dto.riskTags
      }
    });
  }

  async submit(sellerId: string, id: string, remark?: string) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundException('商品不存在');
    if (product.sellerId !== sellerId) throw new ForbiddenException('无权操作');
    return this.prisma.$transaction(async (tx) => {
      await tx.product.update({
        where: { id },
        data: { status: ProductStatus.PENDING }
      });
      await tx.productAudit.create({
        data: {
          productId: id,
          status: 'PENDING',
          reason: remark
        }
      });
      return { ok: true };
    });
  }

  async toggleOnline(id: string, sellerId: string, on: boolean) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundException('商品不存在');
    if (product.sellerId !== sellerId) throw new ForbiddenException('无权操作');
    return this.prisma.product.update({
      where: { id },
      data: { status: on ? ProductStatus.ONLINE : ProductStatus.OFFLINE }
    });
  }

  async addImage(sellerId: string, productId: string, dto: ProductImageDto) {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundException('商品不存在');
    if (product.sellerId !== sellerId) throw new ForbiddenException('无权操作');
    return this.prisma.productImage.create({
      data: {
        productId,
        type: dto.type,
        url: dto.url
      }
    });
  }

  async deleteImage(sellerId: string, productId: string, imageId: string) {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundException('商品不存在');
    if (product.sellerId !== sellerId) throw new ForbiddenException('无权操作');

    const img = await this.prisma.productImage.findUnique({ where: { id: imageId } });
    if (!img || img.productId !== productId) throw new NotFoundException('图片不存在');
    await this.prisma.productImage.delete({ where: { id: imageId } });
    return { ok: true };
  }
}
