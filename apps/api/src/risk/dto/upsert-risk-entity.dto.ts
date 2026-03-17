import { IsBoolean, IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpsertRiskEntityDto {
  @IsString()
  @MaxLength(32)
  listType: string;

  @IsString()
  @MaxLength(32)
  entityType: string;

  @IsString()
  @MaxLength(191)
  entityValue: string;

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
