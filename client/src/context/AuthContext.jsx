import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi } from '../api/api.js';

const AuthContext = createContext(null);

/**
 * AuthProvider — wraps the app and provides auth state + actions.
 * On mount it calls GET /api/auth/me to rehydrate an existing session.
 */
export function AuthProvider({ children }) {
  const [user, setUser]         = useState(null);   // null = unknown/logged-out
  const [loading, setLoading]   = useState(true);   // true while checking session

  // Check for an existing session on every page load / refresh
  useEffect(() => {
    authApi.me()
      .then(data => setUser(data.user))
      .catch(() => setUser(null))          // 401 = not logged in, that's fine
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email, password) => {
    const data = await authApi.login(email, password);
    setUser(data.user);
    return data;
  }, []);

  const signup = useCallback(async (name, email, password) => {
    const data = await authApi.signup(name, email, password);
    setUser(data.user);
    return data;
  }, []);

  const logout = useCallback(async () => {
    await authApi.logout();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

/** Hook — use inside any component that needs auth state */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
