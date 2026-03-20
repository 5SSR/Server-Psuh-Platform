import { IsEnum, IsOptional } from 'class-validator';
import { ProductStatus } from '@prisma/client';

import { PaginationDto } from '../../common/dto/pagination.dto';

export class QueryMyProductsDto extends PaginationDto {
  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;
}
