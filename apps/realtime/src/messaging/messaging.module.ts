import { Module } from '@nestjs/common';
import { RabbitMqConsumerService } from './rabbitmq-consumer.service';
import { RealtimeModule } from '../realtime/realtime.module';

@Module({
  imports: [RealtimeModule],
  providers: [RabbitMqConsumerService],
})
export class MessagingModule {}

