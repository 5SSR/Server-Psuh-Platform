import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UseGuards
} from '@nestjs/common';

import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { SecurityLogQueryDto } from './dto/security-log-query.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { VerifyMfaDto } from './dto/verify-mfa.dto';
import { VerifyMfaLoginDto } from './dto/verify-mfa-login.dto';

interface RequestMeta {
  ip?: string;
  headers: Record<string, string | string[] | undefined>;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  private resolveClientIp(req: RequestMeta) {
    const xff = req.headers['x-forwarded-for'];
    if (Array.isArray(xff) && xff.length > 0) {
      return xff[0].split(',')[0].trim();
    }
    if (typeof xff === 'string' && xff.length > 0) {
      return xff.split(',')[0].trim();
    }
    return req.ip;
  }

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto, @Req() req: RequestMeta) {
    return this.authService.login(dto, {
      ip: this.resolveClientIp(req),
      userAgent: req.headers['user-agent']
    });
  }

  @Post('password/forgot')
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Post('password/reset')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Post('email/send-verify-code')
  @UseGuards(JwtAuthGuard)
  sendVerifyCode(@CurrentUser() user: { userId: string }) {
    return this.authService.sendEmailVerifyCode(user.userId);
  }

  @Post('email/verify')
  @UseGuards(JwtAuthGuard)
  verifyEmail(
    @CurrentUser() user: { userId: string },
    @Body() dto: VerifyEmailDto
  ) {
    return this.authService.verifyEmail(user.userId, dto.code);
  }

  @Get('security/logs')
  @UseGuards(JwtAuthGuard)
  securityLogs(
    @CurrentUser() user: { userId: string },
    @Query() query: SecurityLogQueryDto
  ) {
    return this.authService.getSecurityLogs(user.userId, query);
  }

  @Post('password/change')
  @UseGuards(JwtAuthGuard)
  changePassword(
    @CurrentUser() user: { userId: string },
    @Body() dto: ChangePasswordDto
  ) {
    return this.authService.changePassword(user.userId, dto);
  }

  // ---- MFA ----
  @Post('mfa/setup')
  @UseGuards(JwtAuthGuard)
  setupMfa(@CurrentUser() user: { userId: string }) {
    return this.authService.setupMfa(user.userId);
  }

  @Post('mfa/enable')
  @UseGuards(JwtAuthGuard)
  enableMfa(@CurrentUser() user: { userId: string }, @Body() dto: VerifyMfaDto) {
    return this.authService.enableMfa(user.userId, dto.token);
  }

  @Post('mfa/disable')
  @UseGuards(JwtAuthGuard)
  disableMfa(@CurrentUser() user: { userId: string }, @Body() dto: VerifyMfaDto) {
    return this.authService.disableMfa(user.userId, dto.token);
  }

  @Post('mfa/verify')
  verifyMfa(@Body() dto: VerifyMfaLoginDto) {
    return this.authService.verifyMfaLogin(dto.ticket, dto.token);
  }
}
