import { Public } from './../auth/public.decorator';
import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

@ApiTags('Health')
@Controller('health')
export class HealthController {
  @ApiOperation({ summary: 'Check health of the API' })
  @ApiResponse({
    status: 200,
    description: 'API is healthy',
    example: {
      status: 'ok',
      service: 'api',
      uptime: 12345,
      timestamp: '2024-01-01T00:00:00.000Z',
    },
  })
  @Public()
  @Get()
  check() {
    return {
      status: 'ok',
      service: 'api',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }

  @ApiOperation({ summary: 'Slow endpoint for latency alert testing' })
  @ApiQuery({
    name: 'delay',
    required: false,
    type: Number,
    description: 'Delay in milliseconds (default 1500, max 10000)',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns after the specified delay',
  })
  @Public()
  @Get('slow')
  async slow(@Query('delay') delay?: string) {
    const ms = Math.min(
      Math.max(parseInt(delay || '1500', 10) || 1500, 100),
      10000,
    );
    await sleep(ms);
    return {
      status: 'ok',
      delayed: ms,
      timestamp: new Date().toISOString(),
    };
  }
}
