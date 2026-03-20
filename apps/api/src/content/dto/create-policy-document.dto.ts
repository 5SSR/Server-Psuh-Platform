import { IsBoolean, IsInt, IsOptional, IsString, Length, MaxLength } from 'class-validator';

export class CreatePolicyDocumentDto {
  @IsString()
  @Length(2, 64)
  code: string;

  @IsString()
  @MaxLength(120)
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
