import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import { Prisma, ProductStatus, RiskScene } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { RiskService } from '../risk/risk.service';

import { QueryProductDto } from './dto/query-product.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductImageDto } from './dto/image.dto';
import { QueryMyProductsDto } from './dto/query-my-products.dto';
import { SyncProviderConfigDto } from './dto/sync-provider-config.dto';

@Injectable()
export class ProductService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly riskService: RiskService
  ) {}

  private parseBooleanFlag(value?: string) {
    if (value === undefined || value === null || value === '') return undefined;
    const normalized = String(value).toLowerCase();
    if (['1', 'true', 'yes', 'y'].includes(normalized)) return true;
    if (['0', 'false', 'no', 'n'].includes(normalized)) return false;
    return undefined;
  }

  async findMany(query: QueryProductDto) {
    const {
      page = 1,
      pageSize = 20,
      keyword,
      category,
      region,
      lineType,
      diskType,
      deliveryType,
      riskLevel,
      minCpu,
      minMemory,
      minDisk,
      minBandwidth,
      minTraffic,
      minIp,
      minDdos,
      minPrice,
      maxPrice,
      minPremiumRate,
      maxPremiumRate,
      status,
      sortBy
    } = query;

    const negotiable = this.parseBooleanFlag(query.negotiable);
    const consignment = this.parseBooleanFlag(query.consignment);
    const canChangeEmail = this.parseBooleanFlag(query.canChangeEmail);
    const canChangeRealname = this.parseBooleanFlag(query.canChangeRealname);
    const canTest = this.parseBooleanFlag(query.canTest);
    const canTransfer = this.parseBooleanFlag(query.canTransfer);
    const riskOnly = this.parseBooleanFlag(query.riskOnly);
    const urgentOnly = this.parseBooleanFlag(query.urgentOnly);
    const premiumOnly = this.parseBooleanFlag(query.premiumOnly);

    const orderBy: Prisma.ProductOrderByWithRelationInput =
      sortBy === 'price_asc'
        ? { salePrice: 'asc' }
        : sortBy === 'price_desc'
          ? { salePrice: 'desc' }
          : sortBy === 'expire_asc'
            ? { expireAt: 'asc' }
            : sortBy === 'views_desc'
              ? { browsingHistory: { _count: 'desc' } }
              : sortBy === 'hot_desc'
                ? { orders: { _count: 'desc' } }
            : sortBy === 'seller_desc'
              ? { updatedAt: 'desc' }
              : { createdAt: 'desc' };

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
      ...(lineType ? { lineType: { contains: lineType } } : undefined),
      ...(diskType ? { diskType: { contains: diskType } } : undefined),
      ...(deliveryType ? { deliveryType } : undefined),
      ...(riskLevel ? { riskLevel } : undefined),
      ...(typeof negotiable === 'boolean' ? { negotiable } : undefined),
      ...(typeof consignment === 'boolean' ? { consignment } : undefined),
      ...(typeof canChangeEmail === 'boolean' ? { canChangeEmail } : undefined),
      ...(typeof canChangeRealname === 'boolean' ? { canChangeRealname } : undefined),
      ...(typeof canTest === 'boolean' ? { canTest } : undefined),
      ...(typeof canTransfer === 'boolean' ? { canTransfer } : undefined),
      ...(query.feePayer ? { feePayer: query.feePayer } : undefined),
      ...(typeof urgentOnly === 'boolean' ? { isPremium: urgentOnly } : undefined),
      ...(typeof premiumOnly === 'boolean' ? { isPremium: premiumOnly } : undefined),
      ...(riskOnly
        ? {
            riskTags: {
              not: Prisma.JsonNull
            }
          }
        : undefined),
      ...(minCpu ? { cpuCores: { gte: minCpu } } : undefined),
      ...(minMemory ? { memoryGb: { gte: minMemory } } : undefined),
      ...(minDisk ? { diskGb: { gte: minDisk } } : undefined),
      ...(minBandwidth ? { bandwidthMbps: { gte: minBandwidth } } : undefined),
      ...(minTraffic ? { trafficLimit: { gte: minTraffic } } : undefined),
      ...(minIp ? { ipCount: { gte: minIp } } : undefined),
      ...(minDdos ? { ddos: { gte: minDdos } } : undefined),
      ...(minPrice || maxPrice
        ? {
            salePrice: {
              gte: minPrice,
              lte: maxPrice
            }
          }
        : undefined),
      ...(minPremiumRate !== undefined || maxPremiumRate !== undefined
        ? {
            premiumRate: {
              gte: minPremiumRate,
              lte: maxPremiumRate
            }
          }
        : undefined)
    };

    const [total, list] = await this.prisma.$transaction([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          images: true,
          consignmentApplications: {
            orderBy: { updatedAt: 'desc' },
            take: 1,
            select: {
              id: true,
              status: true,
              sellerNote: true,
              adminRemark: true,
              reviewedAt: true,
              createdAt: true
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
                  refundRate: true,
                  avgDeliveryMinutes: true,
                  positiveRate: true
                }
              }
            }
          },
          _count: {
            select: {
              browsingHistory: true,
              orders: true,
              favorites: true
            }
          }
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
      include: {
        images: true,
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
            createdAt: true,
            sellerProfile: {
              select: {
                level: true,
                tradeCount: true,
                disputeRate: true,
                refundRate: true,
                avgDeliveryMinutes: true,
                positiveRate: true
              }
            }
          }
        }
      }
    });
  }

  async findMine(sellerId: string, query: QueryMyProductsDto) {
    const { page = 1, pageSize = 20, status } = query;
    const where: Prisma.ProductWhereInput = {
      sellerId,
      ...(status ? { status } : {})
    };

    const [total, list] = await this.prisma.$transaction([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        include: {
          images: true,
          consignmentApplications: {
            orderBy: { updatedAt: 'desc' },
            take: 1,
            select: {
              id: true,
              status: true,
              sellerNote: true,
              adminRemark: true,
              reviewedAt: true,
              createdAt: true
            }
          },
          audits: {
            orderBy: { createdAt: 'desc' },
            take: 1
          }
        },
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize
      })
    ]);

    return { total, list, page, pageSize };
  }

  async create(sellerId: string, dto: CreateProductDto) {
    const risk = await this.riskService.evaluate(RiskScene.CREATE_PRODUCT, {
      userId: sellerId,
      amount: Number(dto.salePrice),
      category: dto.category,
      region: dto.region,
      lineType: dto.lineType,
      productTitle: dto.title
    });
    if (risk.action === 'BLOCK' || risk.action === 'LIMIT') {
      throw new ForbiddenException('商品发布触发风控拦截，请联系平台客服处理');
    }

    const riskTags = new Set<string>(dto.riskTags ?? []);
    if (risk.action === 'REVIEW') riskTags.add('风控复核');
    if (risk.action === 'ALERT') riskTags.add('风控提醒');
    if (risk.reason && risk.action !== 'ALLOW') {
      riskTags.add(risk.reason.slice(0, 60));
    }

    const code = `P${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`.toUpperCase();
    return this.prisma.product.create({
      data: {
        sellerId,
        code,
        status: ProductStatus.PENDING,
        ...dto,
        salePrice: new Prisma.Decimal(dto.salePrice),
        purchasePrice:
          dto.purchasePrice !== undefined ? new Prisma.Decimal(dto.purchasePrice) : null,
        minAcceptPrice:
          dto.minAcceptPrice !== undefined ? new Prisma.Decimal(dto.minAcceptPrice) : null,
        renewPrice:
          dto.renewPrice !== undefined ? new Prisma.Decimal(dto.renewPrice) : null,
        expireAt: dto.expireAt ? new Date(dto.expireAt) : null,
        feePayer: dto.feePayer ?? 'SELLER',
        canTest: dto.canTest ?? false,
        canTransfer: dto.canTransfer ?? false,
        riskTags: Array.from(riskTags)
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
        purchasePrice:
          dto.purchasePrice !== undefined ? new Prisma.Decimal(dto.purchasePrice) : undefined,
        minAcceptPrice:
          dto.minAcceptPrice !== undefined ? new Prisma.Decimal(dto.minAcceptPrice) : undefined,
        renewPrice:
          dto.renewPrice !== undefined ? new Prisma.Decimal(dto.renewPrice) : undefined,
        expireAt: dto.expireAt ? new Date(dto.expireAt) : undefined,
        feePayer: dto.feePayer,
        canTest: dto.canTest,
        canTransfer: dto.canTransfer,
        riskTags: dto.riskTags
      }
    });
  }

  private safeNumber(input: unknown) {
    const n = Number(input);
    return Number.isFinite(n) ? n : undefined;
  }

  private candidateFromObject(obj: Record<string, unknown>, keys: string[]) {
    for (const key of keys) {
      const value = obj[key];
      if (value !== undefined && value !== null && String(value).trim() !== '') {
        return value;
      }
    }
    return undefined;
  }

  private detectConfigFromPayload(payload: Record<string, unknown>) {
    const src =
      (payload.data as Record<string, unknown> | undefined) ||
      (payload.server as Record<string, unknown> | undefined) ||
      payload;

    const cpuModel = this.candidateFromObject(src, ['cpuModel', 'cpu_model', 'cpu']);
    const cpuCores = this.safeNumber(this.candidateFromObject(src, ['cpuCores', 'cpu_cores', 'cores']));
    const memoryGb = this.safeNumber(this.candidateFromObject(src, ['memoryGb', 'memory_gb', 'memory']));
    const diskGb = this.safeNumber(this.candidateFromObject(src, ['diskGb', 'disk_gb', 'disk']));
    const diskType = this.candidateFromObject(src, ['diskType', 'disk_type']);
    const bandwidthMbps = this.safeNumber(
      this.candidateFromObject(src, ['bandwidthMbps', 'bandwidth_mbps', 'bandwidth'])
    );
    const trafficLimit = this.safeNumber(
      this.candidateFromObject(src, ['trafficLimit', 'traffic_limit', 'traffic'])
    );
    const ipCount = this.safeNumber(this.candidateFromObject(src, ['ipCount', 'ip_count', 'ips']));
    const ddos = this.safeNumber(this.candidateFromObject(src, ['ddos', 'ddos_gb', 'defense']));
    const expireAt = this.candidateFromObject(src, ['expireAt', 'expire_at', 'expiredAt', 'expired_at']);
    const providerName = this.candidateFromObject(src, ['providerName', 'provider_name', 'vendor']);
    const providerUrl = this.candidateFromObject(src, ['providerUrl', 'provider_url']);

    return {
      cpuModel: cpuModel ? String(cpuModel) : undefined,
      cpuCores,
      memoryGb,
      diskGb,
      diskType: diskType ? String(diskType) : undefined,
      bandwidthMbps,
      trafficLimit,
      ipCount,
      ddos,
      expireAt: expireAt ? String(expireAt) : undefined,
      providerName: providerName ? String(providerName) : undefined,
      providerUrl: providerUrl ? String(providerUrl) : undefined
    };
  }

  async syncProviderConfig(_sellerId: string, dto: SyncProviderConfigDto) {
    const endpoint = dto.endpoint.trim();
    if (!/^https?:\/\//i.test(endpoint)) {
      throw new BadRequestException('上游接口地址必须以 http:// 或 https:// 开头');
    }

    const url = new URL(endpoint);
    if (dto.serverId) {
      url.searchParams.set('serverId', dto.serverId.trim());
    }
    url.searchParams.set('panelType', dto.panelType.trim().toLowerCase());

    const headers: Record<string, string> = {
      Accept: 'application/json'
    };
    if (dto.apiKey?.trim()) {
      headers.Authorization = `Bearer ${dto.apiKey.trim()}`;
      headers['X-API-Key'] = dto.apiKey.trim();
    }

    const res = await fetch(url.toString(), {
      method: 'GET',
      headers
    });
    if (!res.ok) {
      const body = await res.text();
      throw new BadRequestException(`上游接口请求失败: HTTP ${res.status} ${body.slice(0, 120)}`);
    }
    const payload = (await res.json()) as Record<string, unknown>;
    const detected = this.detectConfigFromPayload(payload);

    return {
      message: '已完成上游参数拉取，可一键回填到发布表单',
      panelType: dto.panelType,
      endpoint: url.toString(),
      detected,
      rawSample: payload
    };
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

  async setUrgent(id: string, sellerId: string, urgent: boolean) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundException('商品不存在');
    if (product.sellerId !== sellerId) throw new ForbiddenException('无权操作');
    return this.prisma.product.update({
      where: { id },
      data: { isPremium: urgent }
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

  async deleteProduct(sellerId: string, productId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: {
        orders: {
          select: {
            id: true,
            status: true
          }
        }
      }
    });
    if (!product) throw new NotFoundException('商品不存在');
    if (product.sellerId !== sellerId) throw new ForbiddenException('无权操作');
    if (product.status === ProductStatus.ONLINE) {
      throw new ForbiddenException('请先下架商品后再删除');
    }
    if (product.orders.length > 0) {
      throw new ForbiddenException('该商品已有订单记录，暂不支持删除');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.productImage.deleteMany({ where: { productId } });
      await tx.productAudit.deleteMany({ where: { productId } });
      await tx.favorite.deleteMany({ where: { productId } });
      await tx.browsingHistory.deleteMany({ where: { productId } });
      await tx.priceAlert.deleteMany({ where: { productId } });
      await tx.product.delete({ where: { id: productId } });
    });

    return { ok: true, message: '商品已删除' };
  }
}
