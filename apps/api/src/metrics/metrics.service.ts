import { Injectable } from '@nestjs/common';
import { collectDefaultMetrics, Counter, Histogram } from 'prom-client';

@Injectable()
export class MetricsService {
  readonly httpRequestTotal: Counter<string>;
  readonly httpRequestDuration: Histogram<string>;

  constructor() {
    collectDefaultMetrics();

    this.httpRequestTotal = new Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status'],
    });

    this.httpRequestDuration = new Histogram({
      name: 'http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route'],
      buckets: [0.1, 0.3, 0.5, 1, 2, 5],
    });
  }
}
