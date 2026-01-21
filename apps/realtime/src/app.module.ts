import { Module } from '@nestjs/common';
import { RealtimeModule } from './realtime/realtime.module';
import { DatabaseModule } from './db/database.module';
import { MessagingModule } from './messaging/messaging.module';

@Module({
  imports: [DatabaseModule, RealtimeModule, MessagingModule],
})
export class AppModule {}

