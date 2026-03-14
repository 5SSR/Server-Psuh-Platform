import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class ReviewWithdrawDto {
  @IsIn(['APPROVED', 'REJECTED', 'PAID'])
  action: 'APPROVED' | 'REJECTED' | 'PAID';

  @IsOptional()
  @IsString()
  @MaxLength(200)
  remark?: string;
}
