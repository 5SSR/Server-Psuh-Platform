import { IsOptional, IsString } from 'class-validator';

export class ConfirmDto {
  @IsOptional()
  @IsString()
  remark?: string;
}
