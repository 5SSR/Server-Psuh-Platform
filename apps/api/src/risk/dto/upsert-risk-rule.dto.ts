import { Type } from 'class-transformer';
import { IsEnum, IsNotEmpty, IsObject, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';
import { RiskAction, RiskScene } from '@prisma/client';

export class UpsertRiskRuleDto {
  @IsString()
  @MinLength(2)
  @MaxLength(64)
  code: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @IsEnum(RiskScene)
  scene: RiskScene;

  @IsEnum(RiskAction)
  action: RiskAction;

  @Type(() => Number)
  @Min(1)
  priority: number = 100;

  @IsObject()
  @IsNotEmpty()
  condition: Record<string, unknown>;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  reason?: string;
}
