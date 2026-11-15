import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authService, permissionService } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('user'));
    } catch {
      return null;
    }
  });
  const [permissions, setPermissions] = useState(() => new Set());
  const [loading, setLoading] = useState(true);

  const loadPermissions = useCallback(async () => {
    try {
      const { permissions: perms } = await permissionService.me();
      setPermissions(new Set(perms));
    } catch {
      setPermissions(new Set());
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }
    Promise.all([authService.me().then(setUser), loadPermissions()])
      .catch(() => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, [loadPermissions]);

  const login = async (identifier, password) => {
    const { token, user } = await authService.login(identifier, password);
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    setUser(user);
    await loadPermissions();
    return user;
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setPermissions(new Set());
  };

  // SUPER_ADMIN sempre tem acesso total (bypass), espelhando a regra do backend.
  const can = (permissionKey) => user?.role === 'SUPER_ADMIN' || permissions.has(permissionKey);

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, can, reloadPermissions: loadPermissions }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
