import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator';

export class CreateWantedOfferDto {
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  offerPrice: number;

  @IsOptional()
  @IsUUID()
  productId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  message?: string;
}
