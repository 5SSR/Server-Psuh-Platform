import { Type } from 'class-transformer';
import { IsEnum, IsOptional, Max, Min } from 'class-validator';
import { ReconcileItemStatus } from '@prisma/client';

export class ReconcileItemQueryDto {
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
  @IsEnum(ReconcileItemStatus)
  status?: ReconcileItemStatus;
}
