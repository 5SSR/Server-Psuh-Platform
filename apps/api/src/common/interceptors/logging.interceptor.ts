import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';

// 简单请求日志拦截器，输出方法、路径与耗时
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const { method, url } = req;
    const now = Date.now();
    return next.handle().pipe(
      tap(() => {
        const cost = Date.now() - now;
        // eslint-disable-next-line no-console
        console.log(`[${method}] ${url} ${cost}ms`);
      })
    );
  }
}
