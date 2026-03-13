import { SetMetadata } from '@nestjs/common';

// 指定允许的角色列表
export const Roles = (...roles: string[]) => SetMetadata('roles', roles);
