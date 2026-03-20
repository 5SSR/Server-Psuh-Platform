import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateIf,
  ValidateNested
} from 'class-validator';

class FeeTierDto {
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  upTo?: number | null;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  @Max(1)
  rate!: number;
}

export class UpdateOrderFeeConfigDto {
  @IsIn(['FIXED', 'RATE', 'TIER'])
  mode!: 'FIXED' | 'RATE' | 'TIER';

  @IsIn(['BUYER', 'SELLER', 'SHARED'])
  payer!: 'BUYER' | 'SELLER' | 'SHARED';

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  fixedFee?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  @Max(1)
  rate?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  minFee?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FeeTierDto)
  tiers?: FeeTierDto[];

  @IsOptional()
  @IsString()
  remark?: string;
}
