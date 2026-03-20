import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class TelegramService {
  private readonly logger = new Logger(TelegramService.name);
  private botToken: string | undefined;

  constructor(private readonly configService: ConfigService) {
    this.botToken = this.configService.get('TELEGRAM_BOT_TOKEN');
  }

  async sendMessage(chatId: string, text: string) {
    if (!this.botToken) {
      this.logger.warn('[Telegram] Bot token not configured, skip');
      return { ok: false, reason: 'Telegram Bot 未配置' } as const;
    }
    try {
      const url = `https://api.telegram.org/bot${this.botToken}/sendMessage`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' })
      });
      if (!res.ok) {
        const body = await res.text();
        this.logger.error(`[Telegram] Failed to send to ${chatId}, status=${res.status}, body=${body}`);
        return { ok: false, reason: `HTTP ${res.status}` } as const;
      }
      this.logger.log(`[Telegram] Sent message to chat ${chatId}`);
      return { ok: true } as const;
    } catch (err) {
      this.logger.error(`[Telegram] Failed to send to ${chatId}`, err);
      return {
        ok: false,
        reason: err instanceof Error ? err.message : 'Telegram 发送失败'
      } as const;
    }
  }
}
