import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  private hasRole(required: string, actual: string) {
    if (required === actual) return true;
    // 兼容“仅区分 USER / ADMIN”模式：BUYER/SELLER 统一视为 USER。
    if (required === 'USER' && (actual === 'BUYER' || actual === 'SELLER')) {
      return true;
    }
    return false;
  }

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<string[]>('roles', [
      context.getHandler(),
      context.getClass()
    ]);
    if (!roles || roles.length === 0) return true;
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user || !roles.some((requiredRole) => this.hasRole(requiredRole, user.role))) {
      throw new ForbiddenException('权限不足');
    }
    return true;
  }
}
