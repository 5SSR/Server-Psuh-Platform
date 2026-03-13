import { IsOptional, IsString } from 'class-validator';

export class RefundDto {
  @IsString()
  reason: string;

  @IsOptional()
  evidence?: Record<string, unknown>;
}
