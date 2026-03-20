import { IsEnum, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { UserStatus } from '@prisma/client';

import { PaginationDto } from '../../common/dto/pagination.dto';

export class QueryUserDto extends PaginationDto {
  @IsOptional()
  @IsIn(['USER', 'ADMIN'])
  role?: 'USER' | 'ADMIN';

  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  keyword?: string;
}
