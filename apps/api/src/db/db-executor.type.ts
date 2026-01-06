import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type * as schema from './schema';

type Database = NodePgDatabase<typeof schema>;

type Transaction = Parameters<Database['transaction']>[0] extends (
  tx: infer T,
  ...args: unknown[]
) => unknown
  ? T
  : never;

export type DBExecutor = Database | Transaction;
