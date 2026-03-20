import { IsIn, IsOptional, IsString } from 'class-validator';

export class FinanceExportQueryDto {
  @IsIn(['orders', 'settlements', 'refunds', 'withdrawals'])
  type: 'orders' | 'settlements' | 'refunds' | 'withdrawals';

  @IsOptional()
  @IsString()
  from?: string;

  @IsOptional()
  @IsString()
  to?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  channel?: string;

  @IsOptional()
  @IsIn(['csv'])
  format?: 'csv';
}
