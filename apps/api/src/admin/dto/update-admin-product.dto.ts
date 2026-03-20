import { PartialType } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min
} from 'class-validator';
import { ProductStatus, RiskLevel } from '@prisma/client';

import { CreateProductDto } from '../../product/dto/create-product.dto';

export class UpdateAdminProductDto extends PartialType(CreateProductDto) {
  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;

  @IsOptional()
  @IsEnum(RiskLevel)
  riskLevel?: RiskLevel;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  riskTags?: string[];

  @IsOptional()
  @IsBoolean()
  abuseHistory?: boolean;

  @IsOptional()
  @IsBoolean()
  accountRecallRisk?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(5)
  premiumRate?: number;
}
