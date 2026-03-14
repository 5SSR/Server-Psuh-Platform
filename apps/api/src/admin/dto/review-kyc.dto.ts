import { IsIn, IsOptional, IsString } from 'class-validator';

export class ReviewKycDto {
  @IsIn(['approved', 'rejected'])
  status: 'approved' | 'rejected';

  @IsOptional()
  @IsString()
  reason?: string;
}
