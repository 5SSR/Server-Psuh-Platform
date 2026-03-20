import { IsArray, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateOrderReviewDto {
  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

