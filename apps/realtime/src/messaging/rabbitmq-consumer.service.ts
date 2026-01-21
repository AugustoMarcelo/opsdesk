import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import * as amqp from 'amqplib';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import type { MessageSentEvent } from '../../../../packages/events/message-sent.event';
import type { TicketStatusChangedEvent } from '../../../../packages/events/ticket-status-changed.event';

@Injectable()
export class RabbitMqConsumerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RabbitMqConsumerService.name);
  private connection!: amqp.ChannelModel;
  private channel!: amqp.Channel;

  private readonly exchange = 'opsdesk.events';
  private readonly queueName = 'realtime.queue';

  constructor(private readonly gateway: RealtimeGateway) {}

  async onModuleInit(): Promise<void> {
    const url = process.env.RABBITMQ_URL;
    if (!url) {
      throw new Error('RABBITMQ_URL is not defined');
    }

    this.connection = await amqp.connect(url);
    this.channel = await this.connection.createChannel();

    await this.channel.assertExchange(this.exchange, 'topic', {
      durable: true,
    });

    const q = await this.channel.assertQueue(this.queueName, { durable: true });

    // Bind domain events
    await this.channel.bindQueue(q.queue, this.exchange, 'message.sent');
    await this.channel.bindQueue(q.queue, this.exchange, 'ticket.status_changed');

    this.logger.log('📡 Realtime consumer bound to: message.sent, ticket.status_changed');

    this.channel.consume(q.queue, async (msg: amqp.ConsumeMessage | null) => {
      if (!msg) return;

      try {
        const parsed = JSON.parse(msg.content.toString()) as
          | MessageSentEvent
          | TicketStatusChangedEvent;

        if (parsed.event === 'message.sent') {
          const ticketId = (parsed as MessageSentEvent).payload.ticketId;
          this.gateway.emitToTicketRoom('message:new', ticketId, parsed.payload);
        }

        if (parsed.event === 'ticket.status_changed') {
          const ticketId = (parsed as TicketStatusChangedEvent).payload.id;
          this.gateway.emitToTicketRoom(
            'ticket:statusChanged',
            ticketId,
            parsed.payload,
          );
        }

        this.channel.ack(msg);
      } catch (err) {
        this.logger.error('Failed to process message', err as Error);
        // Requeue false to avoid infinite poison loop (keep it simple for EPIC4)
        this.channel.nack(msg, false, false);
      }
    });
  }

  async onModuleDestroy(): Promise<void> {
    if (this.channel) await this.channel.close();
    if (this.connection) await this.connection.close();
  }
}

