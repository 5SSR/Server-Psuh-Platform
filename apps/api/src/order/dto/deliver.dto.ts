import { IsOptional, IsString } from 'class-validator';

export class DeliverDto {
  @IsOptional()
  @IsString()
  providerAccount?: string;

  @IsOptional()
  @IsString()
  panelUrl?: string;

  @IsOptional()
  @IsString()
  loginInfo?: string;

  @IsOptional()
  @IsString()
  remark?: string;
}
