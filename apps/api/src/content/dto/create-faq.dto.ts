import { IsBoolean, IsInt, IsOptional, IsString } from 'class-validator';

export class CreateFaqDto {
  @IsOptional()
  @IsString()
  category?: string;

  @IsString()
  question: string;

  @IsString()
  answer: string;

  @IsOptional()
  @IsInt()
  position?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
