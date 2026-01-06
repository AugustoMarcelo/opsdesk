import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../src/db/database.module';
import { DatabaseService } from '../../src/db/database.service';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '../../src/db/schema';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';

/**
 * Test Database Service that uses the test database URL
 */
@Module({
  providers: [
    {
      provide: DatabaseService,
      useFactory: () => {
        const connectionString = process.env.DATABASE_URL;
        if (!connectionString) {
          throw new Error(
            'DATABASE_URL must be set in .env.test for e2e tests',
          );
        }

        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
        const pool = new Pool({
          connectionString,
        });

        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        const db: NodePgDatabase<typeof schema> = drizzle(pool, {
          schema,
          logger: false, // Disable logging in tests
        });

        return {
          db,
        } as DatabaseService;
      },
    },
  ],
  exports: [DatabaseService],
})
export class TestDatabaseModule extends DatabaseModule {}
