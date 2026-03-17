import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminLogService {
  constructor(private readonly prisma: PrismaService) {}

  async log(input: {
    adminId: string;
    action: string;
    resource?: string;
    resourceId?: string;
    detail?: Record<string, unknown>;
    ip?: string;
  }) {
    return this.prisma.adminLog.create({
      data: {
        adminId: input.adminId,
        action: input.action,
        resource: input.resource ?? '',
        resourceId: input.resourceId,
        detail: input.detail as any,
        ip: input.ip
      }
    });
  }

  async list(query: { page?: number; pageSize?: number; action?: string; adminId?: string }) {
    const { page = 1, pageSize = 20, action, adminId } = query;
    const where: any = {};
    if (action) where.action = action;
    if (adminId) where.adminId = adminId;

    const [total, list] = await this.prisma.$transaction([
      this.prisma.adminLog.count({ where }),
      this.prisma.adminLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize
      })
    ]);
    return { total, list, page, pageSize };
  }
}
