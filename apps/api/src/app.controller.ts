import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get('health')
  health() {
    return { status: 'ok', ts: Date.now(), uptime: Math.floor(process.uptime()) };
  }

  @Get('ready')
  ready() {
    return { status: 'ready', ts: Date.now() };
  }

  @Get('metrics')
  metrics() {
    const mem = process.memoryUsage();
    return {
      ts: Date.now(),
      uptimeSec: Math.floor(process.uptime()),
      memory: {
        rss: mem.rss,
        heapTotal: mem.heapTotal,
        heapUsed: mem.heapUsed,
        external: mem.external
      }
    };
  }
}
