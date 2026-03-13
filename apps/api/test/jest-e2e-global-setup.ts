import { config } from 'dotenv';
import { resolve } from 'path';
import { bootstrapTestSchema } from './helpers/test-db-schema';

export default async function globalSetup(): Promise<void> {
  process.env.NODE_ENV = 'test';
  config({ path: resolve(__dirname, '../.env.test') });

  if (!process.env.DATABASE_URL) {
    throw new Error(
      'DATABASE_URL must be set in .env.test file for e2e tests to run',
    );
  }

  await bootstrapTestSchema();
}
