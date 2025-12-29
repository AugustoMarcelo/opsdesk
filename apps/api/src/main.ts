import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from 'nestjs-pino';
import { requestIdMiddleware } from './common/middleware/request-id.middleware';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  app.use(requestIdMiddleware);
  app.useLogger(app.get(Logger));

  await app.listen(process.env.PORT ?? 3000);
}

void bootstrap();
