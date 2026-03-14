import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Post,
  UseGuards
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ApplySellerDto } from './dto/apply-seller.dto';
import { SubmitKycDto } from './dto/submit-kyc.dto';
import { NoticeChannel } from '@prisma/client';

@Controller('user')
@UseGuards(JwtAuthGuard)
export class UserController {
  constructor(private readonly prisma: PrismaService) {}

  // 获取当前用户的基础信息
  @Get('me')
  async me(@CurrentUser() user: { userId: string }) {
    const info = await this.prisma.user.findUnique({
      where: { id: user.userId },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        emailVerifiedAt: true,
        createdAt: true
      }
    });
    return info;
  }

  @Get('kyc')
  async kyc(@CurrentUser() user: { userId: string }) {
    return this.prisma.userKyc.findUnique({
      where: { userId: user.userId }
    });
  }

  @Post('kyc')
  async submitKyc(
    @CurrentUser() user: { userId: string },
    @Body() dto: SubmitKycDto
  ) {
    const exists = await this.prisma.userKyc.findUnique({
      where: { userId: user.userId }
    });

    if (exists?.status === 'approved') {
      throw new BadRequestException('实名认证已通过，无需重复提交');
    }

    const result = await this.prisma.userKyc.upsert({
      where: { userId: user.userId },
      update: {
        realName: dto.realName,
        idNumber: dto.idNumber,
        docImages: dto.docImages,
        status: 'pending',
        reason: null
      },
      create: {
        userId: user.userId,
        realName: dto.realName,
        idNumber: dto.idNumber,
        docImages: dto.docImages,
        status: 'pending'
      }
    });

    await this.prisma.notice.create({
      data: {
        userId: user.userId,
        type: 'KYC_SUBMITTED',
        channel: NoticeChannel.SITE,
        payload: { at: new Date().toISOString() } as any
      }
    });

    return { message: '实名认证资料已提交，等待管理员审核', kyc: result };
  }

  @Get('seller-application')
  async sellerApplication(@CurrentUser() user: { userId: string }) {
    return this.prisma.sellerApplication.findUnique({
      where: { userId: user.userId }
    });
  }

  @Post('seller-application')
  async applySeller(
    @CurrentUser() user: { userId: string },
    @Body() dto: ApplySellerDto
  ) {
    const userInfo = await this.prisma.user.findUnique({
      where: { id: user.userId },
      select: { id: true, role: true }
    });
    if (!userInfo) throw new NotFoundException('用户不存在');

    const kyc = await this.prisma.userKyc.findUnique({
      where: { userId: user.userId }
    });
    if (!kyc || kyc.status !== 'approved') {
      throw new BadRequestException('请先完成并通过实名认证');
    }

    const exists = await this.prisma.sellerApplication.findUnique({
      where: { userId: user.userId }
    });
    if (exists?.status === 'PENDING') {
      throw new BadRequestException('卖家认证申请审核中，请勿重复提交');
    }
    if (exists?.status === 'APPROVED' || userInfo.role === 'SELLER') {
      return { message: '你已经是认证卖家' };
    }

    const application = await this.prisma.sellerApplication.upsert({
      where: { userId: user.userId },
      update: {
        status: 'PENDING',
        reason: dto.reason
      },
      create: {
        userId: user.userId,
        status: 'PENDING',
        reason: dto.reason
      }
    });

    await this.prisma.notice.create({
      data: {
        userId: user.userId,
        type: 'SELLER_APPLICATION_SUBMITTED',
        channel: NoticeChannel.SITE,
        payload: { at: new Date().toISOString() } as any
      }
    });

    return { message: '卖家认证申请已提交，等待管理员审核', application };
  }
}
