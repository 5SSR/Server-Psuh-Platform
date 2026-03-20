import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min
} from 'class-validator';

export class UpsertStoreProfileDto {
  @IsString()
  @MaxLength(60)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  slug?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  logo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  banner?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  intro?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notice?: string;

  @IsOptional()
  @IsBoolean()
  verifiedBadge?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  responseMinutes?: number;
}

