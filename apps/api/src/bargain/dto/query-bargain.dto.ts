import { BargainStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';

export class QueryBargainDto {
  @IsOptional()
  @IsIn(['buyer', 'seller'])
  as?: 'buyer' | 'seller';

  @IsOptional()
  @IsEnum(BargainStatus)
  status?: BargainStatus;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}
