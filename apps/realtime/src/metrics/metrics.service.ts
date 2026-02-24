import { Injectable } from '@nestjs/common';
import { collectDefaultMetrics, Counter, Gauge } from 'prom-client';

@Injectable()
export class MetricsService {
  readonly activeConnectionsGauge: Gauge<string>;
  readonly wsEventsEmittedTotal: Counter<string>;

  constructor() {
    collectDefaultMetrics();

    this.activeConnectionsGauge = new Gauge({
      name: 'realtime_active_connections',
      help: 'Current number of active websocket connections',
    });

    this.wsEventsEmittedTotal = new Counter({
      name: 'realtime_events_emitted_total',
      help: 'Total number of events emitted to websocket clients',
      labelNames: ['event'],
    });
  }

  incrementActiveConnections() {
    this.activeConnectionsGauge.inc();
  }

  decrementActiveConnections() {
    this.activeConnectionsGauge.dec();
  }

  trackEventEmission(event: string) {
    this.wsEventsEmittedTotal.inc({ event });
  }
}
