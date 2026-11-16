import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { authService, permissionService, clearApiCache } from '../services/api';

const AuthContext = createContext(null);

const PERMISSIONS_KEY = 'permissions';

function readJson(key) {
  try {
    return JSON.parse(localStorage.getItem(key));
  } catch {
    return null;
  }
}

function persistPermissions(perms) {
  localStorage.setItem(PERMISSIONS_KEY, JSON.stringify(perms));
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => readJson('user'));
  const [permissions, setPermissions] = useState(() => new Set(readJson(PERMISSIONS_KEY) || []));
  // Com usuário e permissões em cache, a tela abre na hora e a sessão é
  // revalidada em segundo plano. O backend continua sendo quem autoriza.
  const [loading, setLoading] = useState(() => {
    const hasToken = !!localStorage.getItem('token');
    return hasToken && !(readJson('user') && readJson(PERMISSIONS_KEY));
  });

  const loadPermissions = useCallback(async () => {
    try {
      const { permissions: perms } = await permissionService.me();
      setPermissions(new Set(perms));
      persistPermissions(perms);
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
    Promise.all([
      authService.me().then(fresh => {
        setUser(fresh);
        localStorage.setItem('user', JSON.stringify(fresh));
      }),
      loadPermissions(),
    ])
      .catch(() => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem(PERMISSIONS_KEY);
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, [loadPermissions]);

  const login = async (identifier, password) => {
    const { token, user, permissions: perms } = await authService.login(identifier, password);
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    clearApiCache();
    if (Array.isArray(perms)) {
      setPermissions(new Set(perms));
      persistPermissions(perms);
    } else {
      await loadPermissions();
    }
    setUser(user);
    return user;
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem(PERMISSIONS_KEY);
    clearApiCache();
    setUser(null);
    setPermissions(new Set());
  };

  // SUPER_ADMIN sempre tem acesso total (bypass), espelhando a regra do backend.
  const can = useCallback(
    (permissionKey) => user?.role === 'SUPER_ADMIN' || permissions.has(permissionKey),
    [user, permissions],
  );

  const value = useMemo(
    () => ({ user, login, logout, loading, can, reloadPermissions: loadPermissions }),
    // login/logout só dependem de setters estáveis
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user, loading, can, loadPermissions],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
