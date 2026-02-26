import { apiFetch } from './client';

export interface LoginResponse {
  accessToken: string;
  refreshToken?: string | null;
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  return apiFetch<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function keycloakCallback(
  code: string,
  redirectUri: string
): Promise<LoginResponse> {
  return apiFetch<LoginResponse>('/auth/keycloak-callback', {
    method: 'POST',
    body: JSON.stringify({ code, redirect_uri: redirectUri }),
  });
}

export async function refreshToken(refreshToken: string): Promise<LoginResponse> {
  return apiFetch<LoginResponse>('/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({ refreshToken }),
  });
}

export interface MeResponse {
  id: string;
  email: string;
  roles: string[];
}

export async function getMe(token: string): Promise<MeResponse> {
  return apiFetch<MeResponse>('/auth/me', { token });
}
