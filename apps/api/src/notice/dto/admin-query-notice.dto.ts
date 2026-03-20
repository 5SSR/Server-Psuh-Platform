import { IsOptional, IsString } from 'class-validator';

import { QueryNoticeDto } from './query-notice.dto';

export class AdminQueryNoticeDto extends QueryNoticeDto {
  @IsOptional()
  @IsString()
  userId?: string;
}
