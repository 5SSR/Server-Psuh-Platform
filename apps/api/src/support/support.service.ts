import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import { Prisma, SupportTicketStatus } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

import { CreateSupportTicketDto } from './dto/create-support-ticket.dto';
import { QuerySupportTicketDto } from './dto/query-support-ticket.dto';
import { AdminQuerySupportTicketDto } from './dto/admin-query-support-ticket.dto';
import { ReviewSupportTicketDto } from './dto/review-support-ticket.dto';

@Injectable()
export class SupportService {
  constructor(private readonly prisma: PrismaService) {}

  private buildWhere(query: QuerySupportTicketDto | AdminQuerySupportTicketDto): Prisma.SupportTicketWhereInput {
    const where: Prisma.SupportTicketWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.type ? { type: query.type } : {})
    };

    if ('userId' in query && query.userId) {
      where.userId = query.userId;
    }
    if ('orderId' in query && query.orderId) {
      where.orderId = query.orderId;
    }
    if ('productId' in query && query.productId) {
      where.productId = query.productId;
    }

    if (query.keyword?.trim()) {
      const keyword = query.keyword.trim();
      where.OR = [
        { subject: { contains: keyword } },
        { content: { contains: keyword } },
        { user: { email: { contains: keyword } } },
        { orderId: { contains: keyword } },
        { productId: { contains: keyword } }
      ];
    }

    return where;
  }

  async create(userId: string, dto: CreateSupportTicketDto) {
    if (dto.orderId) {
      const order = await this.prisma.order.findUnique({
        where: { id: dto.orderId },
        select: { id: true, buyerId: true, sellerId: true, productId: true }
      });
      if (!order) {
        throw new NotFoundException('关联订单不存在');
      }
      if (order.buyerId !== userId && order.sellerId !== userId) {
        throw new ForbiddenException('仅订单关联用户可发起售后工单');
      }
      if (dto.productId && dto.productId !== order.productId) {
        throw new BadRequestException('工单商品与订单不一致');
      }

      return this.prisma.supportTicket.create({
        data: {
          userId,
          orderId: order.id,
          productId: order.productId,
          type: dto.type ?? 'AFTER_SALE',
          subject: dto.subject.trim(),
          content: dto.content.trim(),
          evidence: dto.evidence ?? [],
          contact: dto.contact?.trim() || null
        }
      });
    }

    if (dto.productId) {
      const product = await this.prisma.product.findUnique({
        where: { id: dto.productId },
        select: { id: true }
      });
      if (!product) {
        throw new NotFoundException('关联商品不存在');
      }
    }

    return this.prisma.supportTicket.create({
      data: {
        userId,
        orderId: dto.orderId,
        productId: dto.productId,
        type: dto.type ?? 'OTHER',
        subject: dto.subject.trim(),
        content: dto.content.trim(),
        evidence: dto.evidence ?? [],
        contact: dto.contact?.trim() || null
      }
    });
  }

  async listMine(userId: string, query: QuerySupportTicketDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where = {
      ...this.buildWhere(query),
      userId
    };

    const [total, list] = await this.prisma.$transaction([
      this.prisma.supportTicket.count({ where }),
      this.prisma.supportTicket.findMany({
        where,
        include: {
          resolver: {
            select: {
              id: true,
              email: true
            }
          }
        },
        orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize
      })
    ]);

    return { total, list, page, pageSize };
  }

  async detailMine(userId: string, id: string) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true
          }
        },
        resolver: {
          select: {
            id: true,
            email: true
          }
        }
      }
    });
    if (!ticket) {
      throw new NotFoundException('工单不存在');
    }
    if (ticket.userId !== userId) {
      throw new ForbiddenException('无权查看该工单');
    }
    return ticket;
  }

  async closeMine(userId: string, id: string) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id },
      select: { id: true, userId: true, status: true }
    });
    if (!ticket) {
      throw new NotFoundException('工单不存在');
    }
    if (ticket.userId !== userId) {
      throw new ForbiddenException('无权关闭该工单');
    }
    const closableStatuses: SupportTicketStatus[] = [
      SupportTicketStatus.OPEN,
      SupportTicketStatus.PROCESSING
    ];
    if (!closableStatuses.includes(ticket.status)) {
      throw new BadRequestException('当前状态不可关闭');
    }

    return this.prisma.supportTicket.update({
      where: { id },
      data: {
        status: SupportTicketStatus.CLOSED,
        resolvedAt: new Date(),
        reviewRemark: '用户已主动关闭工单'
      }
    });
  }

  async listAdmin(query: AdminQuerySupportTicketDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where = this.buildWhere(query);

    const [total, list] = await this.prisma.$transaction([
      this.prisma.supportTicket.count({ where }),
      this.prisma.supportTicket.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              email: true
            }
          },
          resolver: {
            select: {
              id: true,
              email: true
            }
          }
        },
        orderBy: [{ status: 'asc' }, { updatedAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize
      })
    ]);

    return { total, list, page, pageSize };
  }

  async reviewAdmin(adminId: string, id: string, dto: ReviewSupportTicketDto) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id },
      select: { id: true, status: true }
    });
    if (!ticket) {
      throw new NotFoundException('工单不存在');
    }

    const resolvedStatuses: SupportTicketStatus[] = [
      SupportTicketStatus.RESOLVED,
      SupportTicketStatus.REJECTED,
      SupportTicketStatus.CLOSED
    ];
    const isResolvedStatus = resolvedStatuses.includes(dto.status);

    return this.prisma.supportTicket.update({
      where: { id },
      data: {
        status: dto.status,
        reviewRemark: dto.reviewRemark?.trim() || null,
        resolverId: adminId,
        resolvedAt: isResolvedStatus ? new Date() : null
      }
    });
  }
}
