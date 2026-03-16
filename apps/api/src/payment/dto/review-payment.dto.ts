import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class ReviewPaymentDto {
  @IsIn(['NORMAL', 'SUSPICIOUS', 'FRAUD'])
  status: 'NORMAL' | 'SUSPICIOUS' | 'FRAUD';

  @IsOptional()
  @IsString()
  @MaxLength(200)
  remark?: string;
}
