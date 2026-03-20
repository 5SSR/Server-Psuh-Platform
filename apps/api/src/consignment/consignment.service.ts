import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import {
  ConsignmentApplicationStatus,
  Prisma,
  ProductStatus
} from '@prisma/client';

import { NoticeService } from '../notice/notice.service';
import { PrismaService } from '../prisma/prisma.service';

import { CreateConsignmentDto } from './dto/create-consignment.dto';
import { QueryConsignmentDto } from './dto/query-consignment.dto';
import {
  ConsignmentReviewAction,
  ReviewConsignmentDto
} from './dto/review-consignment.dto';

@Injectable()
export class ConsignmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly noticeService: NoticeService
  ) {}

  async createBySeller(sellerId: string, dto: CreateConsignmentDto) {
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
      select: {
        id: true,
        code: true,
        title: true,
        sellerId: true,
        status: true,
        consignment: true
      }
    });
    if (!product) throw new NotFoundException('商品不存在');
    if (product.sellerId !== sellerId) throw new ForbiddenException('无权申请该商品寄售');
    if (product.status === ProductStatus.DRAFT) {
      throw new BadRequestException('请先完善商品并提交审核后再申请寄售');
    }
    if (product.consignment) {
      throw new BadRequestException('该商品已是寄售模式，无需重复申请');
    }

    const existsPending = await this.prisma.consignmentApplication.findFirst({
      where: {
        productId: product.id,
        status: ConsignmentApplicationStatus.PENDING
      },
      select: { id: true }
    });
    if (existsPending) {
      throw new BadRequestException('该商品已有待处理寄售申请，请勿重复提交');
    }

    const application = await this.prisma.consignmentApplication.create({
      data: {
        productId: product.id,
        sellerId,
        sellerNote: dto.sellerNote?.trim() || null
      },
      include: {
        product: {
          select: {
            id: true,
            code: true,
            title: true,
            status: true,
            salePrice: true,
            region: true,
            lineType: true,
            consignment: true
          }
        }
      }
    });

    await this.noticeService.createSystemNotice({
      userId: sellerId,
      type: 'CONSIGNMENT_APPLY_SUBMITTED',
      title: '寄售申请已提交',
      content: `商品 ${product.title}（${product.code}）已进入寄售审核队列。`,
      payload: {
        consignmentId: application.id,
        productId: product.id
      }
    });

    return {
      message: '寄售申请提交成功，等待平台审核',
      application
    };
  }

  async listMine(sellerId: string, query: QueryConsignmentDto) {
    const { page = 1, pageSize = 20, status, keyword } = query;
    const where: Prisma.ConsignmentApplicationWhereInput = {
      sellerId,
      ...(status ? { status } : {}),
      ...(keyword
        ? {
            OR: [
              { id: { contains: keyword } },
              { product: { title: { contains: keyword } } },
              { product: { code: { contains: keyword } } }
            ]
          }
        : {})
    };

    const [total, list] = await this.prisma.$transaction([
      this.prisma.consignmentApplication.count({ where }),
      this.prisma.consignmentApplication.findMany({
        where,
        include: {
          product: {
            select: {
              id: true,
              code: true,
              title: true,
              status: true,
              salePrice: true,
              region: true,
              lineType: true,
              consignment: true
            }
          },
          reviewer: {
            select: {
              id: true,
              email: true
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

  async cancelBySeller(sellerId: string, id: string) {
    const application = await this.prisma.consignmentApplication.findUnique({
      where: { id },
      select: {
        id: true,
        sellerId: true,
        status: true
      }
    });
    if (!application) throw new NotFoundException('寄售申请不存在');
    if (application.sellerId !== sellerId) throw new ForbiddenException('无权操作该寄售申请');
    if (application.status !== ConsignmentApplicationStatus.PENDING) {
      throw new BadRequestException('仅待审核申请可撤销');
    }

    const updated = await this.prisma.consignmentApplication.update({
      where: { id },
      data: {
        status: ConsignmentApplicationStatus.CANCELED
      }
    });

    return {
      message: '寄售申请已撤销',
      application: updated
    };
  }

  async listForAdmin(query: QueryConsignmentDto) {
    const { page = 1, pageSize = 20, status, keyword } = query;
    const where: Prisma.ConsignmentApplicationWhereInput = {
      ...(status ? { status } : {}),
      ...(keyword
        ? {
            OR: [
              { id: { contains: keyword } },
              { seller: { email: { contains: keyword } } },
              { sellerId: { contains: keyword } },
              { product: { title: { contains: keyword } } },
              { product: { code: { contains: keyword } } }
            ]
          }
        : {})
    };

    const [total, list] = await this.prisma.$transaction([
      this.prisma.consignmentApplication.count({ where }),
      this.prisma.consignmentApplication.findMany({
        where,
        include: {
          product: {
            select: {
              id: true,
              code: true,
              title: true,
              status: true,
              salePrice: true,
              region: true,
              lineType: true,
              consignment: true,
              riskLevel: true
            }
          },
          seller: {
            select: {
              id: true,
              email: true,
              role: true,
              sellerProfile: {
                select: {
                  level: true,
                  tradeCount: true,
                  disputeRate: true,
                  refundRate: true,
                  positiveRate: true
                }
              }
            }
          },
          reviewer: {
            select: {
              id: true,
              email: true
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

  async reviewByAdmin(adminId: string, id: string, dto: ReviewConsignmentDto) {
    const application = await this.prisma.consignmentApplication.findUnique({
      where: { id },
      include: {
        product: {
          select: {
            id: true,
            code: true,
            title: true,
            consignment: true
          }
        },
        seller: {
          select: {
            id: true,
            email: true
          }
        }
      }
    });
    if (!application) throw new NotFoundException('寄售申请不存在');
    if (application.status !== ConsignmentApplicationStatus.PENDING) {
      throw new BadRequestException('该寄售申请已处理，请勿重复操作');
    }

    const nextStatus =
      dto.action === ConsignmentReviewAction.APPROVE
        ? ConsignmentApplicationStatus.APPROVED
        : ConsignmentApplicationStatus.REJECTED;

    const updated = await this.prisma.$transaction(async (tx) => {
      const next = await tx.consignmentApplication.update({
        where: { id },
        data: {
          status: nextStatus,
          adminRemark: dto.remark?.trim() || null,
          reviewedBy: adminId,
          reviewedAt: new Date()
        },
        include: {
          product: {
            select: {
              id: true,
              code: true,
              title: true,
              consignment: true
            }
          },
          seller: {
            select: {
              id: true,
              email: true
            }
          },
          reviewer: {
            select: {
              id: true,
              email: true
            }
          }
        }
      });

      await tx.product.update({
        where: { id: application.productId },
        data: {
          consignment: nextStatus === ConsignmentApplicationStatus.APPROVED
        }
      });

      return next;
    });

    await this.noticeService.createSystemNotice({
      userId: application.sellerId,
      type:
        nextStatus === ConsignmentApplicationStatus.APPROVED
          ? 'CONSIGNMENT_APPLY_APPROVED'
          : 'CONSIGNMENT_APPLY_REJECTED',
      title:
        nextStatus === ConsignmentApplicationStatus.APPROVED
          ? '寄售申请已通过'
          : '寄售申请未通过',
      content:
        nextStatus === ConsignmentApplicationStatus.APPROVED
          ? `商品 ${application.product.title}（${application.product.code}）已开启寄售模式。`
          : `商品 ${application.product.title}（${application.product.code}）寄售申请未通过，请按备注调整后重提。`,
      payload: {
        consignmentId: application.id,
        productId: application.productId,
        remark: dto.remark?.trim() || null
      }
    });

    return {
      message:
        nextStatus === ConsignmentApplicationStatus.APPROVED
          ? '寄售申请已审核通过'
          : '寄售申请已驳回',
      application: updated
    };
  }
}
