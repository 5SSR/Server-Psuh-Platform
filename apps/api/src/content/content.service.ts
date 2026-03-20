import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

import { CreateBannerDto } from './dto/create-banner.dto';
import { UpdateBannerDto } from './dto/update-banner.dto';
import { CreateFaqDto } from './dto/create-faq.dto';
import { UpdateFaqDto } from './dto/update-faq.dto';
import { CreateHelpArticleDto } from './dto/create-help-article.dto';
import { UpdateHelpArticleDto } from './dto/update-help-article.dto';
import { CreateMarketTagDto } from './dto/create-market-tag.dto';
import { UpdateMarketTagDto } from './dto/update-market-tag.dto';
import { CreatePolicyDocumentDto } from './dto/create-policy-document.dto';
import { UpdatePolicyDocumentDto } from './dto/update-policy-document.dto';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto';

type SnapshotBanner = {
  id: string;
  title: string;
  subtitle: string | null;
  imageUrl: string | null;
  linkUrl: string | null;
  badge: string | null;
  position: number;
  isActive: boolean;
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
};

type SnapshotFaq = {
  id: string;
  category: string | null;
  question: string;
  answer: string;
  position: number;
  isActive: boolean;
  createdAt: string;
};

type SnapshotHelp = {
  id: string;
  category: string | null;
  title: string;
  content: string;
  position: number;
  isActive: boolean;
  createdAt: string;
};

type SnapshotTag = {
  id: string;
  name: string;
  type: string;
  color: string | null;
  linkUrl: string | null;
  position: number;
  isActive: boolean;
  createdAt: string;
};

type SnapshotPolicy = {
  id: string;
  code: string;
  title: string;
  content: string;
  position: number;
  isActive: boolean;
  updatedBy: string | null;
  createdAt: string;
};

type ContentSnapshot = {
  banners: SnapshotBanner[];
  faqs: SnapshotFaq[];
  helps: SnapshotHelp[];
  tags: SnapshotTag[];
  policies: SnapshotPolicy[];
};

type ContentReleaseSummary = {
  total: {
    banners: number;
    faqs: number;
    helps: number;
    tags: number;
    policies: number;
  };
  active: {
    banners: number;
    faqs: number;
    helps: number;
    tags: number;
    policies: number;
  };
};

type CreateReleaseInput = {
  action: 'PUBLISH' | 'ROLLBACK';
  sourceReleaseId?: string | null;
  snapshot: ContentSnapshot;
  summary: ContentReleaseSummary;
  note?: string | null;
  createdBy?: string | null;
};

@Injectable()
export class ContentService {
  constructor(private readonly prisma: PrismaService) {}

