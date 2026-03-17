import { Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional, Max, Min } from 'class-validator';
import { RiskScene } from '@prisma/client';

export class RiskRuleQueryDto {
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @Min(1)
  @Max(100)
  pageSize?: number = 20;

  @IsOptional()
  @IsEnum(RiskScene)
  scene?: RiskScene;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  enabled?: boolean;
}
