import { IsString, MinLength } from 'class-validator';

export class VerifyEmailDto {
  @IsString()
  @MinLength(4, { message: '验证码格式不正确' })
  code: string;
}
