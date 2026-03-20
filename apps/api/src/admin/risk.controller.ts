import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RiskService } from '../risk/risk.service';
import { RiskRuleQueryDto } from '../risk/dto/risk-rule-query.dto';
import { UpsertRiskRuleDto } from '../risk/dto/upsert-risk-rule.dto';
import { RiskHitQueryDto } from '../risk/dto/risk-hit-query.dto';
import { RiskEntityQueryDto } from '../risk/dto/risk-entity-query.dto';
import { UpsertRiskEntityDto } from '../risk/dto/upsert-risk-entity.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('admin/risk')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminRiskController {
  constructor(private readonly riskService: RiskService) {}

  @Get('overview')
  getOverview(@Query('days') days?: string) {
    const parsed = Number(days);
    return this.riskService.getOverview(Number.isFinite(parsed) ? parsed : 7);
  }

  @Get('rules')
  listRules(@Query() query: RiskRuleQueryDto) {
    return this.riskService.listRules(query);
  }

  @Post('rules')
  createRule(
    @Body() dto: UpsertRiskRuleDto,
    @CurrentUser() user: { userId: string }
  ) {
    return this.riskService.createRule({ ...dto, createdBy: user.userId });
  }

  @Patch('rules/:id')
  updateRule(
    @Param('id') id: string,
    @Body() dto: Partial<UpsertRiskRuleDto> & { enabled?: boolean },
    @CurrentUser() user: { userId: string }
  ) {
    return this.riskService.updateRule(id, { ...dto, updatedBy: user.userId });
  }

  @Get('hits')
  listHits(@Query() query: RiskHitQueryDto) {
    return this.riskService.listHits(query);
  }

  @Get('entities')
  listEntities(@Query() query: RiskEntityQueryDto) {
    return this.riskService.listEntities(query);
  }

  @Post('entities')
  upsertEntity(@Body() dto: UpsertRiskEntityDto) {
    return this.riskService.upsertEntity(dto);
  }

  @Post('entities/batch-upsert')
  batchUpsertEntities(
    @Body() dto: {
      listType: string;
      entityType: string;
      entityValues: string[];
      reason?: string;
      enabled?: boolean;
      expiresAt?: string;
    }
  ) {
    return this.riskService.batchUpsertEntities(dto);
  }

  @Get('entities/export')
  exportEntities(
    @Query('listType') listType = 'BLACKLIST',
    @Query('entityType') entityType?: string,
    @Query('enabledOnly') enabledOnly?: string
  ) {
    return this.riskService.exportEntities({
      listType,
      entityType,
      enabledOnly: enabledOnly === '1' || enabledOnly === 'true'
    });
  }

  @Patch('entities/:id')
  updateEntity(
    @Param('id') id: string,
    @Body() dto: { enabled?: boolean; reason?: string; expiresAt?: string }
  ) {
    return this.riskService.updateEntity(id, dto);
  }

  @Post('watchlist/sync')
  syncWatchlist(
    @Body() dto: { windowHours?: number; thresholdScore?: number }
  ) {
    return this.riskService.syncAutoWatchlist(dto);
  }
}
