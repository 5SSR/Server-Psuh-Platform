import { IsBoolean, IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateRiskEntityDto {
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  reason?: string;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
