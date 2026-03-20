import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { BadRequestException, ConflictException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import * as bcrypt from 'bcryptjs';

import { PrismaService } from '../../prisma/prisma.service';
import { AuthService } from '../auth.service';
import { NoticeService } from '../../notice/notice.service';
import { RiskService } from '../../risk/risk.service';

jest.mock('bcryptjs');
jest.mock('otplib', () => ({
  generateSecret: jest.fn(() => 'MOCKSECRET'),
  generateURI: jest.fn(() => 'otpauth://totp/IDC-Platform:test@test.com?secret=MOCKSECRET'),
  verifySync: jest.fn(({ token }) => ({ valid: token === '123456', delta: 0 })),
}));

describe('AuthService', () => {
  let service: AuthService;
  let prisma: any;
  let jwt: any;
  let noticeService: any;
  let riskService: any;

  beforeEach(async () => {
    prisma = {
      user: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      authCode: {
        create: jest.fn(),
        updateMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      userLoginLog: {
        create: jest.fn(),
        count: jest.fn(),
        findMany: jest.fn(),
      },
      $transaction: jest.fn((cb) => {
        if (typeof cb === 'function') return cb(prisma);
        return Promise.all(cb);
      }),
    };

    jwt = {
      sign: jest.fn(() => 'mock-jwt-token'),
    };
    noticeService = {
      createSystemNotice: jest.fn().mockResolvedValue({}),
    };
    riskService = {
      evaluate: jest.fn().mockResolvedValue({ action: 'ALLOW', reason: 'ok' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwt },
        { provide: NoticeService, useValue: noticeService },
        { provide: RiskService, useValue: riskService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('register', () => {
    it('should register a new user', async () => {
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');
      prisma.user.create.mockResolvedValue({
        id: 'u1',
        email: 'test@test.com',
        role: 'BUYER',
        createdAt: new Date(),
        emailVerifiedAt: null,
      });
      prisma.authCode.updateMany.mockResolvedValue({ count: 0 });
      prisma.authCode.create.mockResolvedValue({});

      const result = await service.register({ email: 'test@test.com', password: 'Pass1234' });
      expect(result).toHaveProperty('token', 'mock-jwt-token');
      expect(result.user.role).toBe('USER');
    });

    it('should throw on duplicate email', async () => {
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');
      prisma.user.create.mockRejectedValue(
        new PrismaClientKnownRequestError('Unique constraint', { code: 'P2002', clientVersion: '5.0.0' })
      );
      await expect(service.register({ email: 'dup@test.com', password: 'Pass1234' })).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    it('should throw if user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.userLoginLog.create.mockResolvedValue({});
      await expect(service.login({ email: 'no@test.com', password: '123' })).rejects.toThrow(UnauthorizedException);
    });

    it('should throw if user is banned', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1', email: 'b@test.com', status: 'BANNED', passwordHash: 'x' });
      prisma.userLoginLog.create.mockResolvedValue({});
      await expect(service.login({ email: 'b@test.com', password: '123' })).rejects.toThrow(UnauthorizedException);
    });

    it('should throw on wrong password', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1', email: 'ok@test.com', status: 'ACTIVE', passwordHash: 'hashed' });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      prisma.userLoginLog.create.mockResolvedValue({});
      await expect(service.login({ email: 'ok@test.com', password: 'wrong' })).rejects.toThrow(UnauthorizedException);
    });

    it('should login successfully', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'u1', email: 'ok@test.com', status: 'ACTIVE', passwordHash: 'hashed',
        role: 'BUYER', lastLoginIp: null, emailVerifiedAt: new Date(), createdAt: new Date(),
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      prisma.user.update.mockResolvedValue({});
      prisma.userLoginLog.create.mockResolvedValue({});

      const result = await service.login({ email: 'ok@test.com', password: 'correct' });
      expect(result).toHaveProperty('token', 'mock-jwt-token');
      expect(result.user.role).toBe('USER');
    });
  });

  describe('changePassword', () => {
    it('should throw if user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.changePassword('u1', { oldPassword: '1', newPassword: '2' })).rejects.toThrow(NotFoundException);
    });

    it('should throw on wrong old password', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1', passwordHash: 'hashed' });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      await expect(service.changePassword('u1', { oldPassword: 'wrong', newPassword: 'new' })).rejects.toThrow(BadRequestException);
    });

    it('should change password successfully', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1', passwordHash: 'hashed' });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (bcrypt.hash as jest.Mock).mockResolvedValue('newhashed');
      prisma.user.update.mockResolvedValue({});
      const result = await service.changePassword('u1', { oldPassword: 'old', newPassword: 'new' });
      expect(result).toHaveProperty('message', '密码修改成功');
    });
  });

  describe('MFA', () => {
    it('setupMfa should generate secret and otpauth uri', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1', email: 'test@test.com', mfaEnabled: false });
      prisma.user.update.mockResolvedValue({});
      const result = await service.setupMfa('u1');
      expect(result).toHaveProperty('secret', 'MOCKSECRET');
      expect(result).toHaveProperty('otpauth');
    });

    it('setupMfa should throw if already enabled', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1', mfaEnabled: true });
      await expect(service.setupMfa('u1')).rejects.toThrow(BadRequestException);
    });

    it('enableMfa should throw on invalid token', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1', mfaSecret: 'MOCKSECRET', mfaEnabled: false });
      await expect(service.enableMfa('u1', '000000')).rejects.toThrow(BadRequestException);
    });

    it('enableMfa should succeed with valid token', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1', mfaSecret: 'MOCKSECRET', mfaEnabled: false });
      prisma.user.update.mockResolvedValue({});
      const result = await service.enableMfa('u1', '123456');
      expect(result).toHaveProperty('message', 'MFA 启用成功');
    });

    it('disableMfa should throw if not enabled', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1', mfaEnabled: false });
      await expect(service.disableMfa('u1', '123456')).rejects.toThrow(BadRequestException);
    });

    it('verifyMfaLogin should return token on valid code', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1', email: 'x@x.com', role: 'BUYER', mfaEnabled: true, mfaSecret: 'MOCKSECRET' });
      const result = await service.verifyMfaLogin('u1', '123456');
      expect(result).toHaveProperty('token', 'mock-jwt-token');
    });
  });

  describe('getSecurityLogs', () => {
    it('should return paginated logs', async () => {
      prisma.userLoginLog.count.mockResolvedValue(2);
      prisma.userLoginLog.findMany.mockResolvedValue([{ id: '1' }, { id: '2' }]);
      const result = await service.getSecurityLogs('u1', { page: 1, pageSize: 20 });
      expect(result.total).toBe(2);
      expect(result.list).toHaveLength(2);
    });
  });
});
