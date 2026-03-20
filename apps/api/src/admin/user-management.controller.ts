import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Patch,
  Query,
  UseGuards
} from '@nestjs/common';
import { Prisma, UserRole, UserStatus } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { NoticeService } from '../notice/notice.service';

import { QueryUserDto } from './dto/query-user.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';


@Controller('admin/users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminUserManagementController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly noticeService: NoticeService
  ) {}

  private presentRole(role: string) {
    return role === 'ADMIN' ? 'ADMIN' : 'USER';
  }

  @Get()
  async list(@Query() query: QueryUserDto) {
    const { page = 1, pageSize = 20, role, status, keyword } = query;
    const where: Prisma.UserWhereInput = {};

    if (role === 'ADMIN') {
      where.role = UserRole.ADMIN;
    } else if (role === 'USER') {
      where.role = { in: [UserRole.BUYER, UserRole.SELLER] };
    }

    if (status) {
      where.status = status;
    }

    if (keyword) {
      where.OR = [
        { email: { contains: keyword } },
        { id: { contains: keyword } }
      ];
    }

    const [total, list] = await this.prisma.$transaction([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          role: true,
          status: true,
          emailVerifiedAt: true,
          lastLoginAt: true,
          lastLoginIp: true,
          createdAt: true,
          kyc: {
            select: {
              status: true,
              updatedAt: true
            }
          },
          sellerApplication: {
            select: {
              status: true,
              updatedAt: true
            }
          },
          sellerProfile: {
            select: {
              level: true,
              tradeCount: true,
              disputeRate: true,
              refundRate: true,
              avgDeliveryMinutes: true,
              positiveRate: true
            }
          },
          wallet: {
            select: {
              balance: true,
              frozen: true,
              updatedAt: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize
      })
    ]);

    const userIds = list.map((item) => item.id);
    const emails = list.map((item) => item.email);
    const emailToUserId = new Map(list.map((item) => [item.email, item.id]));

    const riskEntities =
      userIds.length === 0
        ? []
        : await this.prisma.riskEntityList.findMany({
            where: {
              enabled: true,
              OR: [
                {
                  entityType: 'USER_ID',
                  entityValue: {
                    in: userIds
                  }
                },
                {
                  entityType: 'EMAIL',
                  entityValue: {
                    in: emails
                  }
                }
              ]
            },
            select: {
              id: true,
              listType: true,
              entityType: true,
              entityValue: true,
              reason: true,
              expiresAt: true,
              createdAt: true
            }
          });

    const riskByUserId = new Map<
      string,
      Array<{
        id: string;
        listType: string;
        entityType: string;
        entityValue: string;
        reason: string | null;
        expiresAt: Date | null;
        createdAt: Date;
      }>
    >();

    for (const item of riskEntities) {
      const userId =
        item.entityType === 'USER_ID' ? item.entityValue : emailToUserId.get(item.entityValue);
      if (!userId) continue;
      const current = riskByUserId.get(userId) || [];
      current.push(item);
      riskByUserId.set(userId, current);
    }

    return {
      total,
      list: list.map((item) => ({
        ...item,
        role: this.presentRole(item.role),
        riskMarks: Array.from(
          new Set((riskByUserId.get(item.id) || []).map((risk) => risk.listType))
        ),
        riskEntities: (riskByUserId.get(item.id) || []).map((risk) => ({
          id: risk.id,
          listType: risk.listType,
          entityType: risk.entityType,
          entityValue: risk.entityValue,
          reason: risk.reason,
          expiresAt: risk.expiresAt,
          createdAt: risk.createdAt
        }))
      })),
      page,
      pageSize
    };
  }

  @Patch(':userId/status')
  async updateStatus(
    @Param('userId') userId: string,
    @CurrentUser() admin: { userId: string },
    @Body() dto: UpdateUserStatusDto
  ) {
    const target = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        role: true,
        status: true
      }
    });
    if (!target) throw new NotFoundException('用户不存在');

    if (target.role === 'ADMIN' && dto.status === UserStatus.BANNED) {
      throw new BadRequestException('不允许封禁管理员账号');
    }
    if (target.status === dto.status) {
      return { message: '用户状态未变化' };
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { status: dto.status }
    });

    await this.noticeService.createSystemNotice({
      userId,
      type: dto.status === UserStatus.BANNED ? 'ACCOUNT_BANNED' : 'ACCOUNT_RESTORED',
      payload: {
        reason: dto.reason,
        operatorId: admin.userId,
        at: new Date().toISOString()
      }
    });

    return {
      message: dto.status === UserStatus.BANNED ? '账号已封禁' : '账号已恢复',
      user: {
        id: updated.id,
        role: this.presentRole(updated.role),
        status: updated.status
      }
    };
  }
}
