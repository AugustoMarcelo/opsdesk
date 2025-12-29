import { Module } from '@nestjs/common';
import { HealthModule } from './health/health.module';
import { LoggerModule } from './logger/logger.module';
import { TicketsModule } from './tickets/tickets.module';

@Module({
  imports: [LoggerModule, HealthModule, TicketsModule],
})
export class AppModule {}
