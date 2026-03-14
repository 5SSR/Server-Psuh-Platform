import { IsOptional, IsString, MinLength } from 'class-validator';

export class SubmitKycDto {
  @IsString()
  @MinLength(2, { message: '姓名至少 2 个字符' })
  realName: string;

  @IsString()
  @MinLength(6, { message: '证件号格式不正确' })
  idNumber: string;

  @IsOptional()
  @IsString()
  docImages?: string;
}
