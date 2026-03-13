import { config } from 'dotenv';
import { resolve } from 'path';
import { dropTestSchema } from './helpers/test-db-schema';

export default async function globalTeardown(): Promise<void> {
  process.env.NODE_ENV = 'test';
  config({ path: resolve(__dirname, '../.env.test') });

  await dropTestSchema();
}
