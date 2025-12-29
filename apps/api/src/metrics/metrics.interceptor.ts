import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { MetricsService } from './metrics.service';
import type { Request, Response } from 'express';

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private readonly metrics: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();

    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();

    const method = req.method;
    const route = typeof req.url === 'string' ? req.url : 'unknown';

    const endTimer = this.metrics.httpRequestDuration.startTimer({
      method,
      route,
    });

    return next.handle().pipe(
      tap(() => {
        this.metrics.httpRequestTotal.inc({
          method,
          route,
          status: res.statusCode,
        });

        endTimer();
      }),
    );
  }
}
