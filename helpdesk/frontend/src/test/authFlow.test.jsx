import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import App from '../App';
import { ThemeProvider } from '../contexts/ThemeContext';

vi.mock('../services/api', () => ({
  authService: {
    me: vi.fn(),
    login: vi.fn(),
    changePassword: vi.fn(),
  },
  permissionService: {
    me: vi.fn(),
    catalog: vi.fn(),
  },
}));

import { authService, permissionService } from '../services/api';

function renderApp() {
  return render(
    <ThemeProvider>
      <App />
    </ThemeProvider>
  );
}

function setLocation(path) {
  window.history.pushState({}, '', path);
}

function setStoredSession({ token, user } = {}) {
  if (token) localStorage.setItem('token', token);
  else localStorage.removeItem('token');
  if (user) localStorage.setItem('user', JSON.stringify(user));
  else localStorage.removeItem('user');
}

describe('Fluxo de autenticacao', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    permissionService.me.mockResolvedValue({ permissions: ['dashboard.read'] });
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('sem token: acesso a /app redireciona para /login', async () => {
    setStoredSession({});
    setLocation('/app');
    renderApp();

    await waitFor(() => {
      expect(screen.getByText(/bem-vindo de volta/i)).toBeInTheDocument();
    });
  });

  it('token valido: acesso a /app renderiza a area privada (AppLayout)', async () => {
    authService.me.mockResolvedValue({ id: 1, name: 'Marco', role: 'ADMIN' });
    setStoredSession({ token: 'valid-token', user: { id: 1, name: 'Marco', role: 'ADMIN' } });
    setLocation('/app');
    renderApp();

    await waitFor(() => {
      expect(screen.queryByText(/bem-vindo de volta/i)).not.toBeInTheDocument();
    });
    expect(authService.me).toHaveBeenCalledTimes(1);
  });

  it('token expirado/invalido: /app acaba redirecionando para /login apos falha no /auth/me', async () => {
    authService.me.mockRejectedValue({ response: { status: 401 } });
    setStoredSession({ token: 'expired-token', user: { id: 1, name: 'Marco' } });
    setLocation('/app');
    renderApp();

    await waitFor(() => {
      expect(screen.getByText(/bem-vindo de volta/i)).toBeInTheDocument();
    });
    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
  });

  it('API lenta: PrivateRoute mostra spinner de carregamento enquanto /auth/me nao resolve', async () => {
    let resolveMe;
    authService.me.mockReturnValue(new Promise((resolve) => { resolveMe = resolve; }));
    setStoredSession({ token: 'valid-token', user: { id: 1, name: 'Marco', role: 'ADMIN' } });
    setLocation('/app');
    const { container } = renderApp();

    expect(container.querySelector('.ant-spin')).toBeTruthy();
    expect(screen.queryByText(/bem-vindo de volta/i)).not.toBeInTheDocument();

    resolveMe({ id: 1, name: 'Marco', role: 'ADMIN' });
    await waitFor(() => {
      expect(screen.getAllByText('Dashboard').length).toBeGreaterThan(0);
    }, { timeout: 15000 });
  });

  it('usuario ja autenticado (user no localStorage) acessando /login e redirecionado para /app somente apos validacao', async () => {
    authService.me.mockResolvedValue({ id: 1, name: 'Marco', role: 'ADMIN' });
    setStoredSession({ token: 'valid-token', user: { id: 1, name: 'Marco', role: 'ADMIN' } });
    setLocation('/login');
    renderApp();

    await waitFor(() => {
      expect(screen.queryByText(/bem-vindo de volta/i)).not.toBeInTheDocument();
    });
  });

  it('rota publica (/login) permanece acessivel para visitante sem sessao', async () => {
    setStoredSession({});
    setLocation('/login');
    renderApp();

    await waitFor(() => {
      expect(screen.getByText(/bem-vindo de volta/i)).toBeInTheDocument();
    });
  });

  it('condicao de corrida: formulario de login renderiza imediatamente mesmo com user otimista no localStorage, sem aguardar a API', async () => {
    let resolveMe;
    authService.me.mockReturnValue(new Promise((resolve) => { resolveMe = resolve; }));
    setStoredSession({ token: 'valid-token', user: { id: 1, name: 'Marco', role: 'ADMIN' } });
    setLocation('/login');
    renderApp();

    expect(screen.getByText(/bem-vindo de volta/i)).toBeInTheDocument();

    resolveMe({ id: 1, name: 'Marco', role: 'ADMIN' });
    await waitFor(() => {
      expect(screen.queryByText(/bem-vindo de volta/i)).not.toBeInTheDocument();
    });
  });

  it('condicao de corrida: token expirado em /login nao provoca bounce para /app (sem /login -> /app -> /login)', async () => {
    authService.me.mockRejectedValue({ response: { status: 401 } });
    setStoredSession({ token: 'expired-token', user: { id: 1, name: 'Marco' } });
    setLocation('/login');
    renderApp();

    expect(screen.getByText(/bem-vindo de volta/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(authService.me).toHaveBeenCalledTimes(1);
    });

    expect(screen.getByText(/bem-vindo de volta/i)).toBeInTheDocument();
    expect(screen.queryAllByText('Dashboard').length).toBe(0);
    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
    expect(authService.me).toHaveBeenCalledTimes(1);
  });
});
