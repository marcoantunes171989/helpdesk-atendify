import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import App from '../App';
import { ThemeProvider } from '../contexts/ThemeContext';

// App é renderizado sem o ThemeProvider que o envolve em produção (ver
// main.jsx); páginas carregadas de forma assíncrona (ex.: Dashboard) usam
// useTheme() e quebram se montarem sem ele. Em testes anteriores isso não
// aparecia por uma corrida: a asserção terminava antes do chunk lazy
// resolver. Envolvendo aqui, o comportamento passa a refletir produção e
// elimina a flakiness independente de quantos testes rodam depois.
function renderApp() {
  return render(<ThemeProvider><App /></ThemeProvider>);
}

vi.mock('../services/api', () => ({
  authService: { me: vi.fn(), login: vi.fn(), changePassword: vi.fn() },
  permissionService: { me: vi.fn(), catalog: vi.fn() },
}));

import { authService, permissionService } from '../services/api';

function setLocation(path) {
  window.history.pushState({}, '', path);
}

function setStoredSession({ token, user } = {}) {
  if (token) localStorage.setItem('token', token);
  else localStorage.removeItem('token');
  if (user) localStorage.setItem('user', JSON.stringify(user));
  else localStorage.removeItem('user');
}

describe('RBAC — menus e rotas por permissão', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('usuário sem a permissão users.read não vê o menu "Usuários"', async () => {
    authService.me.mockResolvedValue({ id: 1, name: 'Agente', role: 'AGENT' });
    permissionService.me.mockResolvedValue({ permissions: ['dashboard.read', 'tickets.read'] });
    setStoredSession({ token: 'valid-token', user: { id: 1, name: 'Agente', role: 'AGENT' } });
    setLocation('/app');
    renderApp();

    await waitFor(() => {
      expect(screen.getAllByText('Dashboard').length).toBeGreaterThan(0);
    }, { timeout: 15000 });
    expect(screen.queryByText('Usuários')).not.toBeInTheDocument();
  });

  it('usuário com users.read (via grupo) vê o menu "Usuários"', async () => {
    authService.me.mockResolvedValue({ id: 2, name: 'Suporte', role: 'AGENT', accessGroupId: 'g1' });
    permissionService.me.mockResolvedValue({ permissions: ['dashboard.read', 'users.read'] });
    setStoredSession({ token: 'valid-token', user: { id: 2, name: 'Suporte', role: 'AGENT' } });
    setLocation('/app');
    renderApp();

    await waitFor(() => {
      expect(screen.getByText('Usuários')).toBeInTheDocument();
    });
  });

  it('acesso direto à rota /app/users sem permissão é bloqueado e redireciona para /app', async () => {
    authService.me.mockResolvedValue({ id: 1, name: 'Agente', role: 'AGENT' });
    permissionService.me.mockResolvedValue({ permissions: ['dashboard.read'] });
    setStoredSession({ token: 'valid-token', user: { id: 1, name: 'Agente', role: 'AGENT' } });
    setLocation('/app/users');
    renderApp();

    await waitFor(() => {
      expect(screen.queryByText('Novo Usuário')).not.toBeInTheDocument();
    });
  });

  it('SUPER_ADMIN sempre vê "Usuários" mesmo sem permissões explícitas carregadas', async () => {
    authService.me.mockResolvedValue({ id: 9, name: 'Root', role: 'SUPER_ADMIN' });
    permissionService.me.mockResolvedValue({ permissions: [] });
    setStoredSession({ token: 'valid-token', user: { id: 9, name: 'Root', role: 'SUPER_ADMIN' } });
    setLocation('/app');
    renderApp();

    await waitFor(() => {
      expect(screen.getByText('Usuários')).toBeInTheDocument();
    });
  });

  // RBAC-03 ETAPA 5: "Relatórios" deve seguir a permissão efetiva reports.read,
  // não o Role legado (antes a tela só checava se o Role era ADMIN/SUPER_ADMIN).
  it('CLIENT não vê o menu "Relatórios" (reports.read não está no padrão do Role)', async () => {
    authService.me.mockResolvedValue({ id: 3, name: 'Cliente', role: 'CLIENT' });
    permissionService.me.mockResolvedValue({ permissions: ['dashboard.read', 'tickets.read'] });
    setStoredSession({ token: 'valid-token', user: { id: 3, name: 'Cliente', role: 'CLIENT' } });
    setLocation('/app');
    renderApp();

    await waitFor(() => {
      expect(screen.getAllByText('Dashboard').length).toBeGreaterThan(0);
    }, { timeout: 15000 });
    expect(screen.queryByText('Relatórios')).not.toBeInTheDocument();
  });

  it('AGENT com reports.read concedido por grupo personalizado vê o menu "Relatórios"', async () => {
    authService.me.mockResolvedValue({ id: 4, name: 'Agente Fin', role: 'AGENT', accessGroupId: 'g2' });
    permissionService.me.mockResolvedValue({ permissions: ['dashboard.read', 'reports.read'] });
    setStoredSession({ token: 'valid-token', user: { id: 4, name: 'Agente Fin', role: 'AGENT' } });
    setLocation('/app');
    renderApp();

    await waitFor(() => {
      expect(screen.getByText('Relatórios')).toBeInTheDocument();
    });
  });

  it('acesso direto à rota /app/reports sem reports.read é bloqueado', async () => {
    authService.me.mockResolvedValue({ id: 3, name: 'Cliente', role: 'CLIENT' });
    permissionService.me.mockResolvedValue({ permissions: ['dashboard.read', 'tickets.read'] });
    setStoredSession({ token: 'valid-token', user: { id: 3, name: 'Cliente', role: 'CLIENT' } });
    setLocation('/app/reports');
    renderApp();

    await waitFor(() => {
      expect(screen.queryByText('Relatórios')).not.toBeInTheDocument();
    });
  });

  // RBAC-05 ETAPA 6, cenário 1: grupo com acesso somente ao Dashboard não vê
  // "Chamados" no menu (tickets.read não foi concedido).
  it('grupo com acesso somente ao Dashboard não vê "Chamados" no menu', async () => {
    authService.me.mockResolvedValue({ id: 5, name: 'Visitante', role: 'AGENT', accessGroupId: 'g3' });
    permissionService.me.mockResolvedValue({ permissions: ['dashboard.read'] });
    setStoredSession({ token: 'valid-token', user: { id: 5, name: 'Visitante', role: 'AGENT' } });
    setLocation('/app');
    renderApp();

    await waitFor(() => {
      expect(screen.getAllByText('Dashboard').length).toBeGreaterThan(0);
    }, { timeout: 15000 });
    expect(screen.queryByText('Chamados')).not.toBeInTheDocument();
  });

  // RBAC-05 ETAPA 6, cenário 3: grupo com acesso ao CRM mas sem Relatórios
  // deve ver um módulo e não o outro.
  it('grupo com crm.read mas sem reports.read vê "CRM" e não vê "Relatórios"', async () => {
    authService.me.mockResolvedValue({ id: 6, name: 'Comercial', role: 'AGENT', accessGroupId: 'g4' });
    permissionService.me.mockResolvedValue({ permissions: ['dashboard.read', 'crm.read'] });
    setStoredSession({ token: 'valid-token', user: { id: 6, name: 'Comercial', role: 'AGENT' } });
    setLocation('/app');
    renderApp();

    await waitFor(() => {
      expect(screen.getByText('CRM')).toBeInTheDocument();
    });
    expect(screen.queryByText('Relatórios')).not.toBeInTheDocument();
  });

  it('acesso direto à rota /app/crm sem crm.read é bloqueado', async () => {
    authService.me.mockResolvedValue({ id: 3, name: 'Cliente', role: 'CLIENT' });
    permissionService.me.mockResolvedValue({ permissions: ['dashboard.read', 'tickets.read'] });
    setStoredSession({ token: 'valid-token', user: { id: 3, name: 'Cliente', role: 'CLIENT' } });
    setLocation('/app/crm');
    renderApp();

    await waitFor(() => {
      expect(screen.queryByText('Novo Contato')).not.toBeInTheDocument();
    });
  });

  // RBAC-05 ETAPA 6, cenário 6: grupo sem acesso a Usuários — cobre também
  // que "Perfis de Acesso" continua independente (chaves de permissão distintas).
  it('grupo sem access_groups.read não vê "Perfis de Acesso" mesmo tendo users.read', async () => {
    authService.me.mockResolvedValue({ id: 7, name: 'RH', role: 'AGENT', accessGroupId: 'g5' });
    permissionService.me.mockResolvedValue({ permissions: ['dashboard.read', 'users.read'] });
    setStoredSession({ token: 'valid-token', user: { id: 7, name: 'RH', role: 'AGENT' } });
    setLocation('/app');
    renderApp();

    await waitFor(() => {
      expect(screen.getByText('Usuários')).toBeInTheDocument();
    });
    expect(screen.queryByText('Perfis de Acesso')).not.toBeInTheDocument();
  });

  // RBAC-05 ETAPA 6, cenário 8: grupo desativado — o backend retorna o
  // conjunto de permissões efetivo (já sem o grupo inativo); o frontend deve
  // refletir fielmente o que veio de /api/permissions/me, sem cache otimista.
  it('usuário cujo grupo foi desativado perde o acesso a módulos antes visíveis', async () => {
    authService.me.mockResolvedValue({ id: 8, name: 'Op', role: 'AGENT', accessGroupId: 'g6' });
    permissionService.me.mockResolvedValue({ permissions: ['dashboard.read', 'tickets.read'] });
    setStoredSession({ token: 'valid-token', user: { id: 8, name: 'Op', role: 'AGENT' } });
    setLocation('/app');
    renderApp();

    await waitFor(() => {
      expect(screen.getAllByText('Dashboard').length).toBeGreaterThan(0);
    }, { timeout: 15000 });
    expect(screen.queryByText('CRM')).not.toBeInTheDocument();
    expect(screen.queryByText('Usuários')).not.toBeInTheDocument();
  });

  // RBAC-UX-01 GATE 08: o menu lateral é agrupado (Painel, Atendimento,
  // Cadastros, Gestão, Administração). Um grupo sem nenhum item permitido
  // não deve aparecer — "Gestão" só tem itens com permissão exigida, então
  // deve desaparecer para quem só tem dashboard.read.
  it('grupo "Gestão" não aparece no menu para usuário sem nenhuma permissão desse grupo', async () => {
    authService.me.mockResolvedValue({ id: 10, name: 'Visitante', role: 'AGENT', accessGroupId: 'g7' });
    permissionService.me.mockResolvedValue({ permissions: ['dashboard.read'] });
    setStoredSession({ token: 'valid-token', user: { id: 10, name: 'Visitante', role: 'AGENT' } });
    setLocation('/app');
    renderApp();

    await waitFor(() => {
      expect(screen.getAllByText('Dashboard').length).toBeGreaterThan(0);
    }, { timeout: 15000 });
    expect(screen.getByText('Painel')).toBeInTheDocument();
    expect(screen.queryByText('Atendimento')).not.toBeInTheDocument();
    expect(screen.queryByText('Cadastros')).not.toBeInTheDocument();
    expect(screen.queryByText('Gestão')).not.toBeInTheDocument();
  });

  // SUPER_ADMIN vê todos os grupos, já que tem bypass total de permissões.
  it('SUPER_ADMIN vê todos os grupos do menu lateral agrupado', async () => {
    authService.me.mockResolvedValue({ id: 9, name: 'Root', role: 'SUPER_ADMIN' });
    permissionService.me.mockResolvedValue({ permissions: [] });
    setStoredSession({ token: 'valid-token', user: { id: 9, name: 'Root', role: 'SUPER_ADMIN' } });
    setLocation('/app');
    renderApp();

    await waitFor(() => {
      expect(screen.getByText('Administração')).toBeInTheDocument();
    });
    expect(screen.getByText('Painel')).toBeInTheDocument();
    expect(screen.getByText('Atendimento')).toBeInTheDocument();
    expect(screen.getByText('Cadastros')).toBeInTheDocument();
    expect(screen.getByText('Gestão')).toBeInTheDocument();
  });
});
