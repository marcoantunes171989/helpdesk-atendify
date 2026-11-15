import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import Categories from '../pages/Categories';

// RBAC-06 ETAPA 3: clique na linha de Categories.jsx sempre abria o
// formulário de edição, mesmo para quem só tem categories.read (sem
// categories.update). Este teste cobre: (a) leitura-only abre em modo
// somente-leitura (campos desabilitados, sem botão de salvar); (b) quem tem
// categories.update edita normalmente pelo clique na linha; (c) sem
// categories.update, os botões de editar/excluir não aparecem na linha.

vi.mock('../contexts/ThemeContext', () => ({
  useTheme: () => ({ resolvedTheme: 'light' }),
}));

vi.mock('../services/api', () => ({
  categoryService: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  },
}));

const mockCan = vi.fn();
vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ can: mockCan }),
}));

import { categoryService } from '../services/api';

const CATEGORY = {
  id: 'cat1', name: 'Suporte Técnico', description: 'Chamados de suporte',
  slaHours: 24, active: true, code: 1, createdAt: new Date().toISOString(),
  _count: { tickets: 0 },
};

function setPermissions(keys) {
  mockCan.mockImplementation((key) => keys.includes(key));
}

describe('Categories — clique na linha respeita categories.update (RBAC-06 ETAPA 3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    categoryService.list.mockResolvedValue([CATEGORY]);
  });

  it('usuário só com categories.read: clique na linha abre modo somente-leitura, sem botão salvar', async () => {
    setPermissions(['categories.read']);
    render(<Categories />);

    await waitFor(() => expect(screen.getByText('Suporte Técnico')).toBeInTheDocument());

    // Sem categories.update, os ícones de ação não aparecem na linha
    expect(screen.queryByLabelText('edit')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('delete')).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('Suporte Técnico'));

    await waitFor(() => expect(screen.getByText('Detalhes da Categoria')).toBeInTheDocument());
    expect(screen.queryByText('Salvar Alterações')).not.toBeInTheDocument();
    expect(screen.getByText('Fechar')).toBeInTheDocument();

    const nameField = screen.getByDisplayValue('Suporte Técnico');
    expect(nameField).toBeDisabled();
  });

  it('usuário com categories.update: clique na linha abre edição normalmente', async () => {
    setPermissions(['categories.read', 'categories.update']);
    render(<Categories />);

    await waitFor(() => expect(screen.getByText('Suporte Técnico')).toBeInTheDocument());

    fireEvent.click(screen.getByText('Suporte Técnico'));

    await waitFor(() => expect(screen.getByText('Editar Categoria')).toBeInTheDocument());
    expect(screen.getByText('Salvar Alterações')).toBeInTheDocument();

    const nameField = screen.getByDisplayValue('Suporte Técnico');
    expect(nameField).not.toBeDisabled();
  });
});
