import { IsOptional, IsString } from 'class-validator';

export class DisputeDto {
  @IsString()
  reason: string;

  @IsOptional()
  evidence?: Record<string, unknown>;
}
