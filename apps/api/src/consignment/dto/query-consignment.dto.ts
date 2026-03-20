import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ConsignmentApplicationStatus } from '@prisma/client';

import { PaginationDto } from '../../common/dto/pagination.dto';

export class QueryConsignmentDto extends PaginationDto {
  @IsOptional()
  @IsEnum(ConsignmentApplicationStatus)
  status?: ConsignmentApplicationStatus;

  @IsOptional()
  @IsString()
  keyword?: string;
}
