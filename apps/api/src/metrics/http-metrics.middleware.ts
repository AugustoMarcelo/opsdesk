import type { NextFunction, Request, Response } from 'express';
import { MetricsService } from './metrics.service';

export function createHttpMetricsMiddleware(metrics: MetricsService) {
  return (req: Request, res: Response, next: NextFunction) => {
    const start = process.hrtime.bigint();

    res.on('finish', () => {
      const durationSeconds =
        Number(process.hrtime.bigint() - start) / 1_000_000_000;
      const route = resolveRouteLabel(req);
      const status = String(res.statusCode);
      const method = req.method;

      metrics.httpRequestTotal.inc({
        method,
        route,
        status,
      });

      if (res.statusCode >= 400) {
        metrics.httpRequestErrorsTotal.inc({
          method,
          route,
          status,
        });
      }

      metrics.httpRequestDuration.observe(
        {
          method,
          route,
        },
        durationSeconds,
      );
    });

    next();
  };
}

function resolveRouteLabel(req: Request): string {
  const baseUrl = typeof req.baseUrl === 'string' ? req.baseUrl : '';
  const routePath = (req.route as { path?: string } | undefined)?.path;

  if (typeof routePath === 'string') {
    return `${baseUrl}${routePath}`;
  }

  if (typeof req.path === 'string') {
    return `${baseUrl}${req.path}`;
  }

  if (typeof req.originalUrl === 'string') {
    const [pathOnly] = req.originalUrl.split('?');
    return pathOnly || 'unknown';
  }

  return 'unknown';
}
