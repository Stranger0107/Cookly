/**
 * Auth state for the whole app.
 *
 * On load: if a token is saved, call GET /auth/me to restore the session.
 * status: "loading" (checking the token) | "authenticated" | "guest"
 *
 * Note: the JWT is kept in localStorage for simplicity. The trade-off is that
 * any XSS could read it; httpOnly cookies + refresh tokens would be the
 * production-grade upgrade (listed in the backend README).
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authApi } from '../api';
import { onUnauthorized, tokenStore } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState(() => (tokenStore.get() ? 'loading' : 'guest'));
  const [sessionExpired, setSessionExpired] = useState(false);

  const logout = useCallback(() => {
    tokenStore.set(null);
    setUser(null);
    setStatus('guest');
  }, []);

  // Restore the session from a saved token.
  useEffect(() => {
    if (!tokenStore.get()) return;
    authApi
      .me()
      .then(({ user: me }) => {
        setUser(me);
        setStatus('authenticated');
      })
      .catch(() => logout());
  }, [logout]);

  // Any 401 later on (expired / invalid token) logs the user out.
  useEffect(() => {
    onUnauthorized(() => {
      if (tokenStore.get()) setSessionExpired(true);
      logout();
    });
  }, [logout]);

  const startSession = useCallback(({ user: u, token }) => {
    tokenStore.set(token);
    setUser(u);
    setStatus('authenticated');
    setSessionExpired(false);
    return u;
  }, []);

  const login = useCallback(async (credentials) => startSession(await authApi.login(credentials)), [startSession]);
  const register = useCallback(async (details) => startSession(await authApi.register(details)), [startSession]);

  const value = useMemo(
    () => ({
      user,
      status,
      isAuthenticated: status === 'authenticated',
      login,
      register,
      logout,
      sessionExpired,
      dismissSessionExpired: () => setSessionExpired(false),
    }),
    [user, status, login, register, logout, sessionExpired]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
