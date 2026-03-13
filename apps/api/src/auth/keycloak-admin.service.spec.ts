import { BadRequestException } from '@nestjs/common';
import { KeycloakAdminService } from './keycloak-admin.service';

describe('KeycloakAdminService', () => {
  let service: KeycloakAdminService;
  let fetchMock: jest.SpyInstance;

  beforeAll(() => {
    process.env.OIDC_ISSUER = 'http://keycloak:8080/realms/opsdesk';
    process.env.KEYCLOAK_ADMIN_USERNAME = 'admin';
    process.env.KEYCLOAK_ADMIN_PASSWORD = 'admin';
  });

  beforeEach(() => {
    service = new KeycloakAdminService();
    fetchMock = jest.spyOn(globalThis, 'fetch');
  });

  afterEach(() => {
    fetchMock.mockRestore();
  });

  it('should create user and return Keycloak user ID', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: () => ({ access_token: 'admin-token' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        headers: new Map([
          [
            'Location',
            'http://keycloak:8080/admin/realms/opsdesk/users/a1b2c3d4-e5f6-7890-abcd-ef1234567890',
          ],
        ]),
      })
      .mockResolvedValueOnce({ ok: true });

    const result = await service.createUser({
      email: 'user@example.com',
      username: 'user@example.com',
      name: 'Test User',
      password: 'secret123',
    });

    expect(result).toBe('a1b2c3d4-e5f6-7890-abcd-ef1234567890');
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('should throw when admin token request fails', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      text: () =>
        JSON.stringify({
          error: 'invalid_grant',
          error_description: 'Invalid user credentials',
        }),
    });

    await expect(
      service.createUser({
        email: 'user@example.com',
        username: 'user@example.com',
        name: 'Test',
        password: 'secret',
      }),
    ).rejects.toThrow(BadRequestException);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('should sanitize prohibited characters from person names', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: () => ({ access_token: 'admin-token' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        headers: new Map([
          [
            'Location',
            'http://keycloak:8080/admin/realms/opsdesk/users/a1b2c3d4-e5f6-7890-abcd-ef1234567890',
          ],
        ]),
      })
      .mockResolvedValueOnce({ ok: true });

    await service.createUser({
      email: 'user@example.com',
      username: 'user@example.com',
      name: 'Test <User> & "Name"',
      password: 'secret123',
    });

    const createCall = fetchMock.mock.calls[1];
    const body = JSON.parse(createCall[1].body);
    expect(body.firstName).toBe('Test');
    expect(body.lastName).toBe('User Name');
  });

  it('should throw when user creation returns 409 (conflict)', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: () => ({ access_token: 'admin-token' }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 409,
        text: () =>
          JSON.stringify({ errorMessage: 'User exists with same username' }),
      });

    await expect(
      service.createUser({
        email: 'existing@example.com',
        username: 'existing@example.com',
        name: 'Existing',
        password: 'secret',
      }),
    ).rejects.toThrow(BadRequestException);

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
