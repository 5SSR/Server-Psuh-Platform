import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD , APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';

import { AppController } from './app.controller';
import { HttpExceptionFilter } from './filters/http-exception.filter';
import { PrismaModule } from './prisma/prisma.module';
import { ProductModule } from './product/product.module';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { OrderModule } from './order/order.module';
import { WalletModule } from './wallet/wallet.module';
import { TaskModule } from './task/task.module';
import { PaymentModule } from './payment/payment.module';
import { AdminModule } from './admin/admin.module';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { NoticeModule } from './notice/notice.module';
import { ContentModule } from './content/content.module';
import { RiskModule } from './risk/risk.module';
import { WantedModule } from './wanted/wanted.module';
import { BargainModule } from './bargain/bargain.module';
import { ConsignmentModule } from './consignment/consignment.module';
import { StoreModule } from './store/store.module';
import { OpenApiModule } from './open-api/open-api.module';
import { SupportModule } from './support/support.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 60
    }]),
    PrismaModule,
    ProductModule,
    AuthModule,
    UserModule,
    OrderModule,
    WalletModule,
    TaskModule,
    PaymentModule,
    RiskModule,
    NoticeModule,
    ContentModule,
    WantedModule,
    BargainModule,
    ConsignmentModule,
    StoreModule,
    OpenApiModule,
    SupportModule,
    AdminModule
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard
    }
  ]
})
export class AppModule {}
