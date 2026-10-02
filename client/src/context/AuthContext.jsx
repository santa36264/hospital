import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import apiClient from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | authenticated | unauthenticated

  const logout = useCallback(async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch {
      // ignore network errors during logout
    }
    setUser(null);
    setStatus('unauthenticated');
  }, []);

  const loadCurrentUser = useCallback(async () => {
    try {
      const res = await apiClient.get('/auth/me');
      setUser(res.data.data);
      setStatus('authenticated');
    } catch {
      try {
        await apiClient.post('/auth/refresh');
        const res = await apiClient.get('/auth/me');
        setUser(res.data.data);
        setStatus('authenticated');
      } catch {
        setUser(null);
        setStatus('unauthenticated');
      }
    }
  }, []);

  useEffect(() => {
    loadCurrentUser();
  }, [loadCurrentUser]);

  useEffect(() => {
    const handler = () => {
      setUser(null);
      setStatus('unauthenticated');
    };
    window.addEventListener('auth:unauthorized', handler);
    return () => window.removeEventListener('auth:unauthorized', handler);
  }, []);

  const login = useCallback(async (email, password) => {
    const res = await apiClient.post('/auth/login', { email, password });
    setUser(res.data.data.user);
    setStatus('authenticated');
    return res.data.data.user;
  }, []);

  const value = useMemo(
    () => ({ user, status, login, logout, refresh: loadCurrentUser }),
    [user, status, login, logout, loadCurrentUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
