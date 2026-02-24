import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';
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
    const baseUrl = typeof req.baseUrl === 'string' ? req.baseUrl : '';
    const routePath = (req.route as { path: string })?.path;
    const route =
      typeof routePath === 'string'
        ? `${baseUrl}${routePath}`
        : typeof req.path === 'string'
          ? `${baseUrl}${req.path}`
          : 'unknown';

    const endTimer = this.metrics.httpRequestDuration.startTimer({
      method,
      route,
    });

    return next.handle().pipe(
      finalize(() => {
        const status = String(res.statusCode);
        this.metrics.httpRequestTotal.inc({
          method,
          route,
          status,
        });

        if (res.statusCode >= 400) {
          this.metrics.httpRequestErrorsTotal.inc({
            method,
            route,
            status,
          });
        }

        endTimer();
      }),
    );
  }
}
