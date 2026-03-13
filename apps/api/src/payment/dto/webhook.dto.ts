import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { PayChannel } from '@prisma/client';

export class PaymentWebhookDto {
  @IsString()
  orderId: string;

  @IsEnum(PayChannel)
  channel: PayChannel;

  @IsNumber()
  amount: number;

  @IsNumber()
  ts: number;

  @IsString()
  sign: string;

  @IsOptional()
  payload?: Record<string, unknown>;
}
