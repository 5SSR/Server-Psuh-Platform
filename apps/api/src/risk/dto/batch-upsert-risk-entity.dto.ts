import { IsArray, IsBoolean, IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';

export class BatchUpsertRiskEntityDto {
  @IsString()
  @MaxLength(32)
  listType: string;

  @IsString()
  @MaxLength(32)
  entityType: string;

  @IsArray()
  @IsString({ each: true })
  entityValues: string[];

  @IsOptional()
  @IsString()
  @MaxLength(200)
  reason?: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
