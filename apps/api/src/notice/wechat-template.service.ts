import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class WechatTemplateService {
  private readonly logger = new Logger(WechatTemplateService.name);

  constructor(private readonly configService: ConfigService) {}

  async send(input: {
    openId?: string;
    templateCode?: string;
    title: string;
    content: string;
    payload?: Record<string, unknown>;
  }) {
    const webhook = this.configService.get('WECHAT_TEMPLATE_WEBHOOK_URL');
    if (!webhook) {
      this.logger.warn('[WECHAT_TEMPLATE] WECHAT_TEMPLATE_WEBHOOK_URL 未配置，跳过发送');
      return { ok: false, reason: '微信模板通道未配置' } as const;
    }
    try {
      const res = await fetch(webhook, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.configService.get('WECHAT_TEMPLATE_WEBHOOK_TOKEN')
            ? { Authorization: `Bearer ${this.configService.get('WECHAT_TEMPLATE_WEBHOOK_TOKEN')}` }
            : {})
        },
        body: JSON.stringify({
          openId: input.openId,
          templateCode: input.templateCode,
          title: input.title,
          content: input.content,
          payload: input.payload
        })
      });
      if (!res.ok) {
        const body = await res.text();
        this.logger.error(`[WECHAT_TEMPLATE] 发送失败 status=${res.status} body=${body}`);
        return { ok: false, reason: `HTTP ${res.status}` } as const;
      }
      return { ok: true } as const;
    } catch (error) {
      const reason = error instanceof Error ? error.message : '微信模板发送失败';
      this.logger.error(`[WECHAT_TEMPLATE] 发送异常: ${reason}`);
      return { ok: false, reason } as const;
    }
  }
}

