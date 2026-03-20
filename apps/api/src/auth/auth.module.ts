import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

import { NoticeModule } from '../notice/notice.module';
import { RiskModule } from '../risk/risk.module';

import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';
import { resolveJwtSecret } from './auth-secret.util';

@Module({
  imports: [
    PassportModule,
    NoticeModule,
    RiskModule,
    JwtModule.register({
      secret: resolveJwtSecret(),
      signOptions: { expiresIn: (process.env.JWT_EXPIRES || '7d') as any }
    })
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [JwtModule]
})
export class AuthModule {}
