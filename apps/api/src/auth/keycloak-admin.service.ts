import { Injectable, BadRequestException } from '@nestjs/common';

const OIDC_ISSUER =
  process.env.OIDC_ISSUER || 'http://keycloak:8080/realms/opsdesk';
const KEYCLOAK_ADMIN_USERNAME = process.env.KEYCLOAK_ADMIN_USERNAME || 'admin';
const KEYCLOAK_ADMIN_PASSWORD = process.env.KEYCLOAK_ADMIN_PASSWORD || 'admin';

export interface CreateKeycloakUserParams {
  email: string;
  username: string;
  name: string;
  password: string;
}

@Injectable()
export class KeycloakAdminService {
  private getKeycloakBaseUrl(): string {
    const match = OIDC_ISSUER.match(/^(.+)\/realms\/[^/]+$/);
    if (!match) {
      throw new BadRequestException(
        'Invalid OIDC_ISSUER format. Expected https://host/realms/realm',
      );
    }
    return match[1];
  }

  private getRealmName(): string {
    const match = OIDC_ISSUER.match(/\/realms\/([^/]+)$/);
    if (!match) {
      throw new BadRequestException(
        'Invalid OIDC_ISSUER format. Expected https://host/realms/realm',
      );
    }
    return match[1];
  }

  private async getAdminToken(): Promise<string> {
    const baseUrl = this.getKeycloakBaseUrl();
    const tokenUrl = `${baseUrl}/realms/master/protocol/openid-connect/token`;

    const body = new URLSearchParams({
      grant_type: 'password',
      client_id: 'admin-cli',
      username: KEYCLOAK_ADMIN_USERNAME,
      password: KEYCLOAK_ADMIN_PASSWORD,
    });

    const res = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    if (!res.ok) {
      const errText = await res.text();
      let message = 'Failed to obtain Keycloak admin token';
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
      throw new BadRequestException(message);
    }

    const data = (await res.json()) as { access_token: string };
    return data.access_token;
  }

  /**
   * Sanitize person name for Keycloak's PersonNameProhibitedCharactersValidator.
   * Removes characters that Keycloak rejects (e.g. < > " ' & @ and similar).
   */
  private sanitizePersonName(name: string): string {
    return name
      .replace(/[<>"'&@#$%^*()[\]{}|\\/;:=+`~]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private parseKeycloakError(res: Response, errText: string): string {
    try {
      const parsed = JSON.parse(errText) as {
        error?: string;
        errorMessage?: string;
        error_description?: string;
      };
      return (
        parsed.errorMessage ??
        parsed.error_description ??
        parsed.error ??
        errText
      );
    } catch {
      return errText;
    }
  }

  async createUser(params: CreateKeycloakUserParams): Promise<string> {
    const baseUrl = this.getKeycloakBaseUrl();
    const realm = this.getRealmName();
    const usersUrl = `${baseUrl}/admin/realms/${realm}/users`;

    const token = await this.getAdminToken();

    const sanitizedName =
      this.sanitizePersonName(params.name) || params.username;
    const [firstName, ...lastParts] = sanitizedName
      .split(/\s+/)
      .filter(Boolean);
    const lastName = lastParts.join(' ') || firstName || params.username;

    const userPayload = {
      username: params.username,
      email: params.email,
      firstName: firstName || params.username,
      lastName: lastName || '',
      enabled: true,
      emailVerified: false,
    };

    const createRes = await fetch(usersUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userPayload),
    });

    if (!createRes.ok) {
      const errText = await createRes.text();
      const message = this.parseKeycloakError(createRes, errText);
      if (createRes.status === 409) {
        throw new BadRequestException(
          `User with email or username already exists: ${message}`,
        );
      }
      throw new BadRequestException(
        `Keycloak user creation failed: ${message}`,
      );
    }

    const location = createRes.headers.get('Location');
    if (!location) {
      throw new BadRequestException(
        'Keycloak did not return user ID in Location header',
      );
    }

    const userIdMatch = location.match(/\/users\/([a-f0-9-]+)$/i);
    if (!userIdMatch) {
      throw new BadRequestException(
        `Could not parse Keycloak user ID from Location: ${location}`,
      );
    }

    const keycloakUserId = userIdMatch[1];

    const resetPasswordUrl = `${baseUrl}/admin/realms/${realm}/users/${keycloakUserId}/reset-password`;
    const passwordPayload = {
      type: 'password',
      value: params.password,
      temporary: false,
    };

    const passwordRes = await fetch(resetPasswordUrl, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(passwordPayload),
    });

    if (!passwordRes.ok) {
      const errText = await passwordRes.text();
      const message = this.parseKeycloakError(passwordRes, errText);
      throw new BadRequestException(
        `Keycloak password setup failed: ${message}`,
      );
    }

    return keycloakUserId;
  }
}
