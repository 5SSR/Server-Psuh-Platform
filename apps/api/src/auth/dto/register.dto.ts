import { IsEmail, IsIn, IsOptional, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8, { message: '密码至少 8 位' })
  password: string;

  @IsOptional()
  @IsIn(['USER'])
  role?: 'USER'; // 统一普通用户
}
