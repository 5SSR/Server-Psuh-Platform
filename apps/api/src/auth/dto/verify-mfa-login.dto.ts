import { IsString, Length } from 'class-validator';

export class VerifyMfaLoginDto {
  @IsString()
  ticket: string;

  @IsString()
  @Length(6, 10)
  token: string;
}