  async getHomeContent() {
    const now = new Date();
    const [banners, faqs, helps, tags, policies, announcements] = await this.prisma.$transaction([
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
      }),
      this.prisma.policyDocument.findMany({
        where: { isActive: true },
        orderBy: [{ position: 'asc' }, { updatedAt: 'desc' }]
      }),
      this.prisma.announcement.findMany({
        where: {
          isActive: true,
          OR: [{ startsAt: null }, { startsAt: { lte: now } }],
          AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: now } }] }]
        },
        orderBy: [{ isPinned: 'desc' }, { position: 'asc' }, { publishedAt: 'desc' }, { createdAt: 'desc' }],
        take: 6
      })
    ]);

    return { banners, faqs, helps, tags, policies, announcements };
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

  listPolicyDocuments(activeOnly = false) {
    return this.prisma.policyDocument.findMany({
      where: activeOnly ? { isActive: true } : undefined,
      orderBy: [{ position: 'asc' }, { updatedAt: 'desc' }]
    });
  }

  listAnnouncements(activeOnly = false, limit = 20) {
    const now = new Date();
    const take = Math.max(1, Math.min(limit || 20, 100));
    return this.prisma.announcement.findMany({
      where: activeOnly
        ? {
            isActive: true,
            OR: [{ startsAt: null }, { startsAt: { lte: now } }],
            AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: now } }] }]
          }
        : undefined,
      orderBy: [
        { isPinned: 'desc' },
        { position: 'asc' },
        { publishedAt: 'desc' },
        { createdAt: 'desc' }
      ],
      take
    });
  }

  async getAnnouncementById(id: string, activeOnly = false) {
    const now = new Date();
    const where: Prisma.AnnouncementWhereInput = {
      id,
      ...(activeOnly
        ? {
            isActive: true,
            OR: [{ startsAt: null }, { startsAt: { lte: now } }],
            AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: now } }] }]
          }
        : {})
    };
    const item = await this.prisma.announcement.findFirst({ where });
    if (!item) throw new NotFoundException('公告不存在');
    return item;
  }

  createAnnouncement(dto: CreateAnnouncementDto, adminId?: string) {
    const now = new Date();
    return this.prisma.announcement.create({
      data: {
        title: dto.title.trim(),
        summary: dto.summary?.trim() || null,
        content: dto.content.trim(),
        isActive: dto.isActive ?? true,
        isPinned: dto.isPinned ?? false,
        position: dto.position ?? 0,
        startsAt: dto.startsAt ? new Date(dto.startsAt) : null,
        endsAt: dto.endsAt ? new Date(dto.endsAt) : null,
        publishedAt: dto.isActive === false ? null : now,
        createdBy: adminId || null,
        updatedBy: adminId || null
      }
    });
  }

  async updateAnnouncement(id: string, dto: UpdateAnnouncementDto, adminId?: string) {
    await this.ensureAnnouncement(id);
    const existing = await this.prisma.announcement.findUnique({
      where: { id },
      select: { isActive: true, publishedAt: true }
    });

    const nextActive = dto.isActive ?? existing?.isActive ?? true;
    const shouldSetPublishedAt = !existing?.publishedAt && nextActive;

    return this.prisma.announcement.update({
      where: { id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
        ...(dto.summary !== undefined ? { summary: dto.summary?.trim() || null } : {}),
        ...(dto.content !== undefined ? { content: dto.content.trim() } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        ...(dto.isPinned !== undefined ? { isPinned: dto.isPinned } : {}),
        ...(dto.position !== undefined ? { position: dto.position } : {}),
        ...(dto.startsAt !== undefined ? { startsAt: dto.startsAt ? new Date(dto.startsAt) : null } : {}),
        ...(dto.endsAt !== undefined ? { endsAt: dto.endsAt ? new Date(dto.endsAt) : null } : {}),
        ...(shouldSetPublishedAt ? { publishedAt: new Date() } : {}),
        updatedBy: adminId || null
      }
    });
  }

  async deleteAnnouncement(id: string) {
    await this.ensureAnnouncement(id);
    await this.prisma.announcement.delete({ where: { id } });
    return { message: '公告已删除' };
  }

  async getPolicyByCode(code: string) {
    const normalizedCode = code.trim().toUpperCase();
    if (!normalizedCode) {
      throw new NotFoundException('规则文档不存在');
    }
    const item = await this.prisma.policyDocument.findFirst({
      where: {
        code: normalizedCode,
        isActive: true
      }
    });
    if (!item) {
      throw new NotFoundException('规则文档不存在');
    }
    return item;
  }

  createPolicyDocument(dto: CreatePolicyDocumentDto, adminId?: string) {
    return this.prisma.policyDocument.create({
      data: {
        ...dto,
        code: dto.code.trim().toUpperCase(),
        title: dto.title.trim(),
        content: dto.content.trim(),
        updatedBy: adminId || null
      }
    });
  }

  async updatePolicyDocument(id: string, dto: UpdatePolicyDocumentDto, adminId?: string) {
    await this.ensurePolicyDocument(id);
    return this.prisma.policyDocument.update({
      where: { id },
      data: {
        ...dto,
        code: dto.code ? dto.code.trim().toUpperCase() : undefined,
        title: dto.title ? dto.title.trim() : undefined,
        content: dto.content ? dto.content.trim() : undefined,
        updatedBy: adminId || null
      }
    });
  }

  async deletePolicyDocument(id: string) {
    await this.ensurePolicyDocument(id);
    await this.prisma.policyDocument.delete({ where: { id } });
    return { message: '规则文档已删除' };
  }

  listReleases() {
    return this.prisma.contentRelease.findMany({
      orderBy: [{ version: 'desc' }],
      take: 20
    });
  }

  async publishCurrentContent(adminId?: string, note?: string) {
    const snapshot = await this.captureSnapshot();
    const summary = this.buildSummary(snapshot);

    const release = await this.createReleaseWithRetry({
      action: 'PUBLISH',
      snapshot,
      summary,
      note: note?.trim() || null,
      createdBy: adminId || null
    });

    return {
      message: `已发布内容版本 v${release.version}`,
      release
    };
  }

  async rollbackToRelease(adminId: string | undefined, releaseId: string, note?: string) {
    const target = await this.prisma.contentRelease.findUnique({ where: { id: releaseId } });
    if (!target) {
      throw new NotFoundException('发布记录不存在');
    }

    const snapshot = this.normalizeSnapshot(target.snapshot);
    const summary = this.buildSummary(snapshot);
    const rollbackNote = note?.trim() || `回滚到版本 v${target.version}`;

    const release = await this.prisma.$transaction(async (tx) => {
      await tx.banner.deleteMany({});
      await tx.faq.deleteMany({});
      await tx.helpArticle.deleteMany({});
      await tx.marketTag.deleteMany({});
      await tx.policyDocument.deleteMany({});

      if (snapshot.banners.length > 0) {
        await tx.banner.createMany({
          data: snapshot.banners.map((item) => ({
            id: item.id,
            title: item.title,
            subtitle: item.subtitle,
            imageUrl: item.imageUrl,
            linkUrl: item.linkUrl,
            badge: item.badge,
            position: item.position,
            isActive: item.isActive,
            startsAt: item.startsAt ? new Date(item.startsAt) : null,
            endsAt: item.endsAt ? new Date(item.endsAt) : null,
            createdAt: this.toDateOrNow(item.createdAt)
          }))
        });
      }

      if (snapshot.faqs.length > 0) {
        await tx.faq.createMany({
          data: snapshot.faqs.map((item) => ({
            id: item.id,
            category: item.category,
            question: item.question,
            answer: item.answer,
            position: item.position,
            isActive: item.isActive,
            createdAt: this.toDateOrNow(item.createdAt)
          }))
        });
      }

      if (snapshot.helps.length > 0) {
        await tx.helpArticle.createMany({
          data: snapshot.helps.map((item) => ({
            id: item.id,
            category: item.category,
            title: item.title,
            content: item.content,
            position: item.position,
            isActive: item.isActive,
            createdAt: this.toDateOrNow(item.createdAt)
          }))
        });
      }

      if (snapshot.tags.length > 0) {
        await tx.marketTag.createMany({
          data: snapshot.tags.map((item) => ({
            id: item.id,
            name: item.name,
            type: item.type,
            color: item.color,
            linkUrl: item.linkUrl,
            position: item.position,
            isActive: item.isActive,
            createdAt: this.toDateOrNow(item.createdAt)
          }))
        });
      }

      if (snapshot.policies.length > 0) {
        await tx.policyDocument.createMany({
          data: snapshot.policies.map((item) => ({
            id: item.id,
            code: item.code,
            title: item.title,
            content: item.content,
            position: item.position,
            isActive: item.isActive,
            updatedBy: item.updatedBy,
            createdAt: this.toDateOrNow(item.createdAt)
          }))
        });
      }

      return this.createReleaseInTx(tx, {
        action: 'ROLLBACK',
        sourceReleaseId: target.id,
        snapshot,
        summary,
        note: rollbackNote,
        createdBy: adminId || null
      });
    });

    return {
      message: `已回滚并生成新版本 v${release.version}（目标版本 v${target.version}）`,
      release,
      targetVersion: target.version
    };
  }

  private async captureSnapshot(): Promise<ContentSnapshot> {
    const [banners, faqs, helps, tags, policies] = await this.prisma.$transaction([
      this.prisma.banner.findMany({ orderBy: [{ position: 'asc' }, { createdAt: 'asc' }] }),
      this.prisma.faq.findMany({ orderBy: [{ position: 'asc' }, { createdAt: 'asc' }] }),
      this.prisma.helpArticle.findMany({ orderBy: [{ position: 'asc' }, { createdAt: 'asc' }] }),
      this.prisma.marketTag.findMany({ orderBy: [{ position: 'asc' }, { createdAt: 'asc' }] }),
      this.prisma.policyDocument.findMany({ orderBy: [{ position: 'asc' }, { createdAt: 'asc' }] })
    ]);

    return {
      banners: banners.map((item) => ({
        id: item.id,
        title: item.title,
        subtitle: item.subtitle ?? null,
        imageUrl: item.imageUrl ?? null,
        linkUrl: item.linkUrl ?? null,
        badge: item.badge ?? null,
        position: item.position,
        isActive: item.isActive,
        startsAt: item.startsAt ? item.startsAt.toISOString() : null,
        endsAt: item.endsAt ? item.endsAt.toISOString() : null,
        createdAt: item.createdAt.toISOString()
      })),
      faqs: faqs.map((item) => ({
        id: item.id,
        category: item.category ?? null,
        question: item.question,
        answer: item.answer,
        position: item.position,
        isActive: item.isActive,
        createdAt: item.createdAt.toISOString()
      })),
      helps: helps.map((item) => ({
        id: item.id,
        category: item.category ?? null,
        title: item.title,
        content: item.content,
        position: item.position,
        isActive: item.isActive,
        createdAt: item.createdAt.toISOString()
      })),
      tags: tags.map((item) => ({
        id: item.id,
        name: item.name,
        type: item.type,
        color: item.color ?? null,
        linkUrl: item.linkUrl ?? null,
        position: item.position,
        isActive: item.isActive,
        createdAt: item.createdAt.toISOString()
      })),
      policies: policies.map((item) => ({
        id: item.id,
        code: item.code,
        title: item.title,
        content: item.content,
        position: item.position,
        isActive: item.isActive,
        updatedBy: item.updatedBy ?? null,
        createdAt: item.createdAt.toISOString()
      }))
    };
  }

  private buildSummary(snapshot: ContentSnapshot): ContentReleaseSummary {
    return {
      total: {
        banners: snapshot.banners.length,
        faqs: snapshot.faqs.length,
        helps: snapshot.helps.length,
        tags: snapshot.tags.length,
        policies: snapshot.policies.length
      },
      active: {
        banners: snapshot.banners.filter((item) => item.isActive).length,
        faqs: snapshot.faqs.filter((item) => item.isActive).length,
        helps: snapshot.helps.filter((item) => item.isActive).length,
        tags: snapshot.tags.filter((item) => item.isActive).length,
        policies: snapshot.policies.filter((item) => item.isActive).length
      }
    };
  }

  private normalizeSnapshot(raw: unknown): ContentSnapshot {
    const data = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};

    const banners = Array.isArray(data.banners) ? data.banners : [];
    const faqs = Array.isArray(data.faqs) ? data.faqs : [];
    const helps = Array.isArray(data.helps) ? data.helps : [];
    const tags = Array.isArray(data.tags) ? data.tags : [];
    const policies = Array.isArray(data.policies) ? data.policies : [];

    return {
      banners: banners
        .map((item) => this.normalizeBannerItem(item))
        .filter((item): item is SnapshotBanner => item !== null),
      faqs: faqs
        .map((item) => this.normalizeFaqItem(item))
        .filter((item): item is SnapshotFaq => item !== null),
      helps: helps
        .map((item) => this.normalizeHelpItem(item))
        .filter((item): item is SnapshotHelp => item !== null),
      tags: tags
        .map((item) => this.normalizeTagItem(item))
        .filter((item): item is SnapshotTag => item !== null),
      policies: policies
        .map((item) => this.normalizePolicyItem(item))
        .filter((item): item is SnapshotPolicy => item !== null)
    };
  }

  private normalizeBannerItem(raw: unknown): SnapshotBanner | null {
    if (!raw || typeof raw !== 'object') return null;
    const item = raw as Record<string, unknown>;
    const id = this.toStringOrNull(item.id);
    const title = this.toStringOrNull(item.title);
    const createdAt = this.toDateOrNow(item.createdAt).toISOString();
    if (!id || !title) return null;

    return {
      id,
      title,
      subtitle: this.toStringOrNull(item.subtitle),
      imageUrl: this.toStringOrNull(item.imageUrl),
      linkUrl: this.toStringOrNull(item.linkUrl),
      badge: this.toStringOrNull(item.badge),
      position: this.toNonNegativeInt(item.position, 0),
      isActive: this.toBoolean(item.isActive, true),
      startsAt: this.toDateOrNull(item.startsAt),
      endsAt: this.toDateOrNull(item.endsAt),
      createdAt
    };
  }

  private normalizeFaqItem(raw: unknown): SnapshotFaq | null {
    if (!raw || typeof raw !== 'object') return null;
    const item = raw as Record<string, unknown>;
    const id = this.toStringOrNull(item.id);
    const question = this.toStringOrNull(item.question);
    const answer = this.toStringOrNull(item.answer);
    const createdAt = this.toDateOrNow(item.createdAt).toISOString();
    if (!id || !question || !answer) return null;

    return {
      id,
      category: this.toStringOrNull(item.category),
      question,
      answer,
      position: this.toNonNegativeInt(item.position, 0),
      isActive: this.toBoolean(item.isActive, true),
      createdAt
    };
  }

  private normalizeHelpItem(raw: unknown): SnapshotHelp | null {
    if (!raw || typeof raw !== 'object') return null;
    const item = raw as Record<string, unknown>;
    const id = this.toStringOrNull(item.id);
    const title = this.toStringOrNull(item.title);
    const content = this.toStringOrNull(item.content);
    const createdAt = this.toDateOrNow(item.createdAt).toISOString();
    if (!id || !title || !content) return null;

    return {
      id,
      category: this.toStringOrNull(item.category),
      title,
      content,
      position: this.toNonNegativeInt(item.position, 0),
      isActive: this.toBoolean(item.isActive, true),
      createdAt
    };
  }

  private normalizeTagItem(raw: unknown): SnapshotTag | null {
    if (!raw || typeof raw !== 'object') return null;
    const item = raw as Record<string, unknown>;
    const id = this.toStringOrNull(item.id);
    const name = this.toStringOrNull(item.name);
    const type = this.toStringOrNull(item.type);
    const createdAt = this.toDateOrNow(item.createdAt).toISOString();
    if (!id || !name || !type) return null;

    return {
      id,
      name,
      type,
      color: this.toStringOrNull(item.color),
      linkUrl: this.toStringOrNull(item.linkUrl),
      position: this.toNonNegativeInt(item.position, 0),
      isActive: this.toBoolean(item.isActive, true),
      createdAt
    };
  }

  private normalizePolicyItem(raw: unknown): SnapshotPolicy | null {
    if (!raw || typeof raw !== 'object') return null;
    const item = raw as Record<string, unknown>;
    const id = this.toStringOrNull(item.id);
    const code = this.toStringOrNull(item.code);
    const title = this.toStringOrNull(item.title);
    const content = this.toStringOrNull(item.content);
    const createdAt = this.toDateOrNow(item.createdAt).toISOString();
    if (!id || !code || !title || !content) return null;

    return {
      id,
      code,
      title,
      content,
      position: this.toNonNegativeInt(item.position, 0),
      isActive: this.toBoolean(item.isActive, true),
      updatedBy: this.toStringOrNull(item.updatedBy),
      createdAt
    };
  }

  private async createReleaseWithRetry(input: CreateReleaseInput) {
    let attempt = 0;

    while (attempt < 3) {
      try {
        return await this.prisma.$transaction((tx) => this.createReleaseInTx(tx, input));
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002' &&
          attempt < 2
        ) {
          attempt += 1;
          continue;
        }
        throw error;
      }
    }

    throw new Error('创建发布版本失败，请稍后重试');
  }

  private async createReleaseInTx(tx: Prisma.TransactionClient, input: CreateReleaseInput) {
    const latest = await tx.contentRelease.findFirst({
      select: { version: true },
      orderBy: [{ version: 'desc' }]
    });

    const nextVersion = (latest?.version || 0) + 1;

    return tx.contentRelease.create({
      data: {
        version: nextVersion,
        action: input.action,
        sourceReleaseId: input.sourceReleaseId || null,
        snapshot: input.snapshot,
        summary: input.summary,
        note: input.note || null,
        createdBy: input.createdBy || null
      }
    });
  }

  private toStringOrNull(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
  }

  private toBoolean(value: unknown, fallback = false): boolean {
    return typeof value === 'boolean' ? value : fallback;
  }

  private toNonNegativeInt(value: unknown, fallback = 0): number {
    const numberValue = Number(value);
    if (!Number.isFinite(numberValue)) return fallback;
    return Math.max(0, Math.trunc(numberValue));
  }

  private toDateOrNull(value: unknown): string | null {
    if (typeof value !== 'string' || value.trim().length === 0) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date.toISOString();
  }

  private toDateOrNow(value: unknown): Date {
    if (typeof value === 'string' && value.trim().length > 0) {
      const date = new Date(value);
      if (!Number.isNaN(date.getTime())) return date;
    }
    return new Date();
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

  private async ensurePolicyDocument(id: string) {
    const item = await this.prisma.policyDocument.findUnique({ where: { id }, select: { id: true } });
    if (!item) throw new NotFoundException('规则文档不存在');
  }

  private async ensureAnnouncement(id: string) {
    const item = await this.prisma.announcement.findUnique({ where: { id }, select: { id: true } });
    if (!item) throw new NotFoundException('公告不存在');
  }
}
