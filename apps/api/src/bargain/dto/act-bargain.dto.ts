import { IsEnum, IsNumber, IsOptional, IsString, MaxLength, Min, ValidateIf } from 'class-validator';

export enum BargainAction {
  COUNTER = 'COUNTER',
  ACCEPT = 'ACCEPT',
  REJECT = 'REJECT',
  CANCEL = 'CANCEL'
}

export class ActBargainDto {
  @IsEnum(BargainAction)
  action: BargainAction;

  @ValidateIf((dto: ActBargainDto) => dto.action === BargainAction.COUNTER)
  @IsNumber()
  @Min(0.01)
  price?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  remark?: string;
}
