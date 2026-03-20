import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateConsignmentDto {
  @IsString()
  productId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(191)
  sellerNote?: string;
}
