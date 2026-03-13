import { IsEnum, IsOptional } from 'class-validator';
import { PayChannel } from '@prisma/client';

export class PayOrderDto {
  @IsEnum(PayChannel)
  channel: PayChannel = PayChannel.BALANCE;

  // 预留扩展支付信息（如回调签名等）
  @IsOptional()
  meta?: Record<string, unknown>;
}
