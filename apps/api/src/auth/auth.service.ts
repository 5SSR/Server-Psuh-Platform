import { createHash } from 'crypto';

import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import {
  AuthCodeScene,
  RiskScene,
  UserRole,
  UserStatus
} from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { generateSecret, generateURI, verifySync } from 'otplib';

import { PrismaService } from '../prisma/prisma.service';
import { NoticeService } from '../notice/notice.service';
import { RiskService } from '../risk/risk.service';

import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { SecurityLogQueryDto } from './dto/security-log-query.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { resolveAuthCodeSecret } from './auth-secret.util';



interface LoginMeta {
  ip?: string;
  userAgent?: string | string[];
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly noticeService: NoticeService,
    private readonly riskService: RiskService
  ) {}

  private async sendSystemNotice(input: {
    userId: string;
    type: string;
    payload?: Record<string, unknown>;
    title?: string;
    content?: string;
  }) {
    try {
      await this.noticeService.createSystemNotice(input);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      this.logger.warn(`发送通知失败 type=${input.type} userId=${input.userId}: ${reason}`);
    }
  }

  private signToken(payload: { sub: string; role: UserRole }) {
    return this.jwtService.sign(payload);
  }

  private signMfaTicket(payload: { sub: string }) {
    return this.jwtService.sign(
      { sub: payload.sub, purpose: 'MFA_LOGIN' },
      { expiresIn: (process.env.AUTH_MFA_TICKET_EXPIRES || '5m') as any }
    );
  }

  private verifyMfaTicket(ticket: string) {
    try {
      const decoded = this.jwtService.verify(ticket) as Record<string, unknown>;
      if (decoded?.purpose !== 'MFA_LOGIN' || typeof decoded?.sub !== 'string') {
        throw new UnauthorizedException('MFA 票据无效');
      }
      return decoded.sub;
    } catch {
      throw new UnauthorizedException('MFA 票据无效或已过期');
    }
  }

  private presentRole(role: UserRole) {
    return role === UserRole.ADMIN ? 'ADMIN' : 'USER';
  }

  private normalizeEmail(email: string) {
    return email.trim().toLowerCase();
  }

  private normalizeUserAgent(userAgent?: string | string[]) {
    if (Array.isArray(userAgent) && userAgent.length > 0) {
      return userAgent[0];
    }
    return typeof userAgent === 'string' ? userAgent : undefined;
  }

  private get authCodeTtlMinutes() {
    return Number(process.env.AUTH_CODE_TTL_MINUTES || 10);
  }

  private isProduction() {
    return process.env.NODE_ENV === 'production';
  }

  private generateCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private hashCode(code: string) {
    const secret = resolveAuthCodeSecret();
    return createHash('sha256')
      .update(`${code}:${secret}`)
      .digest('hex');
  }

  private async issueCode(email: string, scene: AuthCodeScene, userId?: string) {
    const code = this.generateCode();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.authCodeTtlMinutes * 60 * 1000);
    const codeHash = this.hashCode(code);

    // 同邮箱同场景仅保留最新一条有效验证码
    await this.prisma.authCode.updateMany({
      where: {
        email,
        scene,
        usedAt: null,
        expiresAt: { gt: now }
      },
      data: { usedAt: now }
    });

    await this.prisma.authCode.create({
      data: {
        email,
        scene,
        codeHash,
        expiresAt
      }
    });

    if (userId) {
      await this.sendSystemNotice({
        userId,
        type: 'AUTH_CODE_ISSUED',
        payload: {
          scene,
          expiresAt: expiresAt.toISOString()
        }
      });
    }
    return code;
  }

  private async validateCode(email: string, scene: AuthCodeScene, code: string) {
    const now = new Date();
    const codeHash = this.hashCode(code.trim());
    const target = await this.prisma.authCode.findFirst({
      where: {
        email,
        scene,
        codeHash,
        usedAt: null,
        expiresAt: { gt: now }
      },
      orderBy: { createdAt: 'desc' }
    });
    if (!target) {
      throw new BadRequestException('验证码无效或已过期');
    }
    await this.prisma.authCode.update({
      where: { id: target.id },
      data: { usedAt: now }
    });
    return target;
  }

  private buildCodeResponse(message: string, code?: string) {
    if (!this.isProduction() && code) {
      return { message, devCode: code };
    }
    return { message };
  }

  private async appendLoginLog(input: {
    userId?: string;
    email: string;
    ip?: string;
    userAgent?: string;
    success: boolean;
    reason?: string;
  }) {
    await this.prisma.userLoginLog.create({
      data: {
        userId: input.userId,
        email: input.email,
        ip: input.ip,
        userAgent: input.userAgent,
        success: input.success,
        reason: input.reason
      }
    });
  }

  async register(dto: RegisterDto) {
    const hash = await bcrypt.hash(dto.password, 12);
    const email = this.normalizeEmail(dto.email);
    const role = UserRole.BUYER;
    try {
      const user = await this.prisma.user.create({
        data: {
          email,
          passwordHash: hash,
          role
        },
        select: {
          id: true,
          email: true,
          role: true,
          createdAt: true,
          emailVerifiedAt: true
        }
      });
      const verifyCode = await this.issueCode(
        user.email,
        AuthCodeScene.VERIFY_EMAIL,
        user.id
      );
      return {
        token: this.signToken({ sub: user.id, role: user.role }),
        user: {
          ...user,
          role: this.presentRole(user.role)
        },
        verifyRequired: !user.emailVerifiedAt,
        ...this.buildCodeResponse('注册成功，请完成邮箱验证', verifyCode)
      };
    } catch (err) {
      if (err instanceof PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException('邮箱已被注册');
      }
      throw err;
    }
  }

  async login(dto: LoginDto, meta: LoginMeta = {}) {
    const email = this.normalizeEmail(dto.email);
    const ip = meta.ip;
    const userAgent = this.normalizeUserAgent(meta.userAgent);
    const user = await this.prisma.user.findUnique({
      where: { email }
    });
    if (!user) {
      await this.appendLoginLog({
        email,
        ip,
        userAgent,
        success: false,
        reason: 'USER_NOT_FOUND'
      });
      throw new UnauthorizedException('账号或密码错误');
    }
    if (user.status === UserStatus.BANNED) {
      await this.appendLoginLog({
        userId: user.id,
        email: user.email,
        ip,
        userAgent,
        success: false,
        reason: 'USER_BANNED'
      });
      throw new UnauthorizedException('账号已被封禁');
    }
    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) {
      await this.appendLoginLog({
        userId: user.id,
        email: user.email,
        ip,
        userAgent,
        success: false,
        reason: 'BAD_PASSWORD'
      });
      throw new UnauthorizedException('账号或密码错误');
    }

    const loginRisk = await this.riskService.evaluate(RiskScene.LOGIN, {
      userId: user.id,
      email: user.email,
      ip
    });
    if (loginRisk.action === 'BLOCK') {
      await this.appendLoginLog({
        userId: user.id,
        email: user.email,
        ip,
        userAgent,
        success: false,
        reason: 'RISK_BLOCKED'
      });
      throw new UnauthorizedException('登录请求触发风控拦截，请稍后再试');
    }

    const now = new Date();
    const isAbnormalLogin = Boolean(user.lastLoginIp && ip && user.lastLoginIp !== ip);

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: {
          lastLoginAt: now,
          lastLoginIp: ip ?? user.lastLoginIp
        }
      });

      await tx.userLoginLog.create({
        data: {
          userId: user.id,
          email: user.email,
          ip,
          userAgent,
          success: true
        }
      });

    });

    if (isAbnormalLogin) {
      await this.sendSystemNotice({
        userId: user.id,
        type: 'LOGIN_ALERT',
        payload: {
          previousIp: user.lastLoginIp,
          currentIp: ip,
          userAgent,
          at: now.toISOString()
        }
      });
    }

    if (loginRisk.action !== 'ALLOW') {
      await this.sendSystemNotice({
        userId: user.id,
        type: 'LOGIN_RISK_NOTICE',
        payload: {
          action: loginRisk.action,
          reason: loginRisk.reason,
          at: now.toISOString()
        },
        title: '登录风控提醒',
        content: `本次登录被标记为 ${loginRisk.action}，平台已记录并持续监测。`
      });
    }

    const userInfo = {
      id: user.id,
      email: user.email,
      role: this.presentRole(user.role),
      status: user.status,
      emailVerifiedAt: user.emailVerifiedAt,
      createdAt: user.createdAt
    };

    if (user.mfaEnabled && user.mfaSecret) {
      return {
        mfaRequired: true,
        mfaTicket: this.signMfaTicket({ sub: user.id }),
        user: userInfo
      };
    }

    return {
      token: this.signToken({ sub: user.id, role: user.role }),
      user: userInfo
    };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const email = this.normalizeEmail(dto.email);
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true }
    });

    let code: string | undefined;
    if (user) {
      code = await this.issueCode(email, AuthCodeScene.RESET_PASSWORD, user.id);
    }

    return this.buildCodeResponse(
      '若邮箱已注册，我们已发送重置验证码',
      code
    );
  }

  async resetPassword(dto: ResetPasswordDto) {
    const email = this.normalizeEmail(dto.email);
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true }
    });
    if (!user) {
      throw new BadRequestException('验证码或邮箱无效');
    }
    await this.validateCode(email, AuthCodeScene.RESET_PASSWORD, dto.code);
    const passwordHash = await bcrypt.hash(dto.newPassword, 12);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash }
    });
    await this.sendSystemNotice({
      userId: user.id,
      type: 'PASSWORD_RESET',
      payload: { at: new Date().toISOString() }
    });
    return { message: '密码重置成功，请重新登录' };
  }

  async sendEmailVerifyCode(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, emailVerifiedAt: true }
    });
    if (!user) throw new NotFoundException('用户不存在');
    if (user.emailVerifiedAt) {
      return { message: '邮箱已验证，无需重复操作' };
    }
    const code = await this.issueCode(user.email, AuthCodeScene.VERIFY_EMAIL, user.id);
    return this.buildCodeResponse('邮箱验证码已发送', code);
  }

  async verifyEmail(userId: string, code: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, emailVerifiedAt: true }
    });
    if (!user) throw new NotFoundException('用户不存在');
    if (user.emailVerifiedAt) {
      return { message: '邮箱已验证' };
    }
    await this.validateCode(user.email, AuthCodeScene.VERIFY_EMAIL, code);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { emailVerifiedAt: new Date() }
    });
    await this.sendSystemNotice({
      userId: user.id,
      type: 'EMAIL_VERIFIED',
      payload: { at: new Date().toISOString() }
    });
    return { message: '邮箱验证成功' };
  }

  async getSecurityLogs(userId: string, query: SecurityLogQueryDto) {
    const { page = 1, pageSize = 20 } = query;
    const [total, list] = await this.prisma.$transaction([
      this.prisma.userLoginLog.count({ where: { userId } }),
      this.prisma.userLoginLog.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize
      })
    ]);
    return { total, list, page, pageSize };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('用户不存在');
    const ok = await bcrypt.compare(dto.oldPassword, user.passwordHash);
    if (!ok) throw new BadRequestException('原密码错误');
    const passwordHash = await bcrypt.hash(dto.newPassword, 12);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash }
    });
    return { message: '密码修改成功' };
  }

  // ---- MFA (TOTP) ----

  async setupMfa(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('用户不存在');
    if (user.mfaEnabled) throw new BadRequestException('MFA 已启用');

    const secret = generateSecret();
    await this.prisma.user.update({
      where: { id: userId },
      data: { mfaSecret: secret }
    });

    const otpauth = generateURI({ strategy: 'totp', issuer: 'IDC-Platform', label: user.email, secret });
    return { secret, otpauth };
  }

  async enableMfa(userId: string, token: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.mfaSecret) throw new BadRequestException('请先设置 MFA');
    if (user.mfaEnabled) throw new BadRequestException('MFA 已启用');

    const result = verifySync({ token, secret: user.mfaSecret });
    if (!result.valid) throw new BadRequestException('验证码无效');

    await this.prisma.user.update({
      where: { id: userId },
      data: { mfaEnabled: true }
    });
    return { message: 'MFA 启用成功' };
  }

  async disableMfa(userId: string, token: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('用户不存在');
    if (!user.mfaEnabled) throw new BadRequestException('MFA 未启用');

    const result = verifySync({ token, secret: user.mfaSecret! });
    if (!result.valid) throw new BadRequestException('验证码无效');

    await this.prisma.user.update({
      where: { id: userId },
      data: { mfaEnabled: false, mfaSecret: null }
    });
    return { message: 'MFA 已关闭' };
  }

  async verifyMfaLogin(ticket: string, token: string) {
    const userId = this.verifyMfaTicket(ticket);
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('用户不存在');
    if (!user.mfaEnabled || !user.mfaSecret) {
      throw new BadRequestException('MFA 未启用');
    }
    const result = verifySync({ token, secret: user.mfaSecret });
    if (!result.valid) throw new UnauthorizedException('MFA 验证码无效');
    return {
      token: this.signToken({ sub: user.id, role: user.role }),
      user: {
        id: user.id,
        email: user.email,
        role: this.presentRole(user.role)
      }
    };
  }
}
