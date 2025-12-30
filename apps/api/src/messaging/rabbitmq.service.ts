import { OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import * as amqp from 'amqplib';

export class RabbitMQService implements OnModuleInit, OnModuleDestroy {
  private connection!: amqp.Connection;
  private channel!: amqp.Channel;

  private readonly exchange = 'opsdesk.events';
  private readonly exchangeType = 'topic';

  async onModuleInit(): Promise<void> {
    const url = process.env.RABBITMQ_URL!;

    if (!url) {
      throw new Error('RABBITMQ_URL is not defined');
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    this.connection = await amqp.connect(url);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    this.channel = await this.connection.createChannel();

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    await this.channel.assertExchange(this.exchange, this.exchangeType, {
      durable: true,
    });
  }

  publish<T>(routingKey: string, payload: T): void {
    console.log(JSON.stringify(payload));
    const buffer = Buffer.from(JSON.stringify(payload));

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    this.channel.publish(this.exchange, routingKey, buffer, {
      persistent: true,
      contentType: 'application/json',
    });
  }

  async onModuleDestroy(): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    if (this.channel) await this.channel.close();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    if (this.connection) await this.connection.close();
  }
}
