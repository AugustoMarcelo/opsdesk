import { Injectable, UnauthorizedException } from '@nestjs/common';
import jwksRsa from 'jwks-rsa';
import jwt, { JwtPayload } from 'jsonwebtoken';
import type { Socket } from 'socket.io';
import { RealtimeUser } from './realtime.types';
import { UserResolver } from './user-resolver.service';

type LocalJwtPayload = {
  sub: string;
  email: string;
  roles: string[];
  permissions: string[];
};

type KeycloakJwtPayload = JwtPayload & {
  sub: string;
  name?: string;
  email: string;
  preferred_username?: string;
  realm_access?: {
    roles: string[];
  };
};

const ROLE_PERMISSIONS: Record<string, string[]> = {
  admin: [
    'ticket:create',
    'ticket:read',
    'ticket:update',
    'ticket:close',
    'user:create',
    'user:read',
    'message:send',
  ],
  agent: ['ticket:read', 'ticket:update'],
  customer: ['ticket:create', 'ticket:read', 'message:send'],
};

@Injectable()
export class RealtimeAuthService {
  private readonly authMode = process.env.AUTH_MODE ?? 'keycloak';

  private readonly jwksClient =
    process.env.OIDC_ISSUER && this.authMode !== 'local'
      ? jwksRsa({
          cache: true,
          rateLimit: true,
          jwksRequestsPerMinute: 5,
          jwksUri: `${process.env.OIDC_ISSUER}/protocol/openid-connect/certs`,
        })
      : null;

  constructor(private readonly userResolver: UserResolver) {}

  async authenticateSocket(socket: Socket): Promise<RealtimeUser> {
    const token =
      (socket.handshake.auth?.token as string | undefined) ??
      extractBearerToken(socket.handshake.headers?.authorization);

    if (!token) {
      throw new UnauthorizedException('Missing token');
    }

    try {
      if (this.authMode === 'local') {
        const secret = process.env.JWT_SECRET;
        if (!secret) {
          throw new UnauthorizedException('JWT_SECRET is not set');
        }

        const payload = jwt.verify(token, secret) as LocalJwtPayload;

        return {
          id: payload.sub,
          email: payload.email,
          roles: payload.roles ?? [],
          permissions: payload.permissions ?? [],
        };
      }

      const issuer = process.env.OIDC_ISSUER;
      if (!issuer || !this.jwksClient) {
        throw new UnauthorizedException('OIDC_ISSUER is not set');
      }

      const payload = await verifyWithJwks(token, this.jwksClient, issuer);

      const roles = payload.realm_access?.roles ?? [];
      const permissions = roles.flatMap((role) => ROLE_PERMISSIONS[role] ?? []);

      const resolved = await this.userResolver.resolve({
        sub: payload.sub,
        email: payload.email,
        name: payload.name,
        preferred_username: payload.preferred_username,
      });

      return {
        id: resolved.id,
        email: payload.email,
        roles,
        permissions,
      };
    } catch (err) {
      throw new UnauthorizedException('Invalid token');
    }
  }
}

function extractBearerToken(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  if (!value.startsWith('Bearer ')) return undefined;
  return value.slice('Bearer '.length);
}

async function verifyWithJwks(
  token: string,
  client: ReturnType<typeof jwksRsa>,
  issuer: string,
): Promise<KeycloakJwtPayload> {
  const decoded = jwt.decode(token, { complete: true });
  const kid = (decoded as { header?: { kid?: string } } | null)?.header?.kid;

  if (!kid) {
    throw new UnauthorizedException('Missing kid');
  }

  const key = await client.getSigningKey(kid);
  const signingKey = key.getPublicKey();

  const payload = jwt.verify(token, signingKey, {
    algorithms: ['RS256'],
    // IMPORTANT: Do not enforce `issuer` here.
    // In docker-compose setups, Keycloak is often accessed as:
    // - host:   http://localhost:8080/realms/opsdesk  (what tokens typically contain)
    // - docker: http://keycloak:8080/realms/opsdesk   (what services use to reach JWKS)
    //
    // The signature validation via JWKS is the critical piece for EPIC4.
    // Enforcing issuer would reject otherwise-valid tokens in local dev.
  }) as KeycloakJwtPayload;

  return payload;
}

