import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

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

  async list(query: {
    page?: number;
    pageSize?: number;
    action?: string;
    adminId?: string;
    resource?: string;
    keyword?: string;
  }) {
    const page = Number.isFinite(query.page) ? Math.max(1, Number(query.page)) : 1;
    const pageSize = Number.isFinite(query.pageSize)
      ? Math.min(100, Math.max(1, Number(query.pageSize)))
      : 20;
    const action = query.action?.trim();
    const adminId = query.adminId?.trim();
    const resource = query.resource?.trim();
    const keyword = query.keyword?.trim();

    const where: Prisma.AdminLogWhereInput = {
      ...(action
        ? {
            action: {
              contains: action
            }
          }
        : {}),
      ...(adminId ? { adminId } : {}),
      ...(resource
        ? {
            resource: {
              contains: resource
            }
          }
        : {}),
      ...(keyword
        ? {
            OR: [
              {
                action: {
                  contains: keyword
                }
              },
              {
                resource: {
                  contains: keyword
                }
              },
              {
                resourceId: {
                  contains: keyword
                }
              },
              {
                ip: {
                  contains: keyword
                }
              }
            ]
          }
        : {})
    };

    const [total, list] = await this.prisma.$transaction([
      this.prisma.adminLog.count({ where }),
      this.prisma.adminLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize
      })
    ]);

    const adminIds = Array.from(
      new Set(list.map((item) => item.adminId).filter((item) => item.length > 0))
    );
    const admins = adminIds.length
      ? await this.prisma.user.findMany({
          where: {
            id: {
              in: adminIds
            }
          },
          select: {
            id: true,
            email: true,
            role: true
          }
        })
      : [];

    const adminMap = new Map(
      admins.map((item) => [item.id, { id: item.id, email: item.email, role: item.role }])
    );

    return {
      total,
      page,
      pageSize,
      list: list.map((item) => ({
        ...item,
        admin: adminMap.get(item.adminId) || {
          id: item.adminId,
          email: 'unknown@local',
          role: 'ADMIN'
        }
      }))
    };
  }
}
