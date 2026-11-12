import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { authService } from '../services/api';

vi.mock('../services/api', () => ({
  authService: {
    login: vi.fn(),
    me: vi.fn(),
  },
}));

function Probe() {
  const { user, login, logout } = useAuth();
  return (
    <div>
      <span data-testid="user">{user ? user.name : 'sem-usuario'}</span>
      <button onClick={() => login('a@x.com', 'senha123').catch(() => {})}>entrar</button>
      <button onClick={logout}>saida</button>
    </div>
  );
}

describe('AuthContext (main)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    authService.me.mockRejectedValue(new Error('no token'));
  });

  test('login bem-sucedido grava token/user no localStorage e atualiza o contexto', async () => {
    authService.login.mockResolvedValue({ token: 'jwt-token', user: { id: 'u1', name: 'Ana', role: 'ADMIN' } });

    render(<AuthProvider><Probe /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId('user').textContent).toBe('sem-usuario'));

    await act(async () => {
      screen.getByText('entrar').click();
    });

    await waitFor(() => expect(screen.getByTestId('user').textContent).toBe('Ana'));
    expect(localStorage.getItem('token')).toBe('jwt-token');
    expect(JSON.parse(localStorage.getItem('user'))).toEqual({ id: 'u1', name: 'Ana', role: 'ADMIN' });
  });

  test('login com credenciais inválidas não grava nada e mantém o usuário nulo', async () => {
    authService.login.mockRejectedValue({ response: { data: { error: 'Credenciais inválidas' } } });

    render(<AuthProvider><Probe /></AuthProvider>);
    await act(async () => {
      screen.getByText('entrar').click();
    });

    expect(screen.getByTestId('user').textContent).toBe('sem-usuario');
    expect(localStorage.getItem('token')).toBeNull();
  });

  test('logout limpa localStorage e o usuário do contexto', async () => {
    localStorage.setItem('token', 'jwt-token');
    localStorage.setItem('user', JSON.stringify({ id: 'u1', name: 'Ana' }));
    authService.me.mockResolvedValue({ id: 'u1', name: 'Ana' });

    render(<AuthProvider><Probe /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId('user').textContent).toBe('Ana'));

    await act(async () => {
      screen.getByText('saida').click();
    });

    expect(screen.getByTestId('user').textContent).toBe('sem-usuario');
    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
  });
});
