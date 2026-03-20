import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';

import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreateProductDto } from '../product/dto/create-product.dto';
import { SyncProviderConfigDto } from '../product/dto/sync-provider-config.dto';

import { OpenApiService } from './open-api.service';
import { CreateOpenApiKeyDto } from './dto/create-open-api-key.dto';

function normalizeHeader(value: string | string[] | undefined) {
  if (!value) return undefined;
  return Array.isArray(value) ? value[0] : value;
}

@Controller('open')
export class OpenApiController {
  constructor(private readonly openApiService: OpenApiService) {}

  @Get('keys')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('USER')
  listKeys(@CurrentUser() user: { userId: string }) {
    return this.openApiService.listKeys(user.userId);
  }

  @Post('keys')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('USER')
  createKey(
    @CurrentUser() user: { userId: string },
    @Body() dto: CreateOpenApiKeyDto
  ) {
    return this.openApiService.createKey(user.userId, dto);
  }

  @Patch('keys/:id/revoke')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('USER')
  revokeKey(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string
  ) {
    return this.openApiService.revokeKey(user.userId, id);
  }

  @Post('products')
  createProductByOpenApi(
    @Req() req: Request,
    @Body() dto: CreateProductDto
  ) {
    return this.openApiService.createProductByApiKey(dto, {
      xApiKey: normalizeHeader(req.headers['x-api-key']),
      authorization: normalizeHeader(req.headers.authorization),
      signature: normalizeHeader(req.headers['x-signature']),
      timestamp: normalizeHeader(req.headers['x-timestamp']),
      nonce: normalizeHeader(req.headers['x-nonce']),
      method: req.method,
      path: req.originalUrl || req.path,
      ip: req.ip,
      body: dto
    });
  }

  @Post('products/provider/sync')
  syncProviderByOpenApi(
    @Req() req: Request,
    @Body() dto: SyncProviderConfigDto
  ) {
    return this.openApiService.syncProviderByApiKey(dto, {
      xApiKey: normalizeHeader(req.headers['x-api-key']),
      authorization: normalizeHeader(req.headers.authorization),
      signature: normalizeHeader(req.headers['x-signature']),
      timestamp: normalizeHeader(req.headers['x-timestamp']),
      nonce: normalizeHeader(req.headers['x-nonce']),
      method: req.method,
      path: req.originalUrl || req.path,
      ip: req.ip,
      body: dto
    });
  }
}

@Controller('admin/open-api')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminOpenApiController {
  constructor(private readonly openApiService: OpenApiService) {}

  @Get('logs')
  listLogs(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('success') success?: string,
    @Query('userId') userId?: string,
    @Query('keyPrefix') keyPrefix?: string,
    @Query('path') path?: string
  ) {
    return this.openApiService.listCallLogs({
      page: Number(page) || 1,
      pageSize: Number(pageSize) || 20,
      success:
        success === undefined || success === ''
          ? undefined
          : success === '1' || success === 'true',
      userId,
      keyPrefix,
      path
    });
  }

  @Get('metrics')
  metrics(@Query('windowMinutes') windowMinutes?: string) {
    return this.openApiService.getCallMetrics(Number(windowMinutes) || 60);
  }
}
