const API_BASE = import.meta.env.VITE_API_URL || '/api';

export async function apiFetch<T>(
  path: string,
  options: RequestInit & { token?: string; _skip401Retry?: boolean } = {},
): Promise<T> {
  const { token, _skip401Retry, ...init } = options;
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string>),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });

  if (res.status === 401 && token && !_skip401Retry) {
    const { getAuthHandler } = await import('./auth-handler');
    const handler = getAuthHandler();
    if (handler) {
      const newToken = await handler.refreshSession();
      if (newToken) {
        const retryHeaders: HeadersInit = {
          ...headers,
          Authorization: `Bearer ${newToken}`,
        };
        const retryRes = await fetch(`${API_BASE}${path}`, {
          ...init,
          headers: retryHeaders,
        });
        if (!retryRes.ok) {
          const raw: unknown = await retryRes.json().catch(() => ({}));
          const body = raw as { message?: string; detail?: string };
          const msg = body.detail ?? body.message ?? retryRes.statusText;
          throw new ApiError(
            retryRes.status,
            typeof msg === 'string' ? msg : retryRes.statusText,
          );
        }
        if (retryRes.status === 204) return undefined as T;
        return retryRes.json() as Promise<T>;
      }
      handler.logoutAndRedirect();
    }
  }

  if (!res.ok) {
    const raw: unknown = await res.json().catch(() => ({}));
    const body = raw as { message?: string; detail?: string };
    const msg = body.detail ?? body.message ?? res.statusText;
    throw new ApiError(
      res.status,
      typeof msg === 'string' ? msg : res.statusText,
    );
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
