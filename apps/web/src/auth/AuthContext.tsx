import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { jwtDecode } from 'jwt-decode';
import { login as apiLogin } from '../api/auth';

const AUTH_STORAGE_KEY = 'opsdesk_token';

interface JwtPayload {
  sub: string;
  email?: string;
  preferred_username?: string;
  roles?: string[];
  permissions?: string[];
  realm_access?: { roles: string[] };
  exp?: number;
}

export interface AuthUser {
  id: string;
  email: string;
  roles: string[];
  permissions: string[];
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  setToken: (token: string) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

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
  agent: ['ticket:read', 'ticket:update', 'message:send'],
  customer: ['ticket:create', 'ticket:read', 'message:send'],
};

function decodeToken(token: string): AuthUser | null {
  try {
    const payload = jwtDecode<JwtPayload>(token);
    if (!payload.sub) return null;
    const exp = payload.exp ? payload.exp * 1000 : 0;
    if (exp && Date.now() >= exp) return null;

    const roles =
      payload.roles ??
      payload.realm_access?.roles ??
      [];
    const permissions = payload.permissions ?? roles.flatMap((r) => ROLE_PERMISSIONS[r] ?? []);
    const email = payload.email ?? payload.preferred_username ?? '';

    return {
      id: payload.sub,
      email,
      roles,
      permissions,
    };
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setTokenState] = useState<string | null>(() =>
    localStorage.getItem(AUTH_STORAGE_KEY)
  );
  const [user, setUser] = useState<AuthUser | null>(() => {
    const t = localStorage.getItem(AUTH_STORAGE_KEY);
    return t ? decodeToken(t) : null;
  });
  const [isLoading, setIsLoading] = useState(false);

  const setToken = useCallback((t: string) => {
    localStorage.setItem(AUTH_STORAGE_KEY, t);
    setTokenState(t);
    const u = decodeToken(t);
    setUser(u);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    setTokenState(null);
    setUser(null);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await apiLogin(email, password);
      setToken(res.accessToken);
    } finally {
      setIsLoading(false);
    }
  }, [setToken]);

  useEffect(() => {
    if (!token) return;
    const u = decodeToken(token);
    if (!u) logout();
  }, [token, logout]);

  return (
    <AuthContext.Provider
      value={{ user, token, isLoading, login, logout, setToken }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
