import { Module } from '@nestjs/common';
import { HealthModule } from './health/health.module';
import { LoggerModule } from './logger/logger.module';
import { TicketsModule } from './tickets/tickets.module';
import { MetricsModule } from './metrics/metrics.module';
import { MetricsInterceptor } from './metrics/metrics.interceptor';
import { RabbitMQModule } from './messaging/rabbitmq.module';

@Module({
  imports: [
    LoggerModule,
    HealthModule,
    TicketsModule,
    MetricsModule,
    RabbitMQModule,
  ],
  providers: [
    {
      provide: 'APP_INTERCEPTOR',
      useClass: MetricsInterceptor,
    },
  ],
})
export class AppModule {}
