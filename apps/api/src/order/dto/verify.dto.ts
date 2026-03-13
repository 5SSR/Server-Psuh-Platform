import { IsEnum, IsOptional } from 'class-validator';
import { VerifyResult } from '@prisma/client';

export class VerifyDto {
  @IsEnum(VerifyResult)
  result: VerifyResult;

  @IsOptional()
  checklist?: Record<string, unknown>;
}
