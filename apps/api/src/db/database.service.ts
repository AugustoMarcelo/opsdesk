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
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL!,
    });

    this.db = drizzle(pool, { schema, logger: true });
  }
}
