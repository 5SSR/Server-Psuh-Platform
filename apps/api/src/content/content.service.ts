import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBannerDto } from './dto/create-banner.dto';
import { UpdateBannerDto } from './dto/update-banner.dto';
import { CreateFaqDto } from './dto/create-faq.dto';
import { UpdateFaqDto } from './dto/update-faq.dto';
import { CreateHelpArticleDto } from './dto/create-help-article.dto';
import { UpdateHelpArticleDto } from './dto/update-help-article.dto';
import { CreateMarketTagDto } from './dto/create-market-tag.dto';
import { UpdateMarketTagDto } from './dto/update-market-tag.dto';

@Injectable()
export class ContentService {
  constructor(private readonly prisma: PrismaService) {}

  async getHomeContent() {
    const now = new Date();
    const [banners, faqs, helps, tags] = await this.prisma.$transaction([
      this.prisma.banner.findMany({
        where: {
          isActive: true,
          OR: [{ startsAt: null }, { startsAt: { lte: now } }],
          AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: now } }] }]
        },
        orderBy: [{ position: 'asc' }, { createdAt: 'desc' }],
        take: 8
      }),
      this.prisma.faq.findMany({
        where: { isActive: true },
        orderBy: [{ position: 'asc' }, { createdAt: 'desc' }],
        take: 10
      }),
      this.prisma.helpArticle.findMany({
        where: { isActive: true },
        orderBy: [{ position: 'asc' }, { createdAt: 'desc' }],
        take: 8
      }),
      this.prisma.marketTag.findMany({
        where: { isActive: true },
        orderBy: [{ position: 'asc' }, { createdAt: 'desc' }],
        take: 20
      })
    ]);

    return { banners, faqs, helps, tags };
  }

  listBanners() {
    return this.prisma.banner.findMany({ orderBy: [{ position: 'asc' }, { createdAt: 'desc' }] });
  }

  createBanner(dto: CreateBannerDto) {
    return this.prisma.banner.create({ data: dto });
  }

  async updateBanner(id: string, dto: UpdateBannerDto) {
    await this.ensureBanner(id);
    return this.prisma.banner.update({ where: { id }, data: dto });
  }

  async deleteBanner(id: string) {
    await this.ensureBanner(id);
    await this.prisma.banner.delete({ where: { id } });
    return { message: 'Banner 已删除' };
  }

  listFaqs() {
    return this.prisma.faq.findMany({ orderBy: [{ position: 'asc' }, { createdAt: 'desc' }] });
  }

  createFaq(dto: CreateFaqDto) {
    return this.prisma.faq.create({ data: dto });
  }

  async updateFaq(id: string, dto: UpdateFaqDto) {
    await this.ensureFaq(id);
    return this.prisma.faq.update({ where: { id }, data: dto });
  }

  async deleteFaq(id: string) {
    await this.ensureFaq(id);
    await this.prisma.faq.delete({ where: { id } });
    return { message: 'FAQ 已删除' };
  }

  listHelpArticles() {
    return this.prisma.helpArticle.findMany({
      orderBy: [{ position: 'asc' }, { createdAt: 'desc' }]
    });
  }

  createHelpArticle(dto: CreateHelpArticleDto) {
    return this.prisma.helpArticle.create({ data: dto });
  }

  async updateHelpArticle(id: string, dto: UpdateHelpArticleDto) {
    await this.ensureHelpArticle(id);
    return this.prisma.helpArticle.update({ where: { id }, data: dto });
  }

  async deleteHelpArticle(id: string) {
    await this.ensureHelpArticle(id);
    await this.prisma.helpArticle.delete({ where: { id } });
    return { message: '帮助文档已删除' };
  }

  listMarketTags() {
    return this.prisma.marketTag.findMany({ orderBy: [{ position: 'asc' }, { createdAt: 'desc' }] });
  }

  createMarketTag(dto: CreateMarketTagDto) {
    return this.prisma.marketTag.create({ data: dto });
  }

  async updateMarketTag(id: string, dto: UpdateMarketTagDto) {
    await this.ensureMarketTag(id);
    return this.prisma.marketTag.update({ where: { id }, data: dto });
  }

  async deleteMarketTag(id: string) {
    await this.ensureMarketTag(id);
    await this.prisma.marketTag.delete({ where: { id } });
    return { message: '标签已删除' };
  }

  private async ensureBanner(id: string) {
    const item = await this.prisma.banner.findUnique({ where: { id }, select: { id: true } });
    if (!item) throw new NotFoundException('Banner 不存在');
  }

  private async ensureFaq(id: string) {
    const item = await this.prisma.faq.findUnique({ where: { id }, select: { id: true } });
    if (!item) throw new NotFoundException('FAQ 不存在');
  }

  private async ensureHelpArticle(id: string) {
    const item = await this.prisma.helpArticle.findUnique({ where: { id }, select: { id: true } });
    if (!item) throw new NotFoundException('帮助文档不存在');
  }

  private async ensureMarketTag(id: string) {
    const item = await this.prisma.marketTag.findUnique({ where: { id }, select: { id: true } });
    if (!item) throw new NotFoundException('标签不存在');
  }
}
