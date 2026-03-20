import { IsEnum, IsOptional, IsString } from 'class-validator';
import { SettlementStatus } from '@prisma/client';

import { PaginationDto } from '../../common/dto/pagination.dto';

export class QuerySettlementDto extends PaginationDto {
  @IsOptional()
  @IsEnum(SettlementStatus)
  status?: SettlementStatus;

  @IsOptional()
  @IsString()
  sellerId?: string;

  @IsOptional()
  @IsString()
  orderId?: string;
}
