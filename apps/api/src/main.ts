import { RedisIoAdapter } from './realtime/redis-io.adapter';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from 'nestjs-pino';
import { requestIdMiddleware } from './common/middleware/request-id.middleware';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('OpsDesk API')
    .setDescription('API REST v1')
    .setVersion('1.0')
    .addTag('Tickets')
    .addTag('Users')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('/docs', app, document);

  app.use(requestIdMiddleware);
  app.useLogger(app.get(Logger));

  app.useWebSocketAdapter(new RedisIoAdapter(app));

  await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
}

void bootstrap();
