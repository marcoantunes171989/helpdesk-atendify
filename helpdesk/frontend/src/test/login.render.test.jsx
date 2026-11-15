import { describe, test, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import Login from '../pages/Login';

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ login: vi.fn() }),
}));

describe('Login page (main) — renderização básica', () => {
  test('exibe os campos de e-mail e senha e o botão de entrar', () => {
    render(<Login />);

    expect(screen.getByPlaceholderText('seu@email.com ou usuário')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Entrar na plataforma' })).toBeInTheDocument();
  });
});
