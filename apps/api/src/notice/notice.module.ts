import { Module } from '@nestjs/common';

import { NoticeController } from './notice.controller';
import { NoticeService } from './notice.service';
import { MailService } from './mail.service';
import { TelegramService } from './telegram.service';
import { SmsService } from './sms.service';
import { WechatTemplateService } from './wechat-template.service';

@Module({
  controllers: [NoticeController],
  providers: [NoticeService, MailService, TelegramService, SmsService, WechatTemplateService],
  exports: [NoticeService, MailService, TelegramService, SmsService, WechatTemplateService]
})
export class NoticeModule {}
