import { IsDateString, IsEnum, IsOptional } from 'class-validator';
import { PayChannel } from '@prisma/client';

export class RunReconcileDto {
  @IsEnum(PayChannel)
  channel: PayChannel;

  @IsOptional()
  @IsDateString()
  bizDate?: string;
}
