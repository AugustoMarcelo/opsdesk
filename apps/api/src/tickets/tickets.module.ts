import { DatabaseModule } from './../db/database.module';
import { RabbitMQModule } from './../messaging/rabbitmq.module';
import { AuthModule } from './../auth/auth.module';
import { AuditModule } from './../audit/audit.module';
import { TicketsRepository } from './tickets.repository';
import { Module } from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { TicketsController } from './tickets.controller';
import { TicketStatusHistoryRepository } from './tickets-status-history.repository';
import { TicketHistoryRepository } from './tickets-history.repository';

@Module({
  imports: [AuthModule, RabbitMQModule, DatabaseModule, AuditModule],
  controllers: [TicketsController],
  providers: [
    TicketsService,
    TicketsRepository,
    TicketHistoryRepository,
    TicketStatusHistoryRepository,
  ],
  exports: [TicketsService],
})
export class TicketsModule {}
