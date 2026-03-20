import { IsArray, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateAdminNoticeDto {
  @IsOptional()
  @IsString()
  userId?: string;

  @IsString()
  @MaxLength(50)
  type: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  title?: string;

  @IsString()
  @MaxLength(500)
  content: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  channels?: string[];

  @IsOptional()
  @IsString()
  tgChatId?: string;
}
