import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
  UnauthorizedException
} from '@nestjs/common';
import { Prisma, UserStatus } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { ProductService } from '../product/product.service';
import { CreateProductDto } from '../product/dto/create-product.dto';
import { SyncProviderConfigDto } from '../product/dto/sync-provider-config.dto';

import { CreateOpenApiKeyDto } from './dto/create-open-api-key.dto';

interface OpenApiRequestMeta {
  xApiKey?: string;
  authorization?: string;
  signature?: string;
  timestamp?: string;
  nonce?: string;
  method: string;
  path: string;
  ip?: string;
  body: unknown;
}

@Injectable()
export class OpenApiService {
  private readonly requireSignature =
    process.env.OPEN_API_REQUIRE_SIGNATURE !== 'false';
  private readonly maxSkewSeconds = Number(
    process.env.OPEN_API_MAX_SKEW_SECONDS ?? 300
  );
  private readonly rateLimitPerMinute = Number(
    process.env.OPEN_API_RATE_LIMIT_PER_MINUTE ?? 120
  );

  constructor(
    private readonly prisma: PrismaService,
    private readonly productService: ProductService
  ) {}

  private hashApiKey(rawKey: string) {
    return createHash('sha256').update(rawKey).digest('hex');
  }

  private generateApiKey() {
    const rawKey = `idc_sk_${randomBytes(24).toString('hex')}`;
    return {
      rawKey,
      keyPrefix: rawKey.slice(0, 14),
      keyHash: this.hashApiKey(rawKey)
    };
  }

  private toDateOrNull(value?: string) {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date;
  }

  private stableStringify(input: unknown): string {
    if (input === null || typeof input !== 'object') {
      return JSON.stringify(input);
    }

    if (Array.isArray(input)) {
      return `[${input.map((item) => this.stableStringify(item)).join(',')}]`;
    }

    const record = input as Record<string, unknown>;
    const keys = Object.keys(record).sort();
    return `{${keys
      .map((key) => `${JSON.stringify(key)}:${this.stableStringify(record[key])}`)
      .join(',')}}`;
  }

