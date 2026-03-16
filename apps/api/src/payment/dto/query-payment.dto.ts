import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { PayChannel, PayStatus } from '@prisma/client';

export class QueryPaymentDto extends PaginationDto {
  @IsOptional()
  @IsEnum(PayStatus)
  payStatus?: PayStatus;

  @IsOptional()
  @IsEnum(PayChannel)
  channel?: PayChannel;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  orderId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  tradeNo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  userId?: string;
}
