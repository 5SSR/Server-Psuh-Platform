import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class ReviewOrderRiskDto {
  @IsBoolean()
  approved: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(191)
  remark?: string;
}
