import { IsEnum, IsOptional } from 'class-validator';
import { OrderStatus } from '@prisma/client';

import { PaginationDto } from '../../common/dto/pagination.dto';

export class AdminOrderQueryDto extends PaginationDto {
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;
}
