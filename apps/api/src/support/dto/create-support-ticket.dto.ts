import { SupportTicketType } from '@prisma/client';
import { IsArray, IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateSupportTicketDto {
  @IsOptional()
  @IsEnum(SupportTicketType)
  type?: SupportTicketType;

  @IsOptional()
  @IsString()
  orderId?: string;

  @IsOptional()
  @IsString()
  productId?: string;

  @IsString()
  @MinLength(4)
  @MaxLength(120)
  subject: string;

  @IsString()
  @MinLength(8)
  content: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  evidence?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(191)
  contact?: string;
}
