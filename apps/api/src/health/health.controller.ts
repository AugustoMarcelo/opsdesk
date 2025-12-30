import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

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
  @Get()
  check() {
    return {
      status: 'ok',
      service: 'api',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }
}
