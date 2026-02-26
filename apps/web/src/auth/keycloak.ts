const OIDC_ISSUER = import.meta.env.VITE_OIDC_ISSUER || 'http://localhost:8080/realms/opsdesk';
const CLIENT_ID = 'opsdesk-api';

export function buildAuthUrl(redirectUri: string): string {
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid',
  });
  return `${OIDC_ISSUER}/protocol/openid-connect/auth?${params}`;
}
