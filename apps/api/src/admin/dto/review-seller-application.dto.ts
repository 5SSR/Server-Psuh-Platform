import { IsEnum, IsOptional, IsString } from 'class-validator';
import { SellerApplicationStatus } from '@prisma/client';

export class ReviewSellerApplicationDto {
  @IsEnum(SellerApplicationStatus)
  status: SellerApplicationStatus;

  @IsOptional()
  @IsString()
  reason?: string;
}
