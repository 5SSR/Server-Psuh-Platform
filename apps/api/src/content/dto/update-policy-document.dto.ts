import { IsBoolean, IsInt, IsOptional, IsString, Length, MaxLength } from 'class-validator';

export class UpdatePolicyDocumentDto {
  @IsOptional()
  @IsString()
  @Length(2, 64)
  code?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  title?: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsInt()
  position?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
