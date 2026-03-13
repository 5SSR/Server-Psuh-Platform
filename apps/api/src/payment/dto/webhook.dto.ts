import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { PayChannel } from '@prisma/client';

export class PaymentWebhookDto {
  @IsString()
  orderId: string;

  @IsEnum(PayChannel)
  channel: PayChannel;

  @Type(() => Number)
  @IsNumber()
  amount: number;

  @Type(() => Number)
  @IsNumber()
  ts: number;

  @IsString()
  sign: string;

  @IsOptional()
  @IsString()
  tradeNo?: string;

  @IsOptional()
  payload?: Record<string, unknown>;

  [key: string]: any;
}
