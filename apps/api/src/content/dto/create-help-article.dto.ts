import { IsBoolean, IsInt, IsOptional, IsString } from 'class-validator';

export class CreateHelpArticleDto {
  @IsOptional()
  @IsString()
  category?: string;

  @IsString()
  title: string;

  @IsString()
  content: string;

  @IsOptional()
  @IsInt()
  position?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
