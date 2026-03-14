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
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { NoticeChannel, UserStatus } from '@prisma/client';
import { QueryUserDto } from './dto/query-user.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';

@Controller('admin/users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminUserManagementController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list(@Query() query: QueryUserDto) {
    const { page = 1, pageSize = 20, role, status, keyword } = query;
    const where = {
      ...(role ? { role } : {}),
      ...(status ? { status } : {}),
      ...(keyword
        ? {
            OR: [
              { email: { contains: keyword } },
              { id: { contains: keyword } }
            ]
          }
        : {})
    };

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

    return { total, list, page, pageSize };
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

    await this.prisma.notice.create({
      data: {
        userId,
        type: dto.status === UserStatus.BANNED ? 'ACCOUNT_BANNED' : 'ACCOUNT_RESTORED',
        channel: NoticeChannel.SITE,
        payload: {
          reason: dto.reason,
          operatorId: admin.userId,
          at: new Date().toISOString()
        } as any
      }
    });

    return {
      message: dto.status === UserStatus.BANNED ? '账号已封禁' : '账号已恢复',
      user: {
        id: updated.id,
        status: updated.status
      }
    };
  }
}
