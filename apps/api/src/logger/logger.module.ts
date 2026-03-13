import { randomUUID } from 'crypto';
import { Module } from '@nestjs/common';
import { LoggerModule as PinoLoggerModule } from 'nestjs-pino';

@Module({
  imports: [
    PinoLoggerModule.forRoot({
      pinoHttp: {
        level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
        transport:
          process.env.NODE_ENV !== 'production'
            ? { target: 'pino-pretty' }
            : undefined,
        genReqId: (req) => {
          const id = req.headers['x-request-id'];
          const value = Array.isArray(id) ? id[0] : id;
          return (
            (typeof value === 'string' ? value : undefined) ?? randomUUID()
          );
        },
      },
    }),
  ],
})
export class LoggerModule {}
