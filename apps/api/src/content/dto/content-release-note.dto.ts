import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ContentReleaseNoteDto {
  @IsOptional()
  @IsString()
  @MaxLength(191)
  note?: string;
}
