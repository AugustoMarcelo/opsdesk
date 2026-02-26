export type AuthHandler = {
  getToken: () => string | null;
  refreshSession: () => Promise<string | null>;
  logoutAndRedirect: () => void;
};

let handler: AuthHandler | null = null;

export function registerAuthHandler(h: AuthHandler) {
  handler = h;
}

export function getAuthHandler(): AuthHandler | null {
  return handler;
}
