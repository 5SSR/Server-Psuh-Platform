import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 统一前缀便于网关或反向代理配置
  app.setGlobalPrefix('api/v1');

  // 全局验证管道，确保 DTO 输入安全
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true
    })
  );

  app.enableCors();

  await app.listen(process.env.PORT || 3000);
  // eslint-disable-next-line no-console
  console.log(`API 服务已启动，端口：${process.env.PORT || 3000}`);
}

bootstrap();
