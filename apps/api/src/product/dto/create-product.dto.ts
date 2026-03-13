import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  IsArray
} from 'class-validator';
import { DeliveryType, ProductCategory } from '@prisma/client';

export class CreateProductDto {
  @IsString()
  title: string;

  @IsEnum(ProductCategory)
  category: ProductCategory;

  @IsString()
  region: string;

  @IsOptional()
  @IsString()
  datacenter?: string;

  @IsOptional()
  @IsString()
  lineType?: string;

  @IsOptional()
  @IsString()
  providerName?: string;

  @IsOptional()
  @IsString()
  providerUrl?: string;

  @IsOptional()
  @IsString()
  cpuModel?: string;

  @IsOptional()
  @IsInt()
  cpuCores?: number;

  @IsOptional()
  @IsInt()
  memoryGb?: number;

  @IsOptional()
  @IsInt()
  diskGb?: number;

  @IsOptional()
  @IsString()
  diskType?: string;

  @IsOptional()
  @IsInt()
  bandwidthMbps?: number;

  @IsOptional()
  @IsInt()
  trafficLimit?: number;

  @IsOptional()
  @IsInt()
  ipCount?: number;

  @IsOptional()
  @IsInt()
  ddos?: number;

  @IsNumber()
  @Min(0)
  salePrice: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  renewPrice?: number;

  @IsOptional()
  @IsString()
  expireAt?: string;

  @IsBoolean()
  negotiable: boolean;

  @IsBoolean()
  consignment: boolean;

  @IsOptional()
  @IsBoolean()
  isPremium?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  premiumRate?: number;

  @IsEnum(DeliveryType)
  deliveryType: DeliveryType;

  @IsBoolean()
  canChangeEmail: boolean;

  @IsBoolean()
  canChangeRealname: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  riskTags?: string[];

  @IsOptional()
  @IsString()
  description?: string;
}
