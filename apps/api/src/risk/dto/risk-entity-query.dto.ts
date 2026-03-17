import { Type } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, Max, Min } from 'class-validator';

export class RiskEntityQueryDto {
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
  @IsString()
  listType?: string;

  @IsOptional()
  @IsString()
  entityType?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  enabled?: boolean;
}
