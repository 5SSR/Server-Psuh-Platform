import { IsEnum, IsIn, IsOptional, IsString } from 'class-validator';
import { DisputeStatus } from '@prisma/client';

export class DisputeDecisionDto {
  @IsEnum(DisputeStatus)
  status: DisputeStatus = DisputeStatus.RESOLVED; // 仅支持 RESOLVED/REJECTED

  @IsIn(['REFUND', 'RELEASE'])
  action: 'REFUND' | 'RELEASE' = 'REFUND'; // 纠纷裁决动作：退款或放款

  @IsOptional()
  @IsString()
  result?: string; // 简要结论

  @IsOptional()
  @IsString()
  resolution?: string; // 处理详情
}
