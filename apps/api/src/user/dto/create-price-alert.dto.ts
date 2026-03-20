import { Type } from 'class-transformer';
import { IsNumber, IsString, Min } from 'class-validator';

export class CreatePriceAlertDto {
  @IsString()
  productId: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  targetPrice: number;
}
