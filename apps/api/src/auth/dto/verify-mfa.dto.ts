import { IsString } from 'class-validator';

export class VerifyMfaDto {
  @IsString()
  token: string;
}
