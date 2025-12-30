import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { App } from 'supertest/types';

interface TicketResponse {
  id: string;
  title: string;
  description: string;
  status: string;
  ownerId: string;
  createdAt: string;
}

interface TicketListResponse {
  data: TicketResponse[];
  meta: {
    offset: number;
    limit: number;
    count: number;
  };
}

describe('Tickets (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();

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
    await app.close();
  });

  it('POST /v1/tickets → create ticket', async () => {
    const res = await request(app.getHttpServer())
      .post('/v1/tickets')
      .send({
        title: 'Ticket e2e',
        description: 'create ticket e2e test',
      })
      .expect(201);

    const body = res.body as TicketResponse;

    expect(body).toHaveProperty('id');
    expect(body.title).toBe('Ticket e2e');
  });

  it('POST /v1/tickets → validation fails', async () => {
    await request(app.getHttpServer()).post('/v1/tickets').send({}).expect(400);
  });

  it('GET /v1/tickets → list tickets', async () => {
    const res = await request(app.getHttpServer())
      .get('/v1/tickets')
      .expect(200);

    const body = res.body as TicketListResponse;

    expect(Array.isArray(body.data)).toBe(true);
  });

  it('GET /v1/tickets/:id → 404 when not exists', async () => {
    await request(app.getHttpServer())
      .get('/v1/tickets/00000000-0000-0000-0000-000000000000')
      .expect(404);
  });
});
