import { IsEnum, IsString, MaxLength, MinLength, ValidateIf } from 'class-validator';

export enum AdminBargainAction {
  CLOSE = 'CLOSE',
  NOTE = 'NOTE',
  ESCALATE_DISPUTE = 'ESCALATE_DISPUTE'
}

export class AdminReviewBargainDto {
  @IsEnum(AdminBargainAction)
  action: AdminBargainAction;

  @ValidateIf((dto: AdminReviewBargainDto) => dto.action === AdminBargainAction.CLOSE)
  @IsString()
  @MinLength(2)
  @MaxLength(500)
  remarkForClose?: string;

  @ValidateIf(
    (dto: AdminReviewBargainDto) =>
      dto.action === AdminBargainAction.NOTE ||
      dto.action === AdminBargainAction.ESCALATE_DISPUTE
  )
  @IsString()
  @MinLength(2)
  @MaxLength(500)
  remark?: string;
}
