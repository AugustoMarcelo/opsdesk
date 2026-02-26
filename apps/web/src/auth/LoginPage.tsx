import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { ApiError } from '../api/client';
import { buildAuthUrl } from './keycloak';
import { keycloakCallback as apiKeycloakCallback } from '../api/auth';

const AUTH_MODE = import.meta.env.VITE_AUTH_MODE || 'local';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [keycloakCallbackLoading, setKeycloakCallbackLoading] = useState(false);
  const { login, user, isLoading, setToken } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? '/';

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
    apiKeycloakCallback(code, redirectUri)
      .then((data) => {
        setToken(data.accessToken);
        window.history.replaceState({}, '', '/login');
        navigate(from, { replace: true });
      })
      .catch((err) => {
        setError(err.message || 'Failed to complete login');
        window.history.replaceState({}, '', '/login');
      })
      .finally(() => setKeycloakCallbackLoading(false));
  }, [setToken, navigate, from]);

  if (user) {
    navigate(from, { replace: true });
    return null;
  }

  const handleLocalLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await login(email, password);
      navigate(from, { replace: true });
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
      <div className="flex min-h-screen items-center justify-center bg-slate-900">
        <div className="text-slate-400">Completing login...</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900">
      <div className="w-full max-w-sm rounded-lg bg-slate-800 p-8 shadow-xl">
        <h1 className="mb-6 text-center text-2xl font-bold text-white">OpsDesk</h1>

        {error && AUTH_MODE === 'keycloak' && (
          <div className="mb-4 rounded bg-red-900/50 px-3 py-2 text-sm text-red-200">
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
            <p className="text-center text-sm text-slate-400">
              Or use local login (if configured)
            </p>
          </div>
        ) : null}

        {(AUTH_MODE === 'local' || AUTH_MODE !== 'keycloak') && (
          <form onSubmit={handleLocalLogin} className="space-y-4">
            <div>
              <label htmlFor="email" className="mb-1 block text-sm text-slate-300">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded border border-slate-600 bg-slate-700 px-3 py-2 text-white placeholder-slate-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                placeholder="admin@opsdesk.dev"
              />
            </div>
            <div>
              <label htmlFor="password" className="mb-1 block text-sm text-slate-300">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full rounded border border-slate-600 bg-slate-700 px-3 py-2 text-white placeholder-slate-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                placeholder="••••••••"
              />
            </div>
            {error && (
              <div className="rounded bg-red-900/50 px-3 py-2 text-sm text-red-200">
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
