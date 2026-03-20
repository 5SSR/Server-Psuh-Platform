import { IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateBargainDto {
  @IsString()
  productId: string;

  @IsNumber()
  @Min(0.01)
  offerPrice: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  remark?: string;
}
