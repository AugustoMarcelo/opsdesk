# E2E Tests Configuration

## Setup

1. **Create `.env.test` file** in the `apps/api` directory with:
   ```env
   NODE_ENV=test
   DATABASE_URL=postgresql://user:password@localhost:5432/opsdesk_test
   JWT_SECRET=test-secret-key
   ```

2. **Ensure test database exists**:
   ```bash
   createdb opsdesk_test
   ```

3. **Run migrations on test database**:
   ```bash
   pnpm db:migrate:test
   ```

## Running Tests

```bash
# Run all e2e tests
pnpm test:e2e

# Run specific test file
pnpm test:e2e tickets.e2e-spec.ts
```

## Test Environment Isolation

- Tests run with `NODE_ENV=test` to ensure they never touch production
- Each test cleans up after itself using `cleanupDatabase()` in `afterEach`
- Test database is separate from production (`DATABASE_URL` from `.env.test`)
- Database module is overridden to use test database connection

## Test Structure

- `helpers/cleanup.ts` - Database cleanup utilities
- `helpers/auth.ts` - Authentication helpers for tests
- `helpers/test-module.ts` - Test database module override
- `helpers/test-module-overrides.ts` - Common test module overrides (database + RabbitMQ mock)
- `helpers/rabbitmq-mock.service.ts` - Mock RabbitMQ service for tests
- `jest-e2e.setup.ts` - Global test setup (loads .env.test, sets NODE_ENV)

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
- Test database should be separate from development/production
- Use `databaseService.db` from the test module for database operations
- Use `login()` helper for authentication in tests

