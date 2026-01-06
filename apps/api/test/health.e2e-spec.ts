import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from './../src/app.module';
import { Test } from '@nestjs/testing';
import { App } from 'supertest/types';
import request from 'supertest';
import { getTestModuleOverrides } from './helpers/test-module-overrides';

interface HealthResponse {
  status: string;
  service: string;
  uptime: number;
  timestamp: string;
}

describe('Health (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    // Ensure we're in test environment
    process.env.NODE_ENV = 'test';

    let testModule = Test.createTestingModule({
      imports: [AppModule],
    });

    // Apply common test overrides (test database + mocked RabbitMQ)
    // This prevents RabbitMQ connection attempts and ensures test isolation
    for (const { module, override } of getTestModuleOverrides()) {
      testModule = testModule.overrideModule(module).useModule(override);
    }

    const moduleRef = await testModule.compile();

    app = moduleRef.createNestApplication();

    // Set up global guards (same as main.ts)
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('should return 200 with health status when application is running', async () => {
    const res = await request(app.getHttpServer()).get('/health').expect(200);
    const body = res.body as HealthResponse;

    // Check all required fields exist
    expect(body).toHaveProperty('status');
    expect(body).toHaveProperty('service');
    expect(body).toHaveProperty('uptime');
    expect(body).toHaveProperty('timestamp');

    // Check status value
    expect(body.status).toBe('ok');

    // Check service value
    expect(body.service).toBe('api');

    // Check uptime is a positive number
    expect(typeof body.uptime).toBe('number');
    expect(body.uptime).toBeGreaterThanOrEqual(0);
  });

  it('should return a valid ISO timestamp', async () => {
    const beforeRequest = new Date();
    const res = await request(app.getHttpServer()).get('/health').expect(200);
    const afterRequest = new Date();
    const body = res.body as HealthResponse;

    // Check timestamp is a string
    expect(typeof body.timestamp).toBe('string');

    // Check timestamp is valid ISO 8601 format
    const timestampDate = new Date(body.timestamp);
    expect(timestampDate.toISOString()).toBe(body.timestamp); // Validates ISO format

    // Check timestamp is not invalid date
    expect(timestampDate.getTime()).not.toBeNaN();

    // Check timestamp is recent (within 5 seconds of request time)
    const timestampTime = timestampDate.getTime();
    const beforeTime = beforeRequest.getTime();
    const afterTime = afterRequest.getTime();

    expect(timestampTime).toBeGreaterThanOrEqual(beforeTime - 1000); // Allow 1s before
    expect(timestampTime).toBeLessThanOrEqual(afterTime + 1000); // Allow 1s after
  });

  it('should be accessible without authentication', async () => {
    // Health endpoint should be public (no auth required)
    await request(app.getHttpServer()).get('/health').expect(200);
  });

  it('should return consistent structure on multiple calls', async () => {
    const res1 = await request(app.getHttpServer()).get('/health').expect(200);
    const res2 = await request(app.getHttpServer()).get('/health').expect(200);

    const body1 = res1.body as HealthResponse;
    const body2 = res2.body as HealthResponse;

    // Structure should be the same
    expect(Object.keys(body1)).toEqual(Object.keys(body2));

    // Status and service should be consistent
    expect(body1.status).toBe(body2.status);
    expect(body1.service).toBe(body2.service);

    // Uptime should increase (or at least not decrease)
    expect(body2.uptime).toBeGreaterThanOrEqual(body1.uptime);

    // Timestamps should be different and increasing
    const timestamp1 = new Date(body1.timestamp).getTime();
    const timestamp2 = new Date(body2.timestamp).getTime();
    expect(timestamp2).toBeGreaterThanOrEqual(timestamp1);
  });
});
