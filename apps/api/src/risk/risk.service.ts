import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RiskAction, RiskScene } from '@prisma/client';

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
