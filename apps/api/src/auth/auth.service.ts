import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcryptjs';
import {
  AuthCodeScene,
  NoticeChannel,
  UserRole,
  UserStatus
} from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { SecurityLogQueryDto } from './dto/security-log-query.dto';
import { createHash } from 'crypto';

interface LoginMeta {
  ip?: string;
  userAgent?: string | string[];
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService
  ) {}

  private signToken(payload: { sub: string; role: UserRole }) {
    return this.jwtService.sign(payload);
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
    const secret = process.env.AUTH_CODE_SECRET || process.env.JWT_SECRET || 'auth-code';
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
      await this.prisma.notice.create({
        data: {
          userId,
          type: 'AUTH_CODE_ISSUED',
          channel: NoticeChannel.SITE,
          payload: {
            scene,
            expiresAt: expiresAt.toISOString()
          } as any
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

      if (isAbnormalLogin) {
        await tx.notice.create({
          data: {
            userId: user.id,
            type: 'LOGIN_ALERT',
            channel: NoticeChannel.SITE,
            payload: {
              previousIp: user.lastLoginIp,
              currentIp: ip,
              userAgent,
              at: now.toISOString()
            } as any
          }
        });
      }
    });

    return {
      token: this.signToken({ sub: user.id, role: user.role }),
      user: {
        id: user.id,
        email: user.email,
        role: this.presentRole(user.role),
        status: user.status,
        emailVerifiedAt: user.emailVerifiedAt,
        createdAt: user.createdAt
      }
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
    await this.prisma.notice.create({
      data: {
        userId: user.id,
        type: 'PASSWORD_RESET',
        channel: NoticeChannel.SITE,
        payload: { at: new Date().toISOString() } as any
      }
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
    await this.prisma.notice.create({
      data: {
        userId: user.id,
        type: 'EMAIL_VERIFIED',
        channel: NoticeChannel.SITE,
        payload: { at: new Date().toISOString() } as any
      }
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
}
