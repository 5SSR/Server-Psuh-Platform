import { IsOptional, IsString, MaxLength } from 'class-validator';

export class SyncProviderConfigDto {
  @IsString()
  @MaxLength(40)
  panelType!: string;

  @IsString()
  @MaxLength(500)
  endpoint!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  apiKey?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  serverId?: string;
}

