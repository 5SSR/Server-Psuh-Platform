import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, RiskAction, RiskScene } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

interface RiskInput {
  userId?: string;
  ip?: string;
  email?: string;
  amount?: number;
  [key: string]: unknown;
}

@Injectable()
export class RiskService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly actionScoreMap: Record<RiskAction, number> = {
    ALLOW: 0,
    ALERT: 2,
    LIMIT: 3,
    REVIEW: 4,
    BLOCK: 6
  };

  async listRules(query: { page?: number; pageSize?: number; scene?: RiskScene; enabled?: boolean }) {
    const { page = 1, pageSize = 20, scene, enabled } = query;
    const where: Prisma.RiskRuleWhereInput = {
      ...(scene ? { scene } : {}),
      ...(typeof enabled === 'boolean' ? { enabled } : {})
    };
    const [total, list] = await this.prisma.$transaction([
      this.prisma.riskRule.count({ where }),
      this.prisma.riskRule.findMany({
        where,
        orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize
      })
    ]);
    return { total, list, page, pageSize };
  }

  async createRule(input: {
    code: string;
    name: string;
    scene: RiskScene;
    action: RiskAction;
    priority: number;
    condition: Record<string, unknown>;
    reason?: string;
    createdBy?: string;
  }) {
    return this.prisma.riskRule.create({
      data: {
        code: input.code,
        name: input.name,
        scene: input.scene,
        action: input.action,
        priority: input.priority,
        condition: input.condition as any,
        reason: input.reason,
        createdBy: input.createdBy,
        updatedBy: input.createdBy
      }
    });
  }

  async updateRule(id: string, input: {
    code?: string;
    name?: string;
    scene?: RiskScene;
    action?: RiskAction;
    priority?: number;
    condition?: Record<string, unknown>;
    reason?: string;
    enabled?: boolean;
    updatedBy?: string;
  }) {
    try {
      return await this.prisma.riskRule.update({
        where: { id },
        data: {
          ...(input.code ? { code: input.code } : {}),
          ...(input.name ? { name: input.name } : {}),
          ...(input.scene ? { scene: input.scene } : {}),
          ...(input.action ? { action: input.action } : {}),
          ...(typeof input.priority === 'number' ? { priority: input.priority } : {}),
          ...(input.condition ? { condition: input.condition as any } : {}),
          ...(typeof input.reason !== 'undefined' ? { reason: input.reason } : {}),
          ...(typeof input.enabled === 'boolean' ? { enabled: input.enabled } : {}),
          ...(input.updatedBy ? { updatedBy: input.updatedBy } : {})
        }
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('风控规则不存在');
      }
      throw error;
    }
  }

  async listHits(query: { page?: number; pageSize?: number; scene?: RiskScene; action?: RiskAction; userId?: string }) {
    const { page = 1, pageSize = 20, scene, action, userId } = query;
    const where: Prisma.RiskHitWhereInput = {
      ...(scene ? { scene } : {}),
      ...(action ? { action } : {}),
      ...(userId ? { userId } : {})
    };
    const [total, list] = await this.prisma.$transaction([
      this.prisma.riskHit.count({ where }),
      this.prisma.riskHit.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize
      })
    ]);
    return { total, list, page, pageSize };
  }

  async listEntities(query: { page?: number; pageSize?: number; listType?: string; entityType?: string; enabled?: boolean }) {
    const { page = 1, pageSize = 20, listType, entityType, enabled } = query;
    const where: Prisma.RiskEntityListWhereInput = {
      ...(listType ? { listType } : {}),
      ...(entityType ? { entityType } : {}),
      ...(typeof enabled === 'boolean' ? { enabled } : {})
    };
    const [total, list] = await this.prisma.$transaction([
      this.prisma.riskEntityList.count({ where }),
      this.prisma.riskEntityList.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize
      })
    ]);
    return { total, list, page, pageSize };
  }

  async getOverview(days = 7) {
    const windowDays = Number.isFinite(days) ? Math.min(Math.max(days, 1), 90) : 7;
    const startAt = new Date(Date.now() - windowDays * 24 * 3600 * 1000);

    const [totalHits, actionGroups, sceneGroups, userActionGroups, blacklistCount, watchlistCount] =
      await Promise.all([
        this.prisma.riskHit.count({
          where: { createdAt: { gte: startAt } }
        }),
        this.prisma.riskHit.groupBy({
          by: ['action'],
          where: { createdAt: { gte: startAt } },
          _count: { _all: true }
        }),
        this.prisma.riskHit.groupBy({
          by: ['scene'],
          where: { createdAt: { gte: startAt } },
          _count: { _all: true }
        }),
        this.prisma.riskHit.groupBy({
          by: ['userId', 'action'],
          where: {
            createdAt: { gte: startAt },
            userId: { not: null }
          },
          _count: { _all: true }
        }),
        this.prisma.riskEntityList.count({
          where: {
            listType: 'BLACKLIST',
            enabled: true,
            OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }]
          }
        }),
        this.prisma.riskEntityList.count({
          where: {
            listType: 'WATCHLIST',
            enabled: true,
            OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }]
          }
        })
      ]);

    const userScoreMap = new Map<
      string,
      { score: number; hitCount: number; blockCount: number; reviewCount: number }
    >();

    for (const item of userActionGroups) {
      const userId = item.userId;
      if (!userId) continue;
      const count = item._count._all;
      const current = userScoreMap.get(userId) || {
        score: 0,
        hitCount: 0,
        blockCount: 0,
        reviewCount: 0
      };
      current.hitCount += count;
      current.score += this.actionScoreMap[item.action] * count;
      if (item.action === 'BLOCK') current.blockCount += count;
      if (item.action === 'REVIEW') current.reviewCount += count;
      userScoreMap.set(userId, current);
    }

    const topRiskUsers = Array.from(userScoreMap.entries())
      .map(([userId, value]) => ({
        userId,
        ...value
      }))
      .sort((a, b) => b.score - a.score || b.hitCount - a.hitCount)
      .slice(0, 10);

    return {
      windowDays,
      totalHits,
      actionDistribution: actionGroups.map((item) => ({
        action: item.action,
        count: item._count._all
      })),
      sceneDistribution: sceneGroups.map((item) => ({
        scene: item.scene,
        count: item._count._all
      })),
      blacklistCount,
      watchlistCount,
      topRiskUsers
    };
  }

  async upsertEntity(input: {
    listType: string;
    entityType: string;
    entityValue: string;
    enabled?: boolean;
    reason?: string;
    expiresAt?: string;
  }) {
    return this.prisma.riskEntityList.upsert({
      where: {
        listType_entityType_entityValue: {
          listType: input.listType,
          entityType: input.entityType,
          entityValue: input.entityValue
        }
      },
      create: {
        listType: input.listType,
        entityType: input.entityType,
        entityValue: input.entityValue,
        enabled: input.enabled ?? true,
        reason: input.reason,
        expiresAt: input.expiresAt ? new Date(input.expiresAt) : null
      },
      update: {
        ...(typeof input.enabled === 'boolean' ? { enabled: input.enabled } : {}),
        ...(typeof input.reason !== 'undefined' ? { reason: input.reason } : {}),
        ...(typeof input.expiresAt !== 'undefined'
          ? { expiresAt: input.expiresAt ? new Date(input.expiresAt) : null }
          : {})
      }
    });
  }

  async updateEntity(id: string, input: { enabled?: boolean; reason?: string; expiresAt?: string }) {
    try {
      return await this.prisma.riskEntityList.update({
        where: { id },
        data: {
          ...(typeof input.enabled === 'boolean' ? { enabled: input.enabled } : {}),
          ...(typeof input.reason !== 'undefined' ? { reason: input.reason } : {}),
          ...(typeof input.expiresAt !== 'undefined'
            ? { expiresAt: input.expiresAt ? new Date(input.expiresAt) : null }
            : {})
        }
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('风险名单记录不存在');
      }
      throw error;
    }
  }

  async batchUpsertEntities(input: {
    listType: string;
    entityType: string;
    entityValues: string[];
    reason?: string;
    enabled?: boolean;
    expiresAt?: string;
  }) {
    const values = Array.from(
      new Set(
        (input.entityValues || [])
          .map((item) => item.trim())
          .filter((item) => item.length > 0)
      )
    );

    if (values.length === 0) {
      return { count: 0, listType: input.listType, entityType: input.entityType };
    }

    await this.prisma.$transaction(
      values.map((value) =>
        this.prisma.riskEntityList.upsert({
          where: {
            listType_entityType_entityValue: {
              listType: input.listType,
              entityType: input.entityType,
              entityValue: value
            }
          },
          create: {
            listType: input.listType,
            entityType: input.entityType,
            entityValue: value,
            enabled: input.enabled ?? true,
            reason: input.reason,
            expiresAt: input.expiresAt ? new Date(input.expiresAt) : null
          },
          update: {
            enabled: input.enabled ?? true,
            reason: input.reason,
            expiresAt: input.expiresAt ? new Date(input.expiresAt) : null
          }
        })
      )
    );

    return {
      count: values.length,
      listType: input.listType,
      entityType: input.entityType
    };
  }

  async exportEntities(query: {
    listType: string;
    entityType?: string;
    enabledOnly?: boolean;
  }) {
    const list = await this.prisma.riskEntityList.findMany({
      where: {
        listType: query.listType,
        ...(query.entityType ? { entityType: query.entityType } : {}),
        ...(query.enabledOnly ? { enabled: true } : {})
      },
      select: {
        entityType: true,
        entityValue: true,
        enabled: true,
        reason: true,
        expiresAt: true,
        createdAt: true
      },
      orderBy: [{ entityType: 'asc' }, { createdAt: 'asc' }]
    });

    return {
      listType: query.listType,
      entityType: query.entityType || null,
      enabledOnly: Boolean(query.enabledOnly),
      count: list.length,
      generatedAt: new Date().toISOString(),
      list
    };
  }

  async syncAutoWatchlist(input?: { windowHours?: number; thresholdScore?: number }) {
    const windowHours = Number.isFinite(input?.windowHours)
      ? Math.min(Math.max(Number(input?.windowHours), 1), 24 * 14)
      : 24;
    const thresholdScore = Number.isFinite(input?.thresholdScore)
      ? Math.min(Math.max(Number(input?.thresholdScore), 4), 200)
      : 12;
    const startAt = new Date(Date.now() - windowHours * 3600 * 1000);

    const groups = await this.prisma.riskHit.groupBy({
      by: ['userId', 'action'],
      where: {
        createdAt: { gte: startAt },
        userId: { not: null }
      },
      _count: { _all: true }
    });

    const scoreMap = new Map<
      string,
      { score: number; hitCount: number; blockCount: number; reviewCount: number }
    >();
    for (const item of groups) {
      const userId = item.userId;
      if (!userId) continue;
      const count = item._count._all;
      const current = scoreMap.get(userId) || {
        score: 0,
        hitCount: 0,
        blockCount: 0,
        reviewCount: 0
      };
      current.hitCount += count;
      current.score += this.actionScoreMap[item.action] * count;
      if (item.action === 'BLOCK') current.blockCount += count;
      if (item.action === 'REVIEW') current.reviewCount += count;
      scoreMap.set(userId, current);
    }

    const candidates = Array.from(scoreMap.entries())
      .filter(([, value]) => value.score >= thresholdScore)
      .map(([userId, value]) => ({ userId, ...value }));
    const candidateIds = candidates.map((item) => item.userId);

    let activated = 0;
    const disabledResult = await this.prisma.$transaction(async (tx) => {
      for (const item of candidates) {
        await tx.riskEntityList.upsert({
          where: {
            listType_entityType_entityValue: {
              listType: 'WATCHLIST',
              entityType: 'USER_ID',
              entityValue: item.userId
            }
          },
          create: {
            listType: 'WATCHLIST',
            entityType: 'USER_ID',
            entityValue: item.userId,
            enabled: true,
            reason: `[AUTO] 风险评分=${item.score} 命中=${item.hitCount}（窗口${windowHours}h）`
          },
          update: {
            enabled: true,
            reason: `[AUTO] 风险评分=${item.score} 命中=${item.hitCount}（窗口${windowHours}h）`
          }
        });
      }
      activated = candidates.length;

      const disableWhere: Prisma.RiskEntityListWhereInput = {
        listType: 'WATCHLIST',
        entityType: 'USER_ID',
        enabled: true,
        reason: { startsWith: '[AUTO]' }
      };

      return tx.riskEntityList.updateMany({
        where:
          candidateIds.length > 0
            ? {
                ...disableWhere,
                NOT: { entityValue: { in: candidateIds } }
              }
            : disableWhere,
        data: {
          enabled: false,
          reason: `[AUTO] 风险评分回落自动停用（窗口${windowHours}h）`
        }
      });
    });

    return {
      windowHours,
      thresholdScore,
      evaluatedUsers: scoreMap.size,
      candidates: candidates.length,
      activated,
      disabled: disabledResult.count,
      topCandidates: candidates.sort((a, b) => b.score - a.score).slice(0, 10)
    };
  }

  async evaluate(scene: RiskScene, input: RiskInput) {
    const now = new Date();

    // blacklist check has highest priority
    const blocked = await this.matchEntityList('BLACKLIST', input, now);
    if (blocked) {
      await this.logHit(scene, RiskAction.BLOCK, [], '命中黑名单', input);
      return { action: RiskAction.BLOCK, reason: '命中黑名单' };
    }

    const rules = await this.prisma.riskRule.findMany({
      where: { scene, enabled: true },
      orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }]
    });

    const matched = rules.filter((rule) => this.matchCondition(rule.condition as any, input));

    if (matched.length === 0) {
      return { action: RiskAction.ALLOW, reason: '无命中规则' };
    }

    const action = this.pickHighestAction(matched.map((item) => item.action));
    const reason = matched.map((item) => item.reason || item.code).join('; ');

    await this.logHit(
      scene,
      action,
      matched.map((item) => item.id),
      reason,
      input
    );

    return { action, reason, matchedRules: matched.map((item) => item.code) };
  }

  private async matchEntityList(listType: string, input: RiskInput, now: Date) {
    const candidates: Array<{ entityType: string; entityValue?: string }> = [
      { entityType: 'USER_ID', entityValue: input.userId },
      { entityType: 'IP', entityValue: input.ip },
      { entityType: 'EMAIL', entityValue: input.email }
    ];

    const checks = candidates.filter((item) => Boolean(item.entityValue));
    if (checks.length === 0) return false;

    const hit = await this.prisma.riskEntityList.findFirst({
      where: {
        listType,
        enabled: true,
        AND: [
          {
            OR: checks.map((item) => ({
              entityType: item.entityType,
              entityValue: item.entityValue!
            }))
          },
          {
            OR: [{ expiresAt: null }, { expiresAt: { gt: now } }]
          }
        ]
      }
    });

    return Boolean(hit);
  }

  private pickHighestAction(actions: RiskAction[]) {
    const score: Record<RiskAction, number> = {
      ALLOW: 1,
      ALERT: 2,
      LIMIT: 3,
      REVIEW: 4,
      BLOCK: 5
    };

    return actions.reduce((best, current) =>
      score[current] > score[best] ? current : best
    , RiskAction.ALLOW);
  }

  private matchCondition(condition: any, input: RiskInput): boolean {
    if (!condition || typeof condition !== 'object') return false;

    if (Array.isArray(condition.all)) {
      return condition.all.every((expr: any) => this.matchExpr(expr, input));
    }
    if (Array.isArray(condition.any)) {
      return condition.any.some((expr: any) => this.matchExpr(expr, input));
    }
    return this.matchExpr(condition, input);
  }

  private matchExpr(expr: any, input: RiskInput): boolean {
    const field = expr?.field;
    const op = expr?.op;
    const value = expr?.value;
    if (!field || !op) return false;

    const actual = input[field];
    switch (op) {
      case 'eq':
        return actual === value;
      case 'neq':
        return actual !== value;
      case 'gt':
        return Number(actual) > Number(value);
      case 'gte':
        return Number(actual) >= Number(value);
      case 'lt':
        return Number(actual) < Number(value);
      case 'lte':
        return Number(actual) <= Number(value);
      case 'contains':
        return String(actual ?? '').includes(String(value ?? ''));
      case 'in':
        return Array.isArray(value) ? value.includes(actual) : false;
      default:
        return false;
    }
  }

  private async logHit(
    scene: RiskScene,
    action: RiskAction,
    matchedRuleIds: string[],
    decisionReason: string,
    input: RiskInput
  ) {
    await this.prisma.riskHit.create({
      data: {
        scene,
        action,
        matchedRuleIds,
        decisionReason,
        userId: input.userId,
        ip: input.ip,
        input: input as any
      }
    });
  }
}
