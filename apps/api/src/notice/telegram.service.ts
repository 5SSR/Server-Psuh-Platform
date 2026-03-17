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
      return;
    }
    try {
      const url = `https://api.telegram.org/bot${this.botToken}/sendMessage`;
      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' })
      });
      this.logger.log(`[Telegram] Sent message to chat ${chatId}`);
    } catch (err) {
      this.logger.error(`[Telegram] Failed to send to ${chatId}`, err);
    }
  }
}
