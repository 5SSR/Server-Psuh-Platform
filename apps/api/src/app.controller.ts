import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get('health')
  health() {
    // 健康检查接口，便于探活与监控
    return { status: 'ok', ts: Date.now() };
  }
}
