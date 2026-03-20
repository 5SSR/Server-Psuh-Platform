import { BargainStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';

import { PaginationDto } from '../../common/dto/pagination.dto';

export class AdminQueryBargainDto extends PaginationDto {
  @IsOptional()
  @IsEnum(BargainStatus)
  status?: BargainStatus;

  @IsOptional()
  @IsString()
  keyword?: string;

  @Type(() => Boolean)
  @IsOptional()
  @IsBoolean()
  hasOrder?: boolean;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  productId?: string;
}
