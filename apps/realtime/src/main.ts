import 'dotenv/config';

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  await app.listen(process.env.REALTIME_PORT ?? 3002, '0.0.0.0');
}

void bootstrap();

