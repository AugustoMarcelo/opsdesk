// Load environment variables FIRST, before any other imports

import { config } from 'dotenv';
import { resolve } from 'path';

// Ensure we're in test environment
process.env.NODE_ENV = 'test';

// Load .env.test file (relative to test directory)
config({ path: resolve(__dirname, '../.env.test') });

// Ensure DATABASE_URL is set for tests
if (!process.env.DATABASE_URL) {
  throw new Error(
    'DATABASE_URL must be set in .env.test file for e2e tests to run',
  );
}

// Import cleanup AFTER environment is loaded (using require to avoid hoisting)
// Note: cleanup is now handled per-test-suite to have access to databaseService
