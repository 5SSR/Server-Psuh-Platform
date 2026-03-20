import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

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

  const config = new DocumentBuilder()
    .setTitle('IDC 二手服务器交易平台 API')
    .setDescription('一期担保交易闭环接口')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(process.env.PORT || 3000);
  // eslint-disable-next-line no-console
  console.log(`API 服务已启动，端口：${process.env.PORT || 3000}`);
}

bootstrap();
