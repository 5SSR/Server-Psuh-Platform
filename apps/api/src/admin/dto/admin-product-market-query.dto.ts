import { IsEnum, IsIn, IsOptional, IsString } from 'class-validator';
import { ProductCategory, ProductStatus, RiskLevel } from '@prisma/client';

import { PaginationDto } from '../../common/dto/pagination.dto';

export class AdminProductMarketQueryDto extends PaginationDto {
  @IsOptional()
  @IsString()
  keyword?: string;

  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;

  @IsOptional()
  @IsEnum(ProductCategory)
  category?: ProductCategory;

  @IsOptional()
  @IsString()
  region?: string;

  @IsOptional()
  @IsEnum(RiskLevel)
  riskLevel?: RiskLevel;

  @IsOptional()
  @IsIn(['true', 'false', '1', '0', 'yes', 'no'])
  featured?: string;
}
