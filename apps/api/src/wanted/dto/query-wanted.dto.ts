import { ProductCategory, WantedStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

import { PaginationDto } from '../../common/dto/pagination.dto';

export class QueryWantedDto extends PaginationDto {
  @IsOptional()
  @IsEnum(WantedStatus)
  status?: WantedStatus;

  @IsOptional()
  @IsEnum(ProductCategory)
  category?: ProductCategory;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  region?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  lineType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  keyword?: string;
}
