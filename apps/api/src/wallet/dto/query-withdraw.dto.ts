import { IsIn, IsOptional } from 'class-validator';

import { PaginationDto } from '../../common/dto/pagination.dto';

export class QueryWithdrawDto extends PaginationDto {
  @IsOptional()
  @IsIn(['pending', 'approved', 'paid', 'rejected'])
  status?: 'pending' | 'approved' | 'paid' | 'rejected';
}
