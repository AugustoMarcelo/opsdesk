import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../src/db/database.module';
import { DatabaseService } from '../../src/db/database.service';
import { createTestDb } from './test-db-schema';

/**
 * Test Database Service that uses a per-run random schema on the main Postgres instance.
 * Requires bootstrapTestSchema() to have run in globalSetup.
 */
@Module({
  providers: [
    {
      provide: DatabaseService,
      useFactory: () => {
        const db = createTestDb();
        return { db } as DatabaseService;
      },
    },
  ],
  exports: [DatabaseService],
})
export class TestDatabaseModule extends DatabaseModule {}
