import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { NoticeChannel, NoticeStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { QueryNoticeDto } from './dto/query-notice.dto';
import { AdminQueryNoticeDto } from './dto/admin-query-notice.dto';
import { CreateAdminNoticeDto } from './dto/create-admin-notice.dto';

@Injectable()
export class NoticeService {
  constructor(private readonly prisma: PrismaService) {}

  private presentRole(role: string) {
    return role === 'ADMIN' ? 'ADMIN' : 'USER';
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
    const payload = {
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

      const notice = await this.prisma.notice.create({
        data: {
          userId: dto.userId,
          type: dto.type,
          channel: NoticeChannel.SITE,
          payload: payload as any,
          status: NoticeStatus.PENDING
        }
      });
      return { message: '通知发送成功', count: 1, notice };
    }

    const users = await this.prisma.user.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true }
    });

    if (users.length === 0) {
      return { message: '当前无可发送用户', count: 0 };
    }

    await this.prisma.notice.createMany({
      data: users.map((user) => ({
        userId: user.id,
        type: dto.type,
        channel: NoticeChannel.SITE,
        payload: payload as any,
        status: NoticeStatus.PENDING
      }))
    });

    return { message: '站内广播发送成功', count: users.length };
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
