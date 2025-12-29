import { OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import * as amqp from 'amqplib';

export class RabbitMQService implements OnModuleInit, OnModuleDestroy {
  private connection!: amqp.Connection;
  private channel!: amqp.Channel;

  private readonly exchange = 'opsdesk.exchange';

  async onModuleInit(): Promise<void> {
    const url = process.env.RABBITMQ_URL!;

    if (!url) {
      throw new Error('RABBITMQ_URL is not defined');
    }

    this.connection = await amqp.connect(url);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
    this.channel = await this.connection.createChannel();

    await this.channel.assertExchange(this.exchange, 'topic', {
      durable: true,
    });
  }

  publish<T>(routingKey: string, payload: T): void {
    const buffer = Buffer.from(JSON.stringify(payload));

    this.channel.publish(this.exchange, routingKey, buffer, {
      persistent: true,
      contentType: 'application/json',
    });
  }

  async onModuleDestroy(): Promise<void> {
    if (this.channel) await this.channel.close();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    if (this.connection) await this.connection.close();
  }
}
