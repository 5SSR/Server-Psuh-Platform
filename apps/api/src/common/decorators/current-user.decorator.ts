import { createParamDecorator, ExecutionContext } from '@nestjs/common';

// 获取已认证用户的简易装饰器
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  }
);
