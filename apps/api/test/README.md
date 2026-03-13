# E2E Tests Configuration

## Setup

1. **Create `.env.test` file** in the `apps/api` directory with:
   ```env
   NODE_ENV=test
   # Same Postgres instance as app; tests use a random per-run schema
   DATABASE_URL=postgresql://opsdesk:opsdesk@localhost:5432/opsdesk
   AUTH_MODE=local
   JWT_SECRET=secret
   JWT_EXPIRES_IN=1h
   ```

2. **Ensure Postgres is running** (e.g. `docker compose up -d postgres`).

3. **No separate migrations needed** — the test runner creates a random schema per run, applies migrations, and drops it after tests.

## Running Tests

```bash
# From repo root
make api-tests
# Or: pnpm --filter api test:e2e

# From apps/api directory
pnpm test:e2e
pnpm test:e2e tickets.e2e-spec.ts  # specific test file
```

## Test Environment Isolation

- Tests run with `NODE_ENV=test` to ensure they never touch production
- Each test cleans up after itself using `cleanupDatabase()` in `afterEach`
- Tests use a **random schema** on the main Postgres instance (same DB as app)
- Schema is created in `globalSetup`, dropped in `globalTeardown`
- Database module is overridden to use the test schema connection

## Test Structure

- `helpers/cleanup.ts` - Database cleanup utilities
- `helpers/auth.ts` - Authentication helpers for tests
- `helpers/test-module.ts` - Test database module override (schema-aware)
- `helpers/test-db-schema.ts` - Per-run schema bootstrap and teardown
- `helpers/test-module-overrides.ts` - Common test module overrides (database + RabbitMQ mock)
- `helpers/rabbitmq-mock.service.ts` - Mock RabbitMQ service for tests
- `jest-e2e.setup.ts` - Loads .env.test, sets NODE_ENV
- `jest-e2e-global-setup.ts` - Creates random schema and runs migrations
- `jest-e2e-global-teardown.ts` - Drops test schema

## Writing Tests

Example test structure:

```typescript
describe('Feature (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    // Setup test module with test database override
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideModule(DatabaseModule)
      .useModule(TestDatabaseModule)
      .compile();

    app = moduleRef.createNestApplication();
    // ... configure app
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  // Tests automatically clean up after each test via jest-e2e.setup.ts
});
```

## Important Notes

- **Never run tests against production database** - Always use `.env.test`
- Tests are isolated - each test cleans up its data
- No dedicated `postgres_test` container — tests share the main Postgres instance in a separate schema
- Use `databaseService.db` from the test module for database operations
- Use `login()` helper for authentication in tests

## Smoke checks

```bash
# From repo root: ensure Postgres is up
docker compose ps postgres

# From repo root: run e2e tests (use make or pnpm --filter)
make api-tests
# Or: pnpm --filter api test:e2e

# From apps/api directory: run e2e tests directly
cd apps/api && pnpm test:e2e

# Verify no test schema remains (schemas are dropped after run)
psql -h localhost -U opsdesk -d opsdesk -c "SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE 'test_%';"
# Expected: 0 rows (or empty)
```
