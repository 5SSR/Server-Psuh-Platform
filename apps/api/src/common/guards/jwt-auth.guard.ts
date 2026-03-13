import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// 基于 JWT 的通用鉴权守卫
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
