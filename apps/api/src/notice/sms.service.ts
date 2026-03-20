import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  constructor(private readonly configService: ConfigService) {}

  async send(to: string, text: string) {
    const webhook = this.configService.get('SMS_WEBHOOK_URL');
    if (!webhook) {
      this.logger.warn('[SMS] SMS_WEBHOOK_URL 未配置，跳过发送');
      return { ok: false, reason: 'SMS 通道未配置' } as const;
    }
    try {
      const res = await fetch(webhook, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.configService.get('SMS_WEBHOOK_TOKEN')
            ? { Authorization: `Bearer ${this.configService.get('SMS_WEBHOOK_TOKEN')}` }
            : {})
        },
        body: JSON.stringify({
          to,
          text
        })
      });
      if (!res.ok) {
        const body = await res.text();
        this.logger.error(`[SMS] 发送失败 status=${res.status} body=${body}`);
        return { ok: false, reason: `HTTP ${res.status}` } as const;
      }
      return { ok: true } as const;
    } catch (error) {
      const reason = error instanceof Error ? error.message : '短信发送失败';
      this.logger.error(`[SMS] 发送异常: ${reason}`);
      return { ok: false, reason } as const;
    }
  }
}

