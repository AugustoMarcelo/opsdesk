import { Controller, Get, Res } from '@nestjs/common';
import type { ServerResponse } from 'http';
import { register } from 'prom-client';

@Controller('metrics')
export class MetricsController {
  @Get()
  async metrics(@Res() res: ServerResponse) {
    res.setHeader('Content-Type', register.contentType);
    res.end(await register.metrics());
  }
}
