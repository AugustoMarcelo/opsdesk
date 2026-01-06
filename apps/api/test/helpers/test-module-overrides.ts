import { DynamicModule } from '@nestjs/common';
import { DatabaseModule } from '../../src/db/database.module';
import { RabbitMQModule } from '../../src/messaging/rabbitmq.module';
import { TestDatabaseModule } from './test-module';
import { RabbitMQMockService } from './rabbitmq-mock.service';
import { RabbitMQService } from '../../src/messaging/rabbitmq.service';

/**
 * Common module overrides for e2e tests
 * - Uses test database instead of production
 * - Mocks RabbitMQ to avoid requiring a real connection
 */
export function getTestModuleOverrides(): Array<{
  module: typeof DatabaseModule | typeof RabbitMQModule;
  override: DynamicModule;
}> {
  return [
    {
      module: DatabaseModule,
      override: TestDatabaseModule,
    },
    {
      module: RabbitMQModule,
      override: {
        module: RabbitMQModule,
        providers: [
          {
            provide: RabbitMQService,
            useClass: RabbitMQMockService,
          },
        ],
        exports: [RabbitMQService],
      },
    },
  ];
}
