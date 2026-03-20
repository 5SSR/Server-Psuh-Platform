import { IsArray, IsBoolean, IsObject, IsOptional, IsString } from 'class-validator';

class BuyerChecklistDto {
  @IsOptional()
  @IsBoolean()
  configMatch?: boolean;

  @IsOptional()
  @IsBoolean()
  panelAccessible?: boolean;

  @IsOptional()
  @IsBoolean()
  expireMatched?: boolean;

  @IsOptional()
  @IsBoolean()
  lineQualityOk?: boolean;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  evidenceUrls?: string[];
}

export class ConfirmDto {
  @IsOptional()
  @IsString()
  remark?: string;

  @IsOptional()
  @IsObject()
  checklist?: BuyerChecklistDto;
}
