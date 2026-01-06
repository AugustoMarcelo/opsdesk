import { App } from 'supertest/types';
import request from 'supertest';
import { INestApplication } from '@nestjs/common';

interface AuthResponse {
  accessToken: string;
}

export async function login(
  app: INestApplication<App>,
  email: string,
  password: string,
): Promise<string> {
  const res = await request(app.getHttpServer())
    .post('/auth/login')
    .send({ email, password })
    .expect(201);

  const body = res.body as AuthResponse;

  return body.accessToken;
}
