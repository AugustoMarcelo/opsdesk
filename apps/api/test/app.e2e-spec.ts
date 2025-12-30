import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

interface TicketResponse {
  id: string;
  title: string;
  description: string;
  status: string;
  ownerId: string;
  createdAt: string;
}

describe('API e2e', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  it('GET /health should return API health status', async () => {
    return request(app.getHttpServer()).get('/health').expect(200);
  });

  it('POST /v1/tickets should create a new ticket', async () => {
    const res = await request(app.getHttpServer())
      .post('/v1/tickets')
      .send({
        title: 'Teste',
        description: 'Teste de ticket',
      })
      .expect(201);

    const body = res.body as TicketResponse;

    expect(body.id).toBeDefined();
  });

  it('GET /v1/tickets should return a list of tickets', () => {
    return request(app.getHttpServer()).get('/v1/tickets').expect(200);
  });

  afterAll(async () => {
    await app.close();
  });
});
