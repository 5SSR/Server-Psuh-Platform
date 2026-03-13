import { IsEnum, IsOptional, IsString } from 'class-validator';
import { DisputeStatus } from '@prisma/client';

export class DisputeDecisionDto {
  @IsEnum(DisputeStatus)
  status: DisputeStatus; // RESOLVED / REJECTED

  @IsEnum(['REFUND', 'RELEASE'] as const)
  action: 'REFUND' | 'RELEASE'; // 纠纷裁决动作：退款或放款

  @IsOptional()
  @IsString()
  result?: string; // 简要结论

  @IsOptional()
  @IsString()
  resolution?: string; // 处理详情
}
