import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { jwtDecode } from 'jwt-decode';
import {
  login as apiLogin,
  refreshToken as apiRefreshToken,
  getMe,
} from '../api/auth';
import { registerAuthHandler } from '../api/auth-handler';

const AUTH_STORAGE_KEY = 'opsdesk_token';
const AUTH_REFRESH_KEY = 'opsdesk_refresh_token';

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
  setTokens: (accessToken: string, refreshToken: string | null) => void;
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

    const roles = payload.roles ?? payload.realm_access?.roles ?? [];
    const permissions =
      payload.permissions ?? roles.flatMap((r) => ROLE_PERMISSIONS[r] ?? []);
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
    localStorage.getItem(AUTH_STORAGE_KEY),
  );
  const [, setRefreshTokenState] = useState<string | null>(() =>
    localStorage.getItem(AUTH_REFRESH_KEY),
  );
  const [user, setUser] = useState<AuthUser | null>(() => {
    const t = localStorage.getItem(AUTH_STORAGE_KEY);
    return t ? decodeToken(t) : null;
  });
  const [isLoading, setIsLoading] = useState(false);
  const refreshPromiseRef = useRef<Promise<string | null> | null>(null);

  const setToken = useCallback((t: string) => {
    localStorage.setItem(AUTH_STORAGE_KEY, t);
    setTokenState(t);
    const u = decodeToken(t);
    setUser(u);
  }, []);

  const setTokens = useCallback((accessToken: string, rt: string | null) => {
    localStorage.setItem(AUTH_STORAGE_KEY, accessToken);
    setTokenState(accessToken);
    if (rt) {
      localStorage.setItem(AUTH_REFRESH_KEY, rt);
      setRefreshTokenState(rt);
    } else {
      localStorage.removeItem(AUTH_REFRESH_KEY);
      setRefreshTokenState(null);
    }
    const u = decodeToken(accessToken);
    setUser(u);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    localStorage.removeItem(AUTH_REFRESH_KEY);
    setTokenState(null);
    setRefreshTokenState(null);
    setUser(null);
  }, []);

  const logoutAndRedirect = useCallback(() => {
    logout();
    window.location.href = '/login';
  }, [logout]);

  const refreshSession = useCallback(async (): Promise<string | null> => {
    const rt = localStorage.getItem(AUTH_REFRESH_KEY);
    if (!rt) return null;
    if (refreshPromiseRef.current) {
      return refreshPromiseRef.current;
    }
    const promise = (async () => {
      try {
        const res = await apiRefreshToken(rt);
        setTokens(res.accessToken, res.refreshToken ?? null);
        return res.accessToken;
      } catch {
        refreshPromiseRef.current = null;
        return null;
      } finally {
        refreshPromiseRef.current = null;
      }
    })();
    refreshPromiseRef.current = promise;
    return promise;
  }, [setTokens]);

  const login = useCallback(
    async (email: string, password: string) => {
      setIsLoading(true);
      try {
        const res = await apiLogin(email, password);
        setTokens(res.accessToken, res.refreshToken ?? null);
      } finally {
        setIsLoading(false);
      }
    },
    [setTokens],
  );

  useEffect(() => {
    if (!token) return;
    const u = decodeToken(token);
    if (!u) logout();
  }, [token, logout]);

  // Fetch resolved user id from API (fixes Keycloak: JWT sub ≠ DB user id)
  useEffect(() => {
    if (!token) return;
    void getMe(token)
      .then((me) => {
        setUser((prev) => (prev ? { ...prev, id: me.id } : null));
      })
      .catch(() => {
        // Keep token-decoded user on error
      });
  }, [token]);

  useEffect(() => {
    registerAuthHandler({
      getToken: () => token,
      refreshSession,
      logoutAndRedirect,
    });
  }, [token, refreshSession, logoutAndRedirect]);

  return (
    <AuthContext.Provider
      value={{ user, token, isLoading, login, logout, setToken, setTokens }}
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
