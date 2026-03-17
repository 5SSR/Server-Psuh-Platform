import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Patch,
  Post,
  UseGuards
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ApplySellerDto } from './dto/apply-seller.dto';
import { SubmitKycDto } from './dto/submit-kyc.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { NoticeChannel } from '@prisma/client';

@Controller('user')
@UseGuards(JwtAuthGuard)
export class UserController {
  constructor(private readonly prisma: PrismaService) {}

  private presentRole(role: string) {
    return role === 'ADMIN' ? 'ADMIN' : 'USER';
  }

  // 获取当前用户的基础信息
  @Get('me')
  async me(@CurrentUser() user: { userId: string }) {
    const info = await this.prisma.user.findUnique({
      where: { id: user.userId },
      select: {
        id: true,
        email: true,
        nickname: true,
        avatar: true,
        role: true,
        status: true,
        emailVerifiedAt: true,
        mfaEnabled: true,
        createdAt: true
      }
    });
    if (!info) return null;
    return {
      ...info,
      role: this.presentRole(info.role)
    };
  }

  @Patch('profile')
  async updateProfile(
    @CurrentUser() user: { userId: string },
    @Body() dto: UpdateProfileDto
  ) {
    await this.prisma.user.update({
      where: { id: user.userId },
      data: {
        ...(dto.nickname !== undefined && { nickname: dto.nickname }),
        ...(dto.avatar !== undefined && { avatar: dto.avatar })
      }
    });
    return { message: '资料已更新' };
  }

  @Get('seller-profile')
  async sellerProfile(@CurrentUser() user: { userId: string }) {
    return this.prisma.sellerProfile.findUnique({
      where: { userId: user.userId }
    });
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
      select: { id: true }
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
      throw new BadRequestException('交易资质申请审核中，请勿重复提交');
    }
    if (exists?.status === 'APPROVED') {
      return { message: '你已完成交易资质认证' };
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

    return { message: '交易资质申请已提交，等待管理员审核', application };
  }
}
