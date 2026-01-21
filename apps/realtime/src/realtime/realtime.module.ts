import { Module } from '@nestjs/common';
import { RealtimeGateway } from './realtime.gateway';
import { RealtimeAuthService } from './realtime-auth.service';
import { TicketsRepository } from './tickets.repository';
import { UsersRepository } from './users.repository';
import { UserResolver } from './user-resolver.service';
import { DatabaseModule } from '../db/database.module';

@Module({
  imports: [DatabaseModule],
  providers: [
    RealtimeGateway,
    RealtimeAuthService,
    TicketsRepository,
    UsersRepository,
    UserResolver,
  ],
  exports: [RealtimeGateway],
})
export class RealtimeModule {}

