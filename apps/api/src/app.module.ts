import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { AppController } from './app.controller';
import { HttpExceptionFilter } from './filters/http-exception.filter';

@Module({
  controllers: [AppController],
  providers: [
    // 全局异常过滤，统一错误返回格式
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter
    }
  ]
})
export class AppModule {}
