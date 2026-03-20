import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { NoticeChannel } from '@prisma/client';

export class TestNoticeChannelDto {
  @IsEnum(NoticeChannel)
  channel: NoticeChannel;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  content?: string;

  @IsOptional()
  @IsString()
  tgChatId?: string;

  @IsOptional()
  @IsString()
  mobile?: string;

  @IsOptional()
  @IsString()
  openId?: string;

  @IsOptional()
  @IsString()
  templateCode?: string;
}
