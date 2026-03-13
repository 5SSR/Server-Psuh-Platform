import { IsEnum, IsString } from 'class-validator';
import { ProductImageType } from '@prisma/client';

export class ProductImageDto {
  @IsEnum(ProductImageType)
  type: ProductImageType;

  @IsString()
  url: string;
}
