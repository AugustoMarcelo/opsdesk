import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { useTheme } from '../theme/ThemeContext';
import { ApiError } from '../api/client';
import { buildAuthUrl } from './keycloak';
import { keycloakCallback as apiKeycloakCallback } from '../api/auth';

const AUTH_MODE = import.meta.env.VITE_AUTH_MODE || 'local';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [keycloakCallbackLoading, setKeycloakCallbackLoading] = useState(false);
  const { login, user, isLoading, setTokens } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const from =
    (location.state as { from?: { pathname: string } })?.from?.pathname ?? '/';

  useEffect(() => {
    if (AUTH_MODE !== 'keycloak') return;

    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const errorParam = params.get('error');

    if (errorParam) {
      setError(`Keycloak error: ${errorParam}`);
      window.history.replaceState({}, '', '/login');
      return;
    }

    if (!code) return;

    const redirectUri = window.location.origin + '/login';

    setKeycloakCallbackLoading(true);
    void apiKeycloakCallback(code, redirectUri)
      .then((data) => {
        setTokens(data.accessToken, data.refreshToken ?? null);
        window.history.replaceState({}, '', '/login');
        void navigate(from, { replace: true });
      })
      .catch((err: unknown) => {
        const msg =
          err instanceof Error ? err.message : 'Failed to complete login';
        setError(msg);
        window.history.replaceState({}, '', '/login');
      })
      .finally(() => setKeycloakCallbackLoading(false));
  }, [setTokens, navigate, from]);

  if (user) {
    void navigate(from, { replace: true });
    return null;
  }

  const handleLocalLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await login(email, password);
      void navigate(from, { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message || 'Login failed');
      } else {
        setError('Login failed');
      }
    }
  };

  const handleKeycloakLogin = () => {
    const redirectUri = window.location.origin + '/login';
    const authUrl = buildAuthUrl(redirectUri);
    window.location.href = authUrl;
  };

  if (keycloakCallbackLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 dark:bg-slate-900">
        <div className="text-slate-600 dark:text-slate-400">
          Completing login...
        </div>
      </div>
    );
  }

  const isDark = theme === 'dark';
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 dark:bg-slate-900">
      <div className="relative w-full max-w-sm rounded-lg bg-white p-8 shadow-xl dark:bg-slate-800">
        <button
          type="button"
          onClick={toggleTheme}
          className="absolute right-4 top-4 rounded p-1.5 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700"
          title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {isDark ? (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
              />
            </svg>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
              />
            </svg>
          )}
        </button>
        <h1 className="mb-6 text-center text-2xl font-bold text-slate-800 dark:text-white">
          OpsDesk
        </h1>

        {error && AUTH_MODE === 'keycloak' && (
          <div className="mb-4 rounded bg-red-100 px-3 py-2 text-sm text-red-700 dark:bg-red-900/50 dark:text-red-200">
            {error}
          </div>
        )}

        {AUTH_MODE === 'keycloak' ? (
          <div className="space-y-4">
            <button
              type="button"
              onClick={handleKeycloakLogin}
              disabled={isLoading}
              className="w-full rounded-lg bg-amber-600 px-4 py-2 font-medium text-white hover:bg-amber-700 disabled:opacity-50"
            >
              Login with Keycloak
            </button>
            <p className="text-center text-sm text-slate-500 dark:text-slate-400">
              Or use local login (if configured)
            </p>
          </div>
        ) : null}

        {(AUTH_MODE === 'local' || AUTH_MODE !== 'keycloak') && (
          <form
            onSubmit={(e) => void handleLocalLogin(e)}
            className="space-y-4"
          >
            <div>
              <label
                htmlFor="email"
                className="mb-1 block text-sm text-slate-700 dark:text-slate-300"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder-slate-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white dark:placeholder-slate-400"
                placeholder="admin@opsdesk.dev"
              />
            </div>
            <div>
              <label
                htmlFor="password"
                className="mb-1 block text-sm text-slate-700 dark:text-slate-300"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder-slate-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white dark:placeholder-slate-400"
                placeholder="••••••••"
              />
            </div>
            {error && (
              <div className="rounded bg-red-100 px-3 py-2 text-sm text-red-700 dark:bg-red-900/50 dark:text-red-200">
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-lg bg-amber-600 px-4 py-2 font-medium text-white hover:bg-amber-700 disabled:opacity-50"
            >
              {isLoading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
