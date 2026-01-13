export interface KeycloakUser {
  sub: string;
  email: string;
  preferred_username?: string;
  name?: string;
  roles: string[];
}
