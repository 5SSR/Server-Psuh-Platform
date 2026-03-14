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
import { AdminQueryDto } from './dto/admin-query.dto';
import { ReviewKycDto } from './dto/review-kyc.dto';
import { NoticeChannel, SellerApplicationStatus } from '@prisma/client';
import { ReviewSellerApplicationDto } from './dto/review-seller-application.dto';

@Controller('admin/users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminUserReviewController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('kyc')
  async listKyc(@Query() query: AdminQueryDto) {
    const { page = 1, pageSize = 20, status } = query;
    const where = status ? { status: status.toLowerCase() } : undefined;
    const [total, list] = await this.prisma.$transaction([
      this.prisma.userKyc.count({ where }),
      this.prisma.userKyc.findMany({
        where,
        include: {
          user: {
            select: { id: true, email: true, role: true, createdAt: true }
          }
        },
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize
      })
    ]);
    return { total, list, page, pageSize };
  }

  @Patch(':userId/kyc')
  async reviewKyc(
    @Param('userId') userId: string,
    @Body() dto: ReviewKycDto
  ) {
    if (dto.status === 'rejected' && !dto.reason) {
      throw new BadRequestException('驳回认证必须填写原因');
    }
    const kyc = await this.prisma.userKyc.findUnique({
      where: { userId }
    });
    if (!kyc) throw new NotFoundException('实名认证记录不存在');

    const updated = await this.prisma.userKyc.update({
      where: { userId },
      data: {
        status: dto.status,
        reason: dto.reason
      }
    });

    await this.prisma.notice.create({
      data: {
        userId,
        type: dto.status === 'approved' ? 'KYC_APPROVED' : 'KYC_REJECTED',
        channel: NoticeChannel.SITE,
        payload: {
          reason: dto.reason,
          at: new Date().toISOString()
        } as any
      }
    });

    return { message: '实名认证审核已处理', kyc: updated };
  }

  @Get('seller-applications')
  async listSellerApplications(@Query() query: AdminQueryDto) {
    const { page = 1, pageSize = 20, status } = query;
    const where = status ? { status: status as SellerApplicationStatus } : undefined;
    const [total, list] = await this.prisma.$transaction([
      this.prisma.sellerApplication.count({ where }),
      this.prisma.sellerApplication.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              role: true,
              kyc: { select: { status: true } }
            }
          }
        },
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize
      })
    ]);
    return { total, list, page, pageSize };
  }

  @Patch(':userId/seller-application')
  async reviewSellerApplication(
    @Param('userId') userId: string,
    @Body() dto: ReviewSellerApplicationDto
  ) {
    if (dto.status === SellerApplicationStatus.PENDING) {
      throw new BadRequestException('审核状态不允许设为 PENDING');
    }
    if (dto.status === SellerApplicationStatus.REJECTED && !dto.reason) {
      throw new BadRequestException('驳回申请必须填写原因');
    }

    const application = await this.prisma.sellerApplication.findUnique({
      where: { userId }
    });
    if (!application) {
      throw new NotFoundException('卖家认证申请不存在');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { kyc: true }
    });
    if (!user) throw new NotFoundException('用户不存在');
    if (dto.status === SellerApplicationStatus.APPROVED && user.kyc?.status !== 'approved') {
      throw new BadRequestException('用户实名认证未通过，不能通过卖家认证');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.sellerApplication.update({
        where: { userId },
        data: {
          status: dto.status,
          reason: dto.reason
        }
      });

      if (dto.status === SellerApplicationStatus.APPROVED) {
        await tx.user.update({
          where: { id: userId },
          data: { role: 'SELLER' }
        });

        await tx.sellerProfile.upsert({
          where: { userId },
          update: {},
          create: { userId }
        });
      }

      await tx.notice.create({
        data: {
          userId,
          type:
            dto.status === SellerApplicationStatus.APPROVED
              ? 'SELLER_APPLICATION_APPROVED'
              : 'SELLER_APPLICATION_REJECTED',
          channel: NoticeChannel.SITE,
          payload: {
            reason: dto.reason,
            at: new Date().toISOString()
          } as any
        }
      });
    });

    return { message: '卖家认证申请审核完成' };
  }
}