  private statusCodeFromError(error: unknown) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'getStatus' in error &&
      typeof (error as { getStatus: () => number }).getStatus === 'function'
    ) {
      return (error as { getStatus: () => number }).getStatus();
    }
    return 500;
  }

  private errorName(error: unknown) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'name' in error &&
      typeof (error as { name: string }).name === 'string'
    ) {
      return (error as { name: string }).name;
    }
    return 'Error';
  }

  private errorMessage(error: unknown) {
    if (error instanceof Error) return error.message;
    return String(error);
  }

  private resolveRawKey(xApiKey?: string, authHeader?: string) {
    const fromHeader = xApiKey?.trim();
    if (fromHeader) return fromHeader;

    const authorization = authHeader?.trim();
    if (authorization?.toLowerCase().startsWith('bearer ')) {
      return authorization.slice(7).trim();
    }

    return '';
  }

  private keyPrefixFromRaw(rawKey?: string) {
    if (!rawKey) return null;
    return rawKey.slice(0, 14);
  }

  private buildSignatureText(meta: OpenApiRequestMeta, timestamp: number, nonce: string) {
    const bodyText = this.stableStringify(meta.body ?? {});
    const bodyHash = createHash('sha256').update(bodyText).digest('hex');
    return [
      meta.method.toUpperCase(),
      meta.path,
      String(timestamp),
      nonce,
      bodyHash
    ].join('\n');
  }

  private verifySignature(rawKey: string, meta: OpenApiRequestMeta) {
    if (!this.requireSignature) {
      return {
        nonce: meta.nonce?.trim() || null,
        signatureMode: 'DISABLED'
      };
    }

    const signature = meta.signature?.trim().toLowerCase();
    const nonce = meta.nonce?.trim();
    const timestamp = Number(meta.timestamp);

    if (!signature || !nonce || !Number.isFinite(timestamp)) {
      throw new UnauthorizedException('签名参数缺失');
    }
    if (nonce.length < 8 || nonce.length > 128) {
      throw new UnauthorizedException('nonce 长度不合法');
    }

    const nowSeconds = Math.floor(Date.now() / 1000);
    if (Math.abs(nowSeconds - timestamp) > this.maxSkewSeconds) {
      throw new UnauthorizedException('签名时间戳超时');
    }

    const signText = this.buildSignatureText(meta, timestamp, nonce);
    const expected = createHmac('sha256', rawKey).update(signText).digest('hex');

    const expectedBuf = Buffer.from(expected);
    const signatureBuf = Buffer.from(signature);
    if (
      expectedBuf.length !== signatureBuf.length ||
      !timingSafeEqual(expectedBuf, signatureBuf)
    ) {
      throw new UnauthorizedException('签名校验失败');
    }

    return {
      nonce,
      signatureMode: 'HMAC_SHA256'
    };
  }

  private async ensureNonceUnused(openApiKeyId: string, nonce: string | null) {
    if (!nonce) return;
    try {
      await this.prisma.openApiNonce.create({
        data: {
          openApiKeyId,
          nonce
        }
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new UnauthorizedException('签名重放风险：nonce 已使用');
      }
      throw error;
    }
  }

  private async ensureRateLimit(openApiKeyId: string) {
    const since = new Date(Date.now() - 60 * 1000);
    const used = await this.prisma.openApiCallLog.count({
      where: {
        openApiKeyId,
        createdAt: { gte: since }
      }
    });

    if (used >= this.rateLimitPerMinute) {
      throw new HttpException(
        'OpenAPI 调用频率过高，请稍后重试',
        HttpStatus.TOO_MANY_REQUESTS
      );
    }
  }

  private async resolveAndValidateKey(rawKey: string) {
    const keyHash = this.hashApiKey(rawKey);
    const now = new Date();
    const found = await this.prisma.openApiKey.findFirst({
      where: {
        keyHash,
        status: 'ACTIVE',
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }]
      },
      include: {
        user: {
          select: {
            id: true,
            status: true
          }
        }
      }
    });

    if (!found || found.user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('API Key 无效或已过期');
    }

    return found;
  }

  private async writeCallLog(input: {
    openApiKeyId?: string | null;
    userId?: string | null;
    keyPrefix?: string | null;
    requestPath: string;
    requestMethod: string;
    nonce?: string | null;
    signatureMode?: string | null;
    ip?: string | null;
    statusCode: number;
    success: boolean;
    errorCode?: string | null;
    errorMessage?: string | null;
    durationMs: number;
  }) {
    await this.prisma.openApiCallLog.create({
      data: {
        openApiKeyId: input.openApiKeyId || null,
        userId: input.userId || null,
        keyPrefix: input.keyPrefix || null,
        requestPath: input.requestPath,
        requestMethod: input.requestMethod,
        nonce: input.nonce || null,
        signatureMode: input.signatureMode || null,
        ip: input.ip || null,
        statusCode: input.statusCode,
        success: input.success,
        errorCode: input.errorCode || null,
        errorMessage: input.errorMessage || null,
        durationMs: Math.max(0, Math.floor(input.durationMs))
      }
    });
  }

  private normalizePath(path: string) {
    if (!path) return '/api/v1/open';
    return path.split('?')[0] || '/api/v1/open';
  }

  private async executeSignedOpenApiCall<T>(
    meta: OpenApiRequestMeta,
    action: (auth: { userId: string; keyId: string; scope: string | null }) => Promise<T>
  ) {
    const start = Date.now();
    const rawKey = this.resolveRawKey(meta.xApiKey, meta.authorization);
    const keyPrefix = this.keyPrefixFromRaw(rawKey);
    const requestPath = this.normalizePath(meta.path);
    let keyId: string | null = null;
    let userId: string | null = null;
    let scope: string | null = null;
    let nonce: string | null = null;
    let signatureMode: string | null = null;

    try {
      if (!rawKey) {
        throw new UnauthorizedException('缺少 API Key');
      }

      const key = await this.resolveAndValidateKey(rawKey);
      keyId = key.id;
      userId = key.userId;
      scope = key.scope;

      await this.ensureRateLimit(key.id);
      const signed = this.verifySignature(rawKey, meta);
      nonce = signed.nonce;
      signatureMode = signed.signatureMode;
      await this.ensureNonceUnused(key.id, nonce);

      const result = await action({ userId: key.userId, keyId: key.id, scope: key.scope });

      await this.prisma.openApiKey.update({
        where: { id: key.id },
        data: { lastUsedAt: new Date() }
      });

      await this.writeCallLog({
        openApiKeyId: key.id,
        userId: key.userId,
        keyPrefix,
        requestPath,
        requestMethod: meta.method.toUpperCase(),
        nonce,
        signatureMode,
        ip: meta.ip,
        statusCode: 200,
        success: true,
        durationMs: Date.now() - start
      });

      return result;
    } catch (error) {
      await this.writeCallLog({
        openApiKeyId: keyId,
        userId,
        keyPrefix,
        requestPath,
        requestMethod: meta.method.toUpperCase(),
        nonce: nonce || meta.nonce || null,
        signatureMode,
        ip: meta.ip,
        statusCode: this.statusCodeFromError(error),
        success: false,
        errorCode: this.errorName(error),
        errorMessage: this.errorMessage(error),
        durationMs: Date.now() - start
      });
      throw error;
    }
  }

  async listKeys(userId: string) {
    return this.prisma.openApiKey.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        scope: true,
        status: true,
        lastUsedAt: true,
        expiresAt: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async createKey(userId: string, dto: CreateOpenApiKeyDto) {
    const { rawKey, keyPrefix, keyHash } = this.generateApiKey();
    const expiresAt = this.toDateOrNull(dto.expiresAt);

    if (dto.expiresAt && !expiresAt) {
      throw new BadRequestException('过期时间格式不正确');
    }

    const created = await this.prisma.openApiKey.create({
      data: {
        userId,
        name: dto.name.trim(),
        keyPrefix,
        keyHash,
        scope: dto.scope?.trim() || 'PRODUCT:WRITE',
        expiresAt
      },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        scope: true,
        status: true,
        expiresAt: true,
        createdAt: true
      }
    });

    return {
      ...created,
      apiKey: rawKey,
      notice: '密钥仅展示一次，请妥善保存。'
    };
  }

  async revokeKey(userId: string, id: string) {
    const result = await this.prisma.openApiKey.updateMany({
      where: {
        id,
        userId,
        status: 'ACTIVE'
      },
      data: {
        status: 'REVOKED'
      }
    });

    if (result.count === 0) {
      throw new NotFoundException('密钥不存在或已撤销');
    }

    return { message: '密钥已撤销' };
  }

  async createProductByApiKey(
    dto: CreateProductDto,
    meta: OpenApiRequestMeta
  ) {
    return this.executeSignedOpenApiCall(meta, async (auth) => {
      const product = await this.productService.create(auth.userId, dto);
      return {
        message: '开放接口发布成功，商品已进入待审核状态',
        product,
        auth: {
          keyId: auth.keyId,
          scope: auth.scope
        }
      };
    });
  }

  async syncProviderByApiKey(
    dto: SyncProviderConfigDto,
    meta: OpenApiRequestMeta
  ) {
    return this.executeSignedOpenApiCall(meta, async (auth) => {
      const data = await this.productService.syncProviderConfig(auth.userId, dto);
      return {
        message: '上游参数拉取成功',
        data,
        auth: {
          keyId: auth.keyId,
          scope: auth.scope
        }
      };
    });
  }

  async listCallLogs(query: {
    page?: number;
    pageSize?: number;
    success?: boolean;
    userId?: string;
    keyPrefix?: string;
    path?: string;
  }) {
    const page = query.page && query.page > 0 ? query.page : 1;
    const pageSize = query.pageSize && query.pageSize > 0 ? Math.min(query.pageSize, 100) : 20;

    const where: Prisma.OpenApiCallLogWhereInput = {
      ...(typeof query.success === 'boolean' ? { success: query.success } : {}),
      ...(query.userId ? { userId: query.userId } : {}),
      ...(query.keyPrefix ? { keyPrefix: { contains: query.keyPrefix } } : {}),
      ...(query.path ? { requestPath: { contains: query.path } } : {})
    };

    const [total, list] = await this.prisma.$transaction([
      this.prisma.openApiCallLog.count({ where }),
      this.prisma.openApiCallLog.findMany({
        where,
        include: {
          openApiKey: {
            select: {
              id: true,
              name: true,
              scope: true,
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

  async getCallMetrics(windowMinutes = 60) {
    const minutes = Number.isFinite(windowMinutes)
      ? Math.min(Math.max(windowMinutes, 5), 24 * 60)
      : 60;
    const startAt = new Date(Date.now() - minutes * 60 * 1000);

    const [
      total,
      success,
      failed,
      topKeys,
      topPaths,
      failedCodes
    ] = await Promise.all([
      this.prisma.openApiCallLog.count({ where: { createdAt: { gte: startAt } } }),
      this.prisma.openApiCallLog.count({ where: { createdAt: { gte: startAt }, success: true } }),
      this.prisma.openApiCallLog.count({ where: { createdAt: { gte: startAt }, success: false } }),
      this.prisma.openApiCallLog.groupBy({
        by: ['keyPrefix'],
        where: {
          createdAt: { gte: startAt },
          keyPrefix: { not: null }
        },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10
      }),
      this.prisma.openApiCallLog.groupBy({
        by: ['requestPath'],
        where: { createdAt: { gte: startAt } },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10
      }),
      this.prisma.openApiCallLog.groupBy({
        by: ['errorCode'],
        where: {
          createdAt: { gte: startAt },
          success: false,
          errorCode: { not: null }
        },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10
      })
    ]);

    return {
      windowMinutes: minutes,
      total,
      success,
      failed,
      successRate: total > 0 ? Number((success / total).toFixed(4)) : 0,
      avgRpm: Number((total / minutes).toFixed(2)),
      rateLimitPerMinute: this.rateLimitPerMinute,
      requireSignature: this.requireSignature,
      maxSkewSeconds: this.maxSkewSeconds,
      topKeys: topKeys.map((item) => ({
        keyPrefix: item.keyPrefix,
        count: item._count.id ?? 0
      })),
      topPaths: topPaths.map((item) => ({
        path: item.requestPath,
        count: item._count.id ?? 0
      })),
      failedCodes: failedCodes.map((item) => ({
        code: item.errorCode,
        count: item._count.id ?? 0
      }))
    };
  }
}
