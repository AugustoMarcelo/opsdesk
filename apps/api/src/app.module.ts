import { Module } from '@nestjs/common';
import { HealthModule } from './health/health.module';
import { LoggerModule } from './logger/logger.module';
import { TicketsModule } from './tickets/tickets.module';
import { MetricsModule } from './metrics/metrics.module';
import { MetricsInterceptor } from './metrics/metrics.interceptor';
import { RabbitMQModule } from './messaging/rabbitmq.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    LoggerModule,
    HealthModule,
    MetricsModule,
    RabbitMQModule,
    TicketsModule,
    UsersModule,
  ],
  providers: [
    {
      provide: 'APP_INTERCEPTOR',
      useClass: MetricsInterceptor,
    },
  ],
})
export class AppModule {}
