import { PartialType } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

import { UpsertRiskRuleDto } from './upsert-risk-rule.dto';

export class UpdateRiskRuleDto extends PartialType(UpsertRiskRuleDto) {
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}
