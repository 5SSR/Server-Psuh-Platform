import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UseGuards
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { SecurityLogQueryDto } from './dto/security-log-query.dto';
import { Request } from 'express';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  private resolveClientIp(req: Request) {
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
  login(@Body() dto: LoginDto, @Req() req: Request) {
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
}
