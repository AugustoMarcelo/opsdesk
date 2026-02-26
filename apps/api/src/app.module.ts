import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { HealthModule } from './health/health.module';
import { LoggerModule } from './logger/logger.module';
import { TicketsModule } from './tickets/tickets.module';
import { MetricsModule } from './metrics/metrics.module';
import { MetricsService } from './metrics/metrics.service';
import { createHttpMetricsMiddleware } from './metrics/http-metrics.middleware';
import { RabbitMQModule } from './messaging/rabbitmq.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { MessagesModule } from './messages/messages.module';
import { NotificationsModule } from './notifications/notifications.module';

@Module({
  imports: [
    LoggerModule,
    HealthModule,
    MetricsModule,
    RabbitMQModule,
    TicketsModule,
    MessagesModule,
    UsersModule,
    AuthModule,
    NotificationsModule,
  ],
})
export class AppModule implements NestModule {
  constructor(private readonly metrics: MetricsService) {}

  configure(consumer: MiddlewareConsumer) {
    consumer.apply(createHttpMetricsMiddleware(this.metrics)).forRoutes('*');
  }
}
