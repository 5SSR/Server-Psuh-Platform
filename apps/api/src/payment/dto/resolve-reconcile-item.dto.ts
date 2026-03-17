import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ReconcileItemStatus } from '@prisma/client';

export class ResolveReconcileItemDto {
  @IsEnum(ReconcileItemStatus)
  status: ReconcileItemStatus;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  note?: string;
}
