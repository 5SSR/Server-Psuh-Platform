import { Module } from '@nestjs/common';

import { ProductModule } from '../product/product.module';
import { PrismaModule } from '../prisma/prisma.module';

import { AdminOpenApiController, OpenApiController } from './open-api.controller';
import { OpenApiService } from './open-api.service';

@Module({
  imports: [PrismaModule, ProductModule],
  controllers: [OpenApiController, AdminOpenApiController],
  providers: [OpenApiService],
  exports: [OpenApiService]
})
export class OpenApiModule {}
