import { IsOptional, IsString } from 'class-validator';

export class DisputeEvidenceDto {
  @IsString()
  url: string;

  @IsOptional()
  @IsString()
  note?: string;
}
