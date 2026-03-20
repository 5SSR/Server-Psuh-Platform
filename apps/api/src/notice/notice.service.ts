import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { NoticeChannel, NoticeStatus } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

import { QueryNoticeDto } from './dto/query-notice.dto';
import { AdminQueryNoticeDto } from './dto/admin-query-notice.dto';
import { CreateAdminNoticeDto } from './dto/create-admin-notice.dto';
import { MailService } from './mail.service';
import { TelegramService } from './telegram.service';
import { SmsService } from './sms.service';
import { WechatTemplateService } from './wechat-template.service';

@Injectable()
export class NoticeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
    private readonly telegramService: TelegramService,
    private readonly smsService: SmsService,
    private readonly wechatTemplateService: WechatTemplateService
  ) {}

  private presentRole(role: string) {
    return role === 'ADMIN' ? 'ADMIN' : 'USER';
  }

  private parseChannels(input?: string[] | string) {
    if (!input) return [];
    const list = Array.isArray(input) ? input : String(input).split(',');
    const channels = list
      .map((item) => String(item).trim().toUpperCase())
      .filter((item) => ['SITE', 'EMAIL', 'TG', 'SMS', 'WECHAT_TEMPLATE'].includes(item))
      .map((item) => item as NoticeChannel);
    return Array.from(new Set(channels));
  }

  private get defaultChannels() {
    const envChannels = this.parseChannels(process.env.NOTICE_DEFAULT_CHANNELS);
    return envChannels.length > 0 ? envChannels : [NoticeChannel.SITE];
  }

  private mergePayload(
    payload?: Record<string, unknown>,
    title?: string | null,
    content?: string | null
  ) {
    const base = payload ? { ...payload } : {};
    return {
      ...base,
      ...(title ? { title } : {}),
      ...(content ? { content } : {})
    };
  }

  private buildExternalText(type: string, title?: string | null, content?: string | null) {
    const headline = title || type;
    if (!content) return headline;
    return `${headline}\n${content}`;
  }

  async createSystemNotice(input: {
    userId: string;
    type: string;
    title?: string | null;
    content?: string | null;
    payload?: Record<string, unknown>;
    channels?: string[] | string;
    tgChatId?: string;
  }) {
    const channels = this.parseChannels(input.channels);
    const targets = channels.length > 0 ? channels : this.defaultChannels;
    const payload = this.mergePayload(input.payload, input.title, input.content);
    const payloadRecord = payload as Record<string, unknown>;
    const text = this.buildExternalText(input.type, input.title, input.content);

    const user = await this.prisma.user.findUnique({
      where: { id: input.userId },
      select: { id: true, email: true }
    });
    if (!user) throw new NotFoundException('通知目标用户不存在');

    const records: Array<{
      channel: NoticeChannel;
      status: NoticeStatus;
      sentAt?: Date;
      error?: string;
    }> = [];

    if (targets.includes(NoticeChannel.SITE)) {
      await this.prisma.notice.create({
        data: {
          userId: user.id,
          type: input.type,
          channel: NoticeChannel.SITE,
          payload: payload as any,
          status: NoticeStatus.PENDING
        }
      });
      records.push({ channel: NoticeChannel.SITE, status: NoticeStatus.PENDING });
    }

    if (targets.includes(NoticeChannel.EMAIL)) {
      const emailNotice = await this.prisma.notice.create({
        data: {
          userId: user.id,
          type: input.type,
          channel: NoticeChannel.EMAIL,
          payload: payload as any,
          status: NoticeStatus.PENDING
        }
      });
      const sendResult = await this.mailService.send(
        user.email,
        input.title || `平台通知：${input.type}`,
        `<pre style="white-space:pre-wrap;font-family:inherit;">${text}</pre>`
      );
      if (sendResult.ok) {
        await this.prisma.notice.update({
          where: { id: emailNotice.id },
          data: {
            status: NoticeStatus.SENT,
            sentAt: new Date()
          }
        });
        records.push({ channel: NoticeChannel.EMAIL, status: NoticeStatus.SENT, sentAt: new Date() });
      } else {
        await this.prisma.notice.update({
          where: { id: emailNotice.id },
          data: {
            status: NoticeStatus.FAILED
          }
        });
        records.push({
          channel: NoticeChannel.EMAIL,
          status: NoticeStatus.FAILED,
          error: sendResult.reason || '邮件发送失败'
        });
      }
    }

    if (targets.includes(NoticeChannel.TG)) {
      const tgNotice = await this.prisma.notice.create({
        data: {
          userId: user.id,
          type: input.type,
          channel: NoticeChannel.TG,
          payload: payload as any,
          status: NoticeStatus.PENDING
        }
      });
      const tgChatId =
        input.tgChatId ||
        (typeof payloadRecord['tgChatId'] === 'string' ? String(payloadRecord['tgChatId']) : undefined) ||
        process.env.TELEGRAM_DEFAULT_CHAT_ID;
      if (!tgChatId) {
        await this.prisma.notice.update({
          where: { id: tgNotice.id },
          data: { status: NoticeStatus.FAILED }
        });
        records.push({
          channel: NoticeChannel.TG,
          status: NoticeStatus.FAILED,
          error: '未配置 Telegram chatId'
        });
      } else {
        const sendResult = await this.telegramService.sendMessage(tgChatId, text);
        if (sendResult.ok) {
          await this.prisma.notice.update({
            where: { id: tgNotice.id },
            data: {
              status: NoticeStatus.SENT,
              sentAt: new Date()
            }
          });
          records.push({ channel: NoticeChannel.TG, status: NoticeStatus.SENT, sentAt: new Date() });
        } else {
          await this.prisma.notice.update({
            where: { id: tgNotice.id },
            data: { status: NoticeStatus.FAILED }
          });
          records.push({
            channel: NoticeChannel.TG,
            status: NoticeStatus.FAILED,
            error: sendResult.reason || 'Telegram 发送失败'
          });
        }
      }
    }

    if (targets.includes(NoticeChannel.SMS)) {
      const smsNotice = await this.prisma.notice.create({
        data: {
          userId: user.id,
          type: input.type,
          channel: NoticeChannel.SMS,
          payload: payload as any,
          status: NoticeStatus.PENDING
        }
      });

      const mobile =
        (typeof payloadRecord['mobile'] === 'string' ? String(payloadRecord['mobile']) : '') ||
        user.email;
      const sendResult = await this.smsService.send(mobile, text);
      if (sendResult.ok) {
        await this.prisma.notice.update({
          where: { id: smsNotice.id },
          data: {
            status: NoticeStatus.SENT,
            sentAt: new Date()
          }
        });
        records.push({ channel: NoticeChannel.SMS, status: NoticeStatus.SENT, sentAt: new Date() });
      } else {
        await this.prisma.notice.update({
          where: { id: smsNotice.id },
          data: { status: NoticeStatus.FAILED }
        });
        records.push({
          channel: NoticeChannel.SMS,
          status: NoticeStatus.FAILED,
          error: sendResult.reason || 'SMS 发送失败'
        });
      }
    }

    if (targets.includes(NoticeChannel.WECHAT_TEMPLATE)) {
      const wxNotice = await this.prisma.notice.create({
        data: {
          userId: user.id,
          type: input.type,
          channel: NoticeChannel.WECHAT_TEMPLATE,
          payload: payload as any,
          status: NoticeStatus.PENDING
        }
      });
      const sendResult = await this.wechatTemplateService.send({
        openId: typeof payloadRecord['openId'] === 'string' ? String(payloadRecord['openId']) : undefined,
        templateCode:
          typeof payloadRecord['templateCode'] === 'string'
            ? String(payloadRecord['templateCode'])
            : undefined,
        title: input.title || input.type,
        content: input.content || text,
        payload
      });
      if (sendResult.ok) {
        await this.prisma.notice.update({
          where: { id: wxNotice.id },
          data: {
            status: NoticeStatus.SENT,
            sentAt: new Date()
          }
        });
        records.push({
          channel: NoticeChannel.WECHAT_TEMPLATE,
          status: NoticeStatus.SENT,
          sentAt: new Date()
        });
      } else {
        await this.prisma.notice.update({
          where: { id: wxNotice.id },
          data: { status: NoticeStatus.FAILED }
        });
        records.push({
          channel: NoticeChannel.WECHAT_TEMPLATE,
          status: NoticeStatus.FAILED,
          error: sendResult.reason || '微信模板发送失败'
        });
      }
    }

    return { channels: targets, records };
  }

  async listMine(userId: string, query: QueryNoticeDto) {
    const { page = 1, pageSize = 20, status, type } = query;
    const where = {
      userId,
      channel: NoticeChannel.SITE,
      ...(status ? { status } : {}),
      ...(type
        ? {
            type: { contains: type }
          }
        : {})
    };
    const [total, list] = await this.prisma.$transaction([
      this.prisma.notice.count({ where }),
      this.prisma.notice.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize
      })
    ]);
    return { total, list, page, pageSize };
  }

  async unreadCount(userId: string) {
    const unread = await this.prisma.notice.count({
      where: {
        userId,
        channel: NoticeChannel.SITE,
        status: NoticeStatus.PENDING
      }
    });
    return { unread };
  }

  async markRead(userId: string, noticeId: string) {
    const notice = await this.prisma.notice.findUnique({
      where: { id: noticeId }
    });
    if (!notice) throw new NotFoundException('通知不存在');
    if (notice.userId !== userId) throw new ForbiddenException('无权操作');

    if (notice.status === NoticeStatus.SENT) {
      return { message: '通知已读', notice };
    }

    const updated = await this.prisma.notice.update({
      where: { id: noticeId },
      data: {
        status: NoticeStatus.SENT,
        sentAt: new Date()
      }
    });
    return { message: '已标记为已读', notice: updated };
  }

  async markAllRead(userId: string) {
    const result = await this.prisma.notice.updateMany({
      where: {
        userId,
        channel: NoticeChannel.SITE,
        status: NoticeStatus.PENDING
      },
      data: {
        status: NoticeStatus.SENT,
        sentAt: new Date()
      }
    });
    return { message: '已全部标记为已读', updated: result.count };
  }

  async listForAdmin(query: AdminQueryNoticeDto) {
    const { page = 1, pageSize = 20, status, type, userId } = query;
    const where = {
      ...(userId ? { userId } : {}),
      ...(status ? { status } : {}),
      ...(type
        ? {
            type: { contains: type }
          }
        : {})
    };

    const [total, list] = await this.prisma.$transaction([
      this.prisma.notice.count({ where }),
      this.prisma.notice.findMany({
        where,
        include: {
          user: {
            select: { id: true, email: true, role: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize
      })
    ]);

    return {
      total,
      list: list.map((item) => ({
        ...item,
        user: item.user
          ? {
              ...item.user,
              role: this.presentRole(item.user.role)
            }
          : item.user
      })),
      page,
      pageSize
    };
  }

  async createByAdmin(adminId: string, dto: CreateAdminNoticeDto) {
    const basePayload = {
      title: dto.title ?? null,
      content: dto.content,
      adminId,
      at: new Date().toISOString()
    };

    if (dto.userId) {
      const user = await this.prisma.user.findUnique({
        where: { id: dto.userId },
        select: { id: true }
      });
      if (!user) throw new NotFoundException('目标用户不存在');

      const result = await this.createSystemNotice({
        userId: dto.userId,
        type: dto.type,
        title: dto.title,
        content: dto.content,
        payload: basePayload,
        channels: dto.channels,
        tgChatId: dto.tgChatId
      });
      return { message: '通知发送成功', count: 1, result };
    }

    const users = await this.prisma.user.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true }
    });

    if (users.length === 0) {
      return { message: '当前无可发送用户', count: 0 };
    }

    for (const user of users) {
      await this.createSystemNotice({
        userId: user.id,
        type: dto.type,
        title: dto.title,
        content: dto.content,
        payload: basePayload,
        channels: dto.channels,
        tgChatId: dto.tgChatId
      });
    }

    return { message: '通知广播发送成功', count: users.length };
  }

  // ---- Template CRUD ----

  async listTemplates(query: { page?: number; pageSize?: number }) {
    const { page = 1, pageSize = 50 } = query;
    const [total, list] = await this.prisma.$transaction([
      this.prisma.noticeTemplate.count(),
      this.prisma.noticeTemplate.findMany({
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize
      })
    ]);
    return { total, list, page, pageSize };
  }

  async createTemplate(data: { code: string; name: string; subject: string; body: string; channel?: string }) {
    return this.prisma.noticeTemplate.create({
      data: {
        code: data.code,
        name: data.name,
        subject: data.subject,
        bodyTemplate: data.body,
        ...(data.channel ? { channel: data.channel as any } : {})
      }
    });
  }

  async updateTemplate(id: string, data: { name?: string; subject?: string; body?: string; channel?: string }) {
    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.subject !== undefined) updateData.subject = data.subject;
    if (data.body !== undefined) updateData.bodyTemplate = data.body;
    if (data.channel !== undefined) updateData.channel = data.channel;
    return this.prisma.noticeTemplate.update({ where: { id }, data: updateData });
  }

  async deleteTemplate(id: string) {
    await this.prisma.noticeTemplate.delete({ where: { id } });
    return { message: '模板已删除' };
  }

  /** 渲染模板：将 {{key}} 替换为 vars 对应值 */
  renderTemplate(template: string, vars: Record<string, string>) {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? '');
  }
}
