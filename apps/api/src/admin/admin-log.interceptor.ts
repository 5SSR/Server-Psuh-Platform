import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { AdminLogService } from './admin-log.service';

@Injectable()
export class AdminLogInterceptor implements NestInterceptor {
  constructor(private readonly adminLogService: AdminLogService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const user = req.user;

    // Only log admin write operations
    if (!user || user.role !== 'ADMIN') return next.handle();
    if (req.method === 'GET') return next.handle();

    const action = `${req.method} ${req.route?.path || req.url}`;
    const ip =
      (Array.isArray(req.headers['x-forwarded-for'])
        ? req.headers['x-forwarded-for'][0]
        : typeof req.headers['x-forwarded-for'] === 'string'
          ? req.headers['x-forwarded-for'].split(',')[0].trim()
          : req.ip) || undefined;

    return next.handle().pipe(
      tap(() => {
        this.adminLogService
          .log({
            adminId: user.userId,
            action,
            resource: req.params?.id ? context.getClass().name : undefined,
            resourceId: req.params?.id,
            ip
          })
          .catch(() => {});
      })
    );
  }
}
