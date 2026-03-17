import { Module } from '@nestjs/common';
import { RiskService } from './risk.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [RiskService],
  exports: [RiskService]
})
export class RiskModule {}
