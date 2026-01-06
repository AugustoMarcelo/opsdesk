/* eslint-disable @typescript-eslint/no-unsafe-argument */
import 'dotenv/config';

import { Injectable } from '@nestjs/common';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';

@Injectable()
export class DatabaseService {
  public readonly db: NodePgDatabase<typeof schema>;

  constructor() {
    // Use test database URL if in test environment, otherwise use production
    const connectionString =
      process.env.NODE_ENV === 'test'
        ? process.env.DATABASE_URL
        : process.env.DATABASE_URL;

    if (!connectionString) {
      throw new Error(
        'DATABASE_URL environment variable is not set. Please configure it in your .env file.',
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
    const pool = new Pool({
      connectionString,
    });

    // Disable logger in test environment to reduce noise
    const logger = process.env.NODE_ENV === 'test' ? false : true;
    this.db = drizzle(pool, { schema, logger });
  }
}
