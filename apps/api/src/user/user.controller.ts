import { Controller, Get, UseGuards } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('user')
export class UserController {
  constructor(private readonly prisma: PrismaService) {}

  // 获取当前用户的基础信息
  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@CurrentUser() user: { userId: string }) {
    const info = await this.prisma.user.findUnique({
      where: { id: user.userId },
      select: { id: true, email: true, role: true, status: true, createdAt: true }
    });
    return info;
  }
}
