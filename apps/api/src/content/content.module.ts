import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ContentService } from './content.service';
import { ContentController } from './content.controller';
import { AdminContentController } from './admin-content.controller';

@Module({
  imports: [PrismaModule],
  providers: [ContentService],
  controllers: [ContentController, AdminContentController],
  exports: [ContentService]
})
export class ContentModule {}
