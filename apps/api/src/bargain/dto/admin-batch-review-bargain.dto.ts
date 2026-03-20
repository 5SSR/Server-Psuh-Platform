import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf
} from 'class-validator';

import { AdminBargainAction } from './admin-review-bargain.dto';

export class AdminBatchReviewBargainDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @Type(() => String)
  ids: string[];

  @IsEnum(AdminBargainAction)
  action: AdminBargainAction;

  @ValidateIf((dto: AdminBatchReviewBargainDto) => dto.action === AdminBargainAction.CLOSE)
  @IsString()
  @MinLength(2)
  @MaxLength(500)
  remarkForClose?: string;

  @ValidateIf(
    (dto: AdminBatchReviewBargainDto) =>
      dto.action === AdminBargainAction.NOTE ||
      dto.action === AdminBargainAction.ESCALATE_DISPUTE
  )
  @IsString()
  @MinLength(2)
  @MaxLength(500)
  remark?: string;
}
