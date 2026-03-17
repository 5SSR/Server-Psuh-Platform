import { Type } from 'class-transformer';
import { IsEnum, IsOptional, IsString, Max, Min } from 'class-validator';
import { RiskAction, RiskScene } from '@prisma/client';

export class RiskHitQueryDto {
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
  @IsEnum(RiskAction)
  action?: RiskAction;

  @IsOptional()
  @IsString()
  userId?: string;
}
