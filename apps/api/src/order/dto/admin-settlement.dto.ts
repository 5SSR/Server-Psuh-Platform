import { IsOptional, IsString } from 'class-validator';

export class AdminSettlementDto {
  @IsOptional()
  @IsString()
  remark?: string;
}
