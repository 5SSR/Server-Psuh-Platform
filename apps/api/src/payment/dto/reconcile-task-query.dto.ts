import { Type } from 'class-transformer';
import { IsEnum, IsOptional, Max, Min } from 'class-validator';
import { PayChannel, ReconcileTaskStatus } from '@prisma/client';

export class ReconcileTaskQueryDto {
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @Min(1)
  @Max(100)
  pageSize?: number = 20;

  @IsOptional()
  @IsEnum(PayChannel)
  channel?: PayChannel;

  @IsOptional()
  @IsEnum(ReconcileTaskStatus)
  status?: ReconcileTaskStatus;
}
