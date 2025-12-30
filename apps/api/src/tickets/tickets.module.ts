import { Module } from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { TicketsController } from './tickets.controller';
import { TicketsGateway } from './tickets.gateway';
import { AuthorizationService } from '../auth/authorization.service';
import { RabbitMQService } from '../messaging/rabbitmq.service';

@Module({
  controllers: [TicketsController],
  providers: [
    TicketsService,
    TicketsGateway,
    AuthorizationService,
    RabbitMQService,
  ],
})
export class TicketsModule {}
