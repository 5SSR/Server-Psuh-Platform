import { IsEmail, IsString, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(4, { message: '验证码格式不正确' })
  code: string;

  @IsString()
  @MinLength(8, { message: '新密码至少 8 位' })
  newPassword: string;
}
