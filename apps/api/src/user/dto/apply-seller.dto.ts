import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ApplySellerDto {
  @IsOptional()
  @IsString()
  @MaxLength(300)
  reason?: string;
}
