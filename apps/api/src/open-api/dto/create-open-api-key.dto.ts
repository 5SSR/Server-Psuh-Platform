import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateOpenApiKeyDto {
  @IsString()
  @MaxLength(64)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  scope?: string;

  @IsOptional()
  @IsString()
  expiresAt?: string;
}
