import { Type } from 'class-transformer';
import { IsNumber, IsOptional, Max, Min } from 'class-validator';

export class SyncWatchlistDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(24 * 14)
  windowHours?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(4)
  @Max(200)
  thresholdScore?: number;
}
