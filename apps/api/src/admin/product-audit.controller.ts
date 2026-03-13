import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ProductAuditStatus } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AdminQueryDto } from './dto/admin-query.dto';

interface AuditDto {
  status: ProductAuditStatus;
  reason?: string;
}

@Controller('admin/products')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProductAuditController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('pending')
  @Roles('ADMIN')
  pending(@Query() query: AdminQueryDto) {
    const { page = 1, pageSize = 20 } = query;
    const where = { status: 'PENDING' as const };
    return this.prisma.$transaction([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        include: { audits: true },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize
      })
    ]).then(([total, list]) => ({ total, list, page, pageSize }));
  }

  @Get(':id/audits')
  @Roles('ADMIN')
  logs(@Param('id') id: string) {
    return this.prisma.productAudit.findMany({
      where: { productId: id },
      orderBy: { createdAt: 'desc' }
    });
  }

  @Patch(':id/audit')
  @Roles('ADMIN')
  async audit(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
    @Body() dto: AuditDto
  ) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) return { message: '商品不存在' };
    if (dto.status === 'REJECTED' && !dto.reason) {
      return { message: '审核拒绝必须提供原因' };
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.productAudit.create({
        data: {
          productId: id,
          adminId: user.userId,
          status: dto.status,
          reason: dto.reason
        }
      });

      await tx.product.update({
        where: { id },
        data: { status: dto.status === 'APPROVED' ? 'ONLINE' : 'OFFLINE' }
      });
    });
    return { ok: true };
  }
}
