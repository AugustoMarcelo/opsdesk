import { DatabaseService } from './../db/database.service';
import { UsersRepository } from './../users/users.repository';
import { rolePermissions } from './../db/schema/role-permissions';
import { permissions } from './../db/schema/permissions';
import { eq, inArray } from 'drizzle-orm';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { userRoles, roles } from '../db/schema';
import { compare } from 'bcrypt';

const OIDC_ISSUER =
  process.env.OIDC_ISSUER || 'http://keycloak:8080/realms/opsdesk';
const CLIENT_ID = process.env.KEYCLOAK_CLIENT_ID || 'opsdesk-api';
const CLIENT_SECRET = process.env.KEYCLOAK_CLIENT_SECRET || '';
const AUTH_MODE = process.env.AUTH_MODE ?? 'local';

interface JwtAccessPayload {
  sub: string;
  email: string;
  roles: string[];
  permissions: string[];
}

interface JwtRefreshPayload extends JwtAccessPayload {
  type: 'refresh';
}

@Injectable()
export class AuthService {
  constructor(
    private readonly jwt: JwtService,
    private readonly databaseService: DatabaseService,
    private readonly usersRepo: UsersRepository,
  ) {}

  async login(email: string, password: string) {
    const user = await this.usersRepo.findByEmail(
      this.databaseService.db,
      email,
    );

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await compare(password, user.passwordHash);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const currentUserRoles = await this.databaseService.db
      .select({
        roleId: roles.id,
        roleName: roles.name,
      })
      .from(userRoles)
      .innerJoin(roles, eq(userRoles.roleId, roles.id))
      .where(eq(userRoles.userId, user.id));

    const currentUserPermissions = await this.databaseService.db
      .select({
        permissionName: permissions.name,
      })
      .from(rolePermissions)
      .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
      .where(
        inArray(
          rolePermissions.roleId,
          currentUserRoles.map((r) => r.roleId),
        ),
      );

    const payload: JwtAccessPayload = {
      sub: user.id,
      email: user.email,
      roles: currentUserRoles.map((r) => r.roleName),
      permissions: currentUserPermissions.map((p) => p.permissionName),
    };
    return {
      accessToken: this.jwt.sign(payload, { expiresIn: '1h' }),
      refreshToken: this.jwt.sign(
        { ...payload, type: 'refresh' } as JwtRefreshPayload,
        { expiresIn: '7d' },
      ),
    };
  }

  async keycloakCallback(code: string, redirectUri: string) {
    if (!CLIENT_SECRET) {
      throw new UnauthorizedException(
        'KEYCLOAK_CLIENT_SECRET is not configured. Set it in .env for Keycloak OAuth.',
      );
    }

    const tokenUrl = `${OIDC_ISSUER}/protocol/openid-connect/token`;
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      code,
      redirect_uri: redirectUri,
    });

    const res = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    if (!res.ok) {
      const errText = await res.text();
      let message = 'Keycloak token exchange failed';
      try {
        const parsed = JSON.parse(errText) as {
          error?: string;
          error_description?: string;
        };
        message =
          (parsed.error_description ?? parsed.error ?? errText) || message;
      } catch {
        message = errText || message;
      }
      throw new UnauthorizedException(message);
    }

    const data = (await res.json()) as {
      access_token: string;
      refresh_token?: string;
    };
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token ?? null,
    };
  }

  async refresh(refreshToken: string) {
    if (AUTH_MODE === 'keycloak') {
      return this.refreshKeycloak(refreshToken);
    }
    return this.refreshLocal(refreshToken);
  }

  private async refreshLocal(refreshToken: string) {
    try {
      const payload = this.jwt.verify<JwtRefreshPayload>(refreshToken);
      if (payload.type !== 'refresh') {
        throw new UnauthorizedException('Invalid refresh token');
      }
      const user = await this.usersRepo.findById(
        this.databaseService.db,
        payload.sub,
      );
      if (!user) {
        throw new UnauthorizedException('User not found');
      }
      const currentUserRoles = await this.databaseService.db
        .select({
          roleId: roles.id,
          roleName: roles.name,
        })
        .from(userRoles)
        .innerJoin(roles, eq(userRoles.roleId, roles.id))
        .where(eq(userRoles.userId, user.id));

      const currentUserPermissions = await this.databaseService.db
        .select({
          permissionName: permissions.name,
        })
        .from(rolePermissions)
        .innerJoin(
          permissions,
          eq(rolePermissions.permissionId, permissions.id),
        )
        .where(
          inArray(
            rolePermissions.roleId,
            currentUserRoles.map((r) => r.roleId),
          ),
        );

      const accessPayload: JwtAccessPayload = {
        sub: user.id,
        email: user.email,
        roles: currentUserRoles.map((r) => r.roleName),
        permissions: currentUserPermissions.map((p) => p.permissionName),
      };
      return {
        accessToken: this.jwt.sign(accessPayload, { expiresIn: '1h' }),
        refreshToken: this.jwt.sign(
          { ...accessPayload, type: 'refresh' } as JwtRefreshPayload,
          { expiresIn: '7d' },
        ),
      };
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  private async refreshKeycloak(refreshToken: string) {
    if (!CLIENT_SECRET) {
      throw new UnauthorizedException(
        'KEYCLOAK_CLIENT_SECRET is not configured.',
      );
    }
    const tokenUrl = `${OIDC_ISSUER}/protocol/openid-connect/token`;
    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      refresh_token: refreshToken,
    });

    const res = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    if (!res.ok) {
      const errText = await res.text();
      let message = 'Keycloak token refresh failed';
      try {
        const parsed = JSON.parse(errText) as {
          error?: string;
          error_description?: string;
        };
        message =
          (parsed.error_description ?? parsed.error ?? errText) || message;
      } catch {
        message = errText || message;
      }
      throw new UnauthorizedException(message);
    }

    const data = (await res.json()) as {
      access_token: string;
      refresh_token?: string;
    };
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token ?? refreshToken,
    };
  }
}
