import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsDateString,
  MaxLength,
  Min
} from 'class-validator';
import { ProductCategory } from '@prisma/client';

export class CreateWantedDto {
  @IsString()
  @MaxLength(120)
  title: string;

  @IsOptional()
  @IsEnum(ProductCategory)
  category?: ProductCategory;

  @IsString()
  @MaxLength(64)
  region: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  lineType?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  cpuCores?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  memoryGb?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  diskGb?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  bandwidthMbps?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  budgetMin?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  budgetMax?: number;

  @IsOptional()
  @IsBoolean()
  acceptPremium?: boolean;

  @IsOptional()
  @IsDateString()
  expireAt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;
}
