import { IsOptional, IsString } from 'class-validator';

import { QuerySupportTicketDto } from './query-support-ticket.dto';

export class AdminQuerySupportTicketDto extends QuerySupportTicketDto {
  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  orderId?: string;

  @IsOptional()
  @IsString()
  productId?: string;
}
