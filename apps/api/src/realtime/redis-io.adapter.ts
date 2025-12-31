import { INestApplicationContext, Logger } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { Redis } from 'ioredis';
import { Server, ServerOptions } from 'socket.io';

export class RedisIoAdapter extends IoAdapter {
  private readonly logger = new Logger(RedisIoAdapter.name);
  private readonly adapter: ReturnType<typeof createAdapter>;

  constructor(app: INestApplicationContext) {
    super(app);

    const pubClient = new Redis({
      host: process.env.REDIS_HOST ?? 'localhost',
      port: Number(process.env.REDIS_PORT ?? 6379),
    });

    const subClient = pubClient.duplicate();

    pubClient.on('error', (err) => {
      this.logger.error('Redis pubClient error', err);
    });

    subClient.on('error', (err) => {
      this.logger.error('Redis subClient error', err);
    });

    pubClient.on('connect', () => {
      this.logger.log('Redis pubClient connected');
    });

    subClient.on('connect', () => {
      this.logger.log('Redis subClient connected');
    });

    this.adapter = createAdapter(pubClient, subClient);
  }

  override createIOServer(port: number, options?: ServerOptions) {
    const server = super.createIOServer(port, options) as Server;
    server.adapter(this.adapter);
    return server;
  }
}
