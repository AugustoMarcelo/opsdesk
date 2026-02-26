const OIDC_ISSUER = import.meta.env.VITE_OIDC_ISSUER || 'http://localhost:8080/realms/opsdesk';
const CLIENT_ID = 'opsdesk-api';

/** Set VITE_KEYCLOAK_OFFLINE_ACCESS=true to request refresh tokens. Requires Keycloak client + user config. */
const OFFLINE_ACCESS =
  import.meta.env.VITE_KEYCLOAK_OFFLINE_ACCESS === 'true';

export function buildAuthUrl(redirectUri: string): string {
  const scope = OFFLINE_ACCESS ? 'openid offline_access' : 'openid';
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope,
  });
  return `${OIDC_ISSUER}/protocol/openid-connect/auth?${params}`;
}
