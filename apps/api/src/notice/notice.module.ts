import { Module } from '@nestjs/common';
import { NoticeController } from './notice.controller';
import { NoticeService } from './notice.service';
import { MailService } from './mail.service';
import { TelegramService } from './telegram.service';

@Module({
  controllers: [NoticeController],
  providers: [NoticeService, MailService, TelegramService],
  exports: [NoticeService, MailService, TelegramService]
})
export class NoticeModule {}
