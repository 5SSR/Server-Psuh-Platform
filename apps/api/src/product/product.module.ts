import { Module } from '@nestjs/common';

import { RiskModule } from '../risk/risk.module';

import { ProductService } from './product.service';
import { ProductController } from './product.controller';

@Module({
  imports: [RiskModule],
  controllers: [ProductController],
  providers: [ProductService],
  exports: [ProductService]
})
export class ProductModule {}
