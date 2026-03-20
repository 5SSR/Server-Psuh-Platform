import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

import { QueryLoginLogDto } from './dto/query-login-log.dto';

@Controller('admin/security')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminSecurityController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('logins')
  async listLoginLogs(@Query() query: QueryLoginLogDto) {
    const {
      page = 1,
      pageSize = 20,
      success,
      reason,
      email,
      userId,
      ip,
      keyword,
      from,
      to
    } = query;

    const where: Prisma.UserLoginLogWhereInput = {};

    if (success) {
      where.success = success === 'true';
    }
    if (reason?.trim()) {
      where.reason = { contains: reason.trim() };
    }
    if (email?.trim()) {
      where.email = { contains: email.trim() };
    }
    if (userId?.trim()) {
      where.userId = { contains: userId.trim() };
    }
    if (ip?.trim()) {
      where.ip = { contains: ip.trim() };
    }
    if (from || to) {
      where.createdAt = {
        ...(from ? { gte: new Date(from) } : {}),
        ...(to ? { lte: new Date(to) } : {})
      };
    }
    if (keyword?.trim()) {
      const q = keyword.trim();
      where.OR = [
        { email: { contains: q } },
        { reason: { contains: q } },
        { ip: { contains: q } },
        { userId: { contains: q } }
      ];
    }

    const [total, list, success24h, failed24h] = await this.prisma.$transaction([
      this.prisma.userLoginLog.count({ where }),
      this.prisma.userLoginLog.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              role: true,
              status: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize
      }),
      this.prisma.userLoginLog.count({
        where: {
          success: true,
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
          }
        }
      }),
      this.prisma.userLoginLog.count({
        where: {
          success: false,
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
          }
        }
      })
    ]);

    return {
      total,
      list,
      page,
      pageSize,
      summary: {
        success24h,
        failed24h
      }
    };
  }
}
