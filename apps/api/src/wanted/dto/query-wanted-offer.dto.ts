import { WantedOfferStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';

import { PaginationDto } from '../../common/dto/pagination.dto';

export class QueryWantedOfferDto extends PaginationDto {
  @IsOptional()
  @IsEnum(WantedOfferStatus)
  status?: WantedOfferStatus;

  @IsOptional()
  @IsUUID()
  wantedId?: string;
}
