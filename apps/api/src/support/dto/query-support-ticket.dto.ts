import { SupportTicketStatus, SupportTicketType } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

import { PaginationDto } from '../../common/dto/pagination.dto';

export class QuerySupportTicketDto extends PaginationDto {
  @IsOptional()
  @IsEnum(SupportTicketStatus)
  status?: SupportTicketStatus;

  @IsOptional()
  @IsEnum(SupportTicketType)
  type?: SupportTicketType;

  @IsOptional()
  @IsString()
  keyword?: string;
}
