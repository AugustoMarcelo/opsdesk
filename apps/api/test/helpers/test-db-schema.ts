import { randomUUID } from 'crypto';
import {
  readFileSync,
  writeFileSync,
  unlinkSync,
  existsSync,
  readdirSync,
} from 'fs';
import { join } from 'path';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from '../../src/db/schema';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';

const SCHEMA_FILE = join(__dirname, '../.test-schema-name');

/**
 * Creates a random schema and runs migrations. Schema name is persisted to a file
 * for TestDatabaseModule and teardown. Call dropTestSchema() in globalTeardown.
 */
export async function bootstrapTestSchema(): Promise<string> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL must be set in .env.test for e2e tests');
  }

  const schemaName = `test_${randomUUID().replace(/-/g, '_')}`;

  const adminPool = new Pool({ connectionString });
  const client = await adminPool.connect();

  try {
    await client.query(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`);
    await client.query(`SET search_path TO "${schemaName}", public`);
    await runMigrationsInSchema(client, schemaName);
  } finally {
    client.release();
    await adminPool.end();
  }

  writeFileSync(SCHEMA_FILE, schemaName, 'utf-8');
  return schemaName;
}

/**
 * Creates a Drizzle db instance bound to the current test schema.
 * Must be called after bootstrapTestSchema() (e.g. from TestDatabaseModule).
 */
export function createTestDb(): NodePgDatabase<typeof schema> {
  const schemaName = getTestSchemaName();
  if (!schemaName) {
    throw new Error(
      'Test schema not bootstrapped. Ensure globalSetup runs before tests.',
    );
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL must be set in .env.test for e2e tests');
  }

  const options = `-c search_path="${schemaName}",public`;
  const url = new URL(connectionString);
  url.searchParams.set('options', options);
  const testConnectionString = url.toString();

  const pool = new Pool({ connectionString: testConnectionString });
  return drizzle(pool, { schema, logger: false });
}

async function runMigrationsInSchema(
  client: { query: (sql: string) => Promise<unknown> },
  schemaName: string,
): Promise<void> {
  const drizzleDir = join(__dirname, '../../drizzle');
  const files = readdirSync(drizzleDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const content = readFileSync(join(drizzleDir, file), 'utf-8');
    const statements = content
      .split(/--> statement-breakpoint/)
      .map((s) => s.trim())
      .filter(Boolean);

    for (const stmt of statements) {
      const adapted = stmt.replace(/"public"/g, `"${schemaName}"`);
      await client.query(adapted);
    }
  }
}

/**
 * Drops the test schema created by bootstrapTestSchema.
 * Reads schema name from the persisted file.
 */
export async function dropTestSchema(): Promise<void> {
  if (!existsSync(SCHEMA_FILE)) {
    return;
  }

  const schemaName = readFileSync(SCHEMA_FILE, 'utf-8').trim();
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    return;
  }

  const pool = new Pool({ connectionString });
  try {
    await pool.query(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`);
  } catch {
    // Ignore errors (e.g. schema already dropped)
  } finally {
    await pool.end();
    unlinkSync(SCHEMA_FILE);
  }
}

/**
 * Reads the current test schema name from the persisted file.
 * Returns null if not yet bootstrapped.
 */
export function getTestSchemaName(): string | null {
  if (!existsSync(SCHEMA_FILE)) {
    return null;
  }
  return readFileSync(SCHEMA_FILE, 'utf-8').trim();
}
