import { Module } from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { TicketsController } from './tickets.controller';
import { TicketsGateway } from './tickets.gateway';
import { AuthorizationService } from '../auth/authorization.service';

@Module({
  controllers: [TicketsController],
  providers: [TicketsService, TicketsGateway, AuthorizationService],
})
export class TicketsModule {}
