import { IsOptional, IsString } from 'class-validator';

// 卖家提交审核时附加备注
export class SubmitProductDto {
  @IsOptional()
  @IsString()
  remark?: string;
}
