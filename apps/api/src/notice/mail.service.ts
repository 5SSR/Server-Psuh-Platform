import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get('SMTP_HOST');
    if (host) {
      this.transporter = nodemailer.createTransport({
        host,
        port: Number(this.configService.get('SMTP_PORT') || 465),
        secure: this.configService.get('SMTP_SECURE') !== 'false',
        auth: {
          user: this.configService.get('SMTP_USER'),
          pass: this.configService.get('SMTP_PASS')
        }
      });
    }
  }

  async send(to: string, subject: string, html: string) {
    if (!this.transporter) {
      this.logger.warn(`[Mail] SMTP not configured, skip sending to ${to}`);
      return { ok: false, reason: 'SMTP 未配置' } as const;
    }
    try {
      await this.transporter.sendMail({
        from: this.configService.get('SMTP_FROM') || this.configService.get('SMTP_USER'),
        to,
        subject,
        html
      });
      this.logger.log(`[Mail] Sent "${subject}" to ${to}`);
      return { ok: true } as const;
    } catch (err) {
      this.logger.error(`[Mail] Failed to send to ${to}`, err);
      return {
        ok: false,
        reason: err instanceof Error ? err.message : '邮件发送失败'
      } as const;
    }
  }
}
