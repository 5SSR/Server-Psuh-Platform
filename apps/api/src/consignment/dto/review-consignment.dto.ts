import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export enum ConsignmentReviewAction {
  APPROVE = 'APPROVE',
  REJECT = 'REJECT'
}

export class ReviewConsignmentDto {
  @IsEnum(ConsignmentReviewAction)
  action!: ConsignmentReviewAction;

  @IsOptional()
  @IsString()
  @MaxLength(191)
  remark?: string;
}
