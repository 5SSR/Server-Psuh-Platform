import { Type } from 'class-transformer';
import { IsEnum, IsIn, IsNumber, IsOptional, IsString } from 'class-validator';
import {
  DeliveryType,
  FeePayer,
  ProductCategory,
  ProductStatus,
  RiskLevel
} from '@prisma/client';

import { PaginationDto } from '../../common/dto/pagination.dto';

export const PRODUCT_SORT_VALUES = [
  'latest',
  'price_asc',
  'price_desc',
  'expire_asc',
  'seller_desc'
] as const;

export type ProductSortBy = (typeof PRODUCT_SORT_VALUES)[number];

export class QueryProductDto extends PaginationDto {
  @IsOptional()
  @IsString()
  keyword?: string;

  @IsOptional()
  @IsEnum(ProductCategory)
  category?: ProductCategory;

  @IsOptional()
  @IsString()
  region?: string;

  @IsOptional()
  @IsString()
  lineType?: string;

  @IsOptional()
  @IsEnum(DeliveryType)
  deliveryType?: DeliveryType;

  @IsOptional()
  @IsEnum(RiskLevel)
  riskLevel?: RiskLevel;

  @IsOptional()
  @IsString()
  negotiable?: string;

  @IsOptional()
  @IsString()
  consignment?: string;

  @IsOptional()
  @IsString()
  canChangeEmail?: string;

  @IsOptional()
  @IsString()
  canChangeRealname?: string;

  @IsOptional()
  @IsString()
  canTest?: string;

  @IsOptional()
  @IsString()
  canTransfer?: string;

  @IsOptional()
  @IsEnum(FeePayer)
  feePayer?: FeePayer;

  @IsOptional()
  @IsString()
  riskOnly?: string;

  @IsOptional()
  @IsString()
  urgentOnly?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  minCpu?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  minMemory?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  minDisk?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  minBandwidth?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  minPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  maxPrice?: number;

  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;

  @IsOptional()
  @IsIn(PRODUCT_SORT_VALUES)
  sortBy?: ProductSortBy;
}
