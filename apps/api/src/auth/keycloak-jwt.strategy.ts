import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Injectable } from '@nestjs/common';
import { passportJwtSecret } from 'jwks-rsa';
import { ROLE_PERMISSIONS } from './role-permissions.map';

export interface KeycloakJwtPayload {
  sub: string;
  email?: string;
  preferred_username?: string;
  aud?: string | string[]; // Audience claim (can be string or array)
  realm_access?: {
    roles: string[];
  };
  resource_access?: Record<string, { roles: string[] }>;
}

export interface AuthenticatedUser {
  id: string;
  email?: string;
  roles: string[];
  permissions: string[];
}

@Injectable()
export class KeycloakJwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor() {
    const issuer = process.env.OIDC_ISSUER;
    // const audience = process.env.OIDC_AUDIENCE;

    if (!issuer) {
      throw new Error(
        'OIDC_ISSUER environment variable is required for Keycloak JWT authentication',
      );
    }

    // passport-jwt supports string or string[] for audience
    // If audience is a comma-separated string, split it to support multiple audiences

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKeyProvider: passportJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri: `${issuer}/protocol/openid-connect/certs`,
      }),
      // audience: 'opsdesk-api',
      // issuer,
      algorithms: ['RS256'],
    });
  }

  validate(payload: KeycloakJwtPayload): AuthenticatedUser {
    const roles = payload.realm_access?.roles ?? [];
    const permissions = roles.flatMap((role) => ROLE_PERMISSIONS[role] ?? []);

    const user = {
      id: payload.sub,
      email: payload.email,
      roles,
      permissions,
    };

    return user;
  }
}
