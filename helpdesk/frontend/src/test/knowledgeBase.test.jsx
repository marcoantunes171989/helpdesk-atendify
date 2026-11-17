import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

const authState = { permissions: [] };

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'u1', name: 'Marco Antunes', email: 'm@x.com', role: 'AGENT' },
    can: (p) => authState.permissions.includes(p),
    logout: vi.fn(),
  }),
}));

vi.mock('../services/api', () => ({
  knowledgeService: {
    list: vi.fn(), get: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn(), query: vi.fn(),
    fetchAttachment: vi.fn(),
    listCategories: vi.fn(), createCategory: vi.fn(), updateCategory: vi.fn(), removeCategory: vi.fn(),
    listFavorites: vi.fn(), addFavorite: vi.fn(), removeFavorite: vi.fn(),
    listHistory: vi.fn(), clearHistory: vi.fn(), importLocalPersonal: vi.fn(),
  },
}));

import { knowledgeService } from '../services/api';
import KnowledgeBase from '../pages/KnowledgeBase';

const ARTICLES = [
  {
    id: 'a1', code: 1, title: 'Configurar impressora térmica', content: 'Passo a passo para configurar a impressora no PDV.',
    category: 'CONFIGURACAO', tags: 'impressora', active: true, attachments: [],
    createdAt: '2026-11-01T10:00:00Z', updatedAt: '2026-11-14T10:00:00Z',
  },
  {
    id: 'a2', code: 2, title: 'Manual fiscal NFC-e', content: 'Orientações completas sobre emissão de notas.',
    category: 'DUVIDA', tags: null, active: true, attachments: [{ id: 'f1', name: 'nfce.pdf', mimeType: 'application/pdf', size: 2048 }],
    createdAt: '2026-11-02T10:00:00Z', updatedAt: '2026-11-15T10:00:00Z',
  },
  {
    id: 'a3', code: 3, title: 'Rascunho interno', content: 'Ainda não publicado.',
    category: 'ERRO', tags: null, active: false, attachments: [],
    createdAt: '2026-11-03T10:00:00Z', updatedAt: '2026-11-16T10:00:00Z',
  },
];

function renderKb(path = '/app/knowledge') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/app/knowledge/*" element={<KnowledgeBase />} />
      </Routes>
    </MemoryRouter>,
  );
}

const cardTitles = () => Array.from(document.querySelectorAll('.kb-card-link')).map(b => b.textContent);

async function search(term, { viaButton = false } = {}) {
  const input = screen.getByRole('searchbox', { name: /pesquisar/i });
  fireEvent.change(input, { target: { value: term } });
  if (viaButton) fireEvent.click(screen.getByRole('button', { name: 'Buscar' }));
  else fireEvent.submit(input.closest('form'));
}

describe('Central de Conhecimento', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    authState.permissions = ['knowledge.read'];
    knowledgeService.list.mockResolvedValue(ARTICLES);
    knowledgeService.get.mockImplementation(id => Promise.resolve(ARTICLES.find(a => a.id === id)));
    knowledgeService.listCategories.mockResolvedValue([]);
    knowledgeService.listFavorites.mockResolvedValue({ favorites: [] });
    knowledgeService.listHistory.mockResolvedValue({ history: [] });
    knowledgeService.addFavorite.mockImplementation(async (id) => ({ favorites: [id] }));
    knowledgeService.removeFavorite.mockResolvedValue({ favorites: [] });
    knowledgeService.importLocalPersonal.mockResolvedValue({ favorites: [], history: [] });
  });

  it('mostra os conteúdos reais ordenados por data e as contagens reais das categorias', async () => {
    renderKb();
    await waitFor(() => expect(cardTitles()).toHaveLength(2));
    expect(cardTitles()).toEqual(['Manual fiscal NFC-e', 'Configurar impressora térmica']);
    const cats = screen.getByRole('region', { name: 'Categorias' });
    expect(within(cats).getByRole('button', { name: /Configurações\s*1 conteúdo/ })).toBeInTheDocument();
    expect(within(cats).getByRole('button', { name: /Outros\s*1 conteúdo/ })).toBeInTheDocument();
    expect(within(cats).getByRole('button', { name: /Fiscal\s*0 conteúdos/ })).toBeInTheDocument();
  });

  it('oculta conteúdos inativos de quem só tem leitura e mostra para quem edita', async () => {
    const { unmount } = renderKb();
    await waitFor(() => expect(cardTitles()).toHaveLength(2));
    expect(cardTitles()).not.toContain('Rascunho interno');
    unmount();

    authState.permissions = ['knowledge.read', 'knowledge.update'];
    renderKb();
    await waitFor(() => expect(cardTitles()).toContain('Rascunho interno'));
  });

  it('pesquisa com Enter, por termo parcial e sem acento', async () => {
    renderKb();
    await waitFor(() => expect(cardTitles()).toHaveLength(2));
    await search('termica');
    expect(cardTitles()).toEqual(['Configurar impressora térmica']);
    expect(screen.getByText(/1 resultado/)).toBeInTheDocument();
  });

  it('pesquisa pelo botão Buscar, mostra estado vazio e limpa a pesquisa', async () => {
    renderKb();
    await waitFor(() => expect(cardTitles()).toHaveLength(2));
    await search('xyz-inexistente', { viaButton: true });
    expect(screen.getByText('Nenhum resultado para "xyz-inexistente"')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Limpar pesquisa' }));
    expect(cardTitles()).toHaveLength(2);
  });

  it('pesquisa pelos exemplos do banner', async () => {
    renderKb();
    await waitFor(() => expect(cardTitles()).toHaveLength(2));
    fireEvent.click(screen.getByRole('button', { name: 'configurar impressora' }));
    expect(cardTitles()).toEqual(['Configurar impressora térmica']);
  });

  it('filtra por categoria e desfaz ao clicar de novo', async () => {
    renderKb();
    await waitFor(() => expect(cardTitles()).toHaveLength(2));
    const cfg = screen.getByRole('button', { name: /Configurações\s*1 conteúdo/ });
    fireEvent.click(cfg);
    expect(cfg).toHaveAttribute('aria-pressed', 'true');
    expect(cardTitles()).toEqual(['Configurar impressora térmica']);
    fireEvent.click(cfg);
    expect(cardTitles()).toHaveLength(2);
  });

  it('favorita via API, filtra pela aba Favoritos e sincroniza cache local', async () => {
    renderKb();
    await waitFor(() => expect(cardTitles()).toHaveLength(2));
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar "Manual fiscal NFC-e" aos favoritos' }));
    await waitFor(() => expect(knowledgeService.addFavorite).toHaveBeenCalledWith('a2'));
    await waitFor(() => expect(JSON.parse(localStorage.getItem('kb:favorites:u1'))).toEqual(['a2']));
    fireEvent.click(screen.getByRole('tab', { name: 'Favoritos' }));
    expect(cardTitles()).toEqual(['Manual fiscal NFC-e']);
    fireEvent.click(screen.getByRole('button', { name: 'Remover "Manual fiscal NFC-e" dos favoritos' }));
    await waitFor(() => expect(screen.getByText('Nenhum favorito')).toBeInTheDocument());
  });

  it('Mais Acessados ordena por viewCount e oculta quem ainda não foi visto', async () => {
    knowledgeService.list.mockResolvedValue([
      { ...ARTICLES[0], viewCount: 2 },
      { ...ARTICLES[1], viewCount: 5 },
      { ...ARTICLES[2], viewCount: 0, active: true },
    ]);
    renderKb();
    await waitFor(() => expect(cardTitles()).toHaveLength(3));
    fireEvent.click(screen.getByRole('tab', { name: 'Mais Acessados' }));
    expect(cardTitles()).toEqual(['Manual fiscal NFC-e', 'Configurar impressora térmica']);
  });

  it('alterna entre grade e lista sem mudar os registros', async () => {
    renderKb();
    await waitFor(() => expect(cardTitles()).toHaveLength(2));
    fireEvent.click(screen.getByRole('button', { name: 'Exibir em lista' }));
    expect(document.querySelector('.kb-grid--list')).toBeInTheDocument();
    expect(cardTitles()).toHaveLength(2);
    expect(localStorage.getItem('kb:view:u1')).toBe('"list"');
    fireEvent.click(screen.getByRole('button', { name: 'Exibir em grade' }));
    expect(document.querySelector('.kb-grid--grid')).toBeInTheDocument();
  });

  it('seção Manuais mostra só conteúdos do tipo manual', async () => {
    renderKb('/app/knowledge/manuais');
    await waitFor(() => expect(cardTitles()).toEqual(['Manual fiscal NFC-e']));
    expect(screen.getByRole('button', { name: 'Manuais' })).toHaveAttribute('aria-current', 'page');
  });

  it('Tipos de Conteúdo navega para a seção do tipo', async () => {
    renderKb();
    await waitFor(() => expect(cardTitles()).toHaveLength(2));
    const types = screen.getByRole('heading', { name: /Tipos de Conteúdo/ }).closest('section');
    fireEvent.click(within(types).getByRole('button', { name: /Artigos/ }));
    await waitFor(() => expect(cardTitles()).toEqual(['Configurar impressora térmica']));
  });

  it('abre o conteúdo, registra no histórico e volta', async () => {
    renderKb();
    await waitFor(() => expect(cardTitles()).toHaveLength(2));
    fireEvent.click(screen.getByRole('button', { name: 'Manual fiscal NFC-e' }));
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Manual fiscal NFC-e', level: 2 })).toBeInTheDocument());
    expect(knowledgeService.get).toHaveBeenCalledWith('a2');
    expect(screen.getByText('nfce.pdf')).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem('kb:history:u1'))[0].id).toBe('a2');
    fireEvent.click(screen.getByRole('button', { name: /Voltar para a Central/ }));
    await waitFor(() => expect(cardTitles()).toHaveLength(2));
  });

  it('leitura: sem permissão de edição não mostra Editar/Excluir nem Acesso Rápido', async () => {
    renderKb('/app/knowledge/artigo/a1');
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Configurar impressora térmica', level: 2 })).toBeInTheDocument());
    expect(screen.queryByRole('button', { name: 'Editar conteúdo' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Excluir conteúdo' })).not.toBeInTheDocument();
    expect(screen.queryByText('Acesso Rápido')).not.toBeInTheDocument();
  });

  it('editor vê as quatro ações do Acesso Rápido e os botões de edição', async () => {
    authState.permissions = ['knowledge.read', 'knowledge.create', 'knowledge.update', 'knowledge.delete'];
    renderKb('/app/knowledge/artigo/a1');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Editar conteúdo' })).toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Excluir conteúdo' })).toBeInTheDocument();
    const quick = screen.getByRole('heading', { name: /Acesso Rápido/ }).closest('section');
    expect(within(quick).getAllByRole('button').map(b => b.textContent)).toEqual([
      'Criar Novo Artigo', 'Enviar Arquivo', 'Cadastrar Link', 'Gerenciar Categorias',
    ]);
  });

  it('só quem pode criar vê Criar/Enviar/Cadastrar', async () => {
    authState.permissions = ['knowledge.read', 'knowledge.update'];
    renderKb();
    await waitFor(() => expect(cardTitles().length).toBeGreaterThan(0));
    const quick = screen.getByRole('heading', { name: /Acesso Rápido/ }).closest('section');
    expect(within(quick).getAllByRole('button').map(b => b.textContent)).toEqual(['Gerenciar Categorias']);
  });

  it('Primeiros Passos mostra estado vazio quando não há conteúdo marcado', async () => {
    renderKb();
    await waitFor(() => expect(cardTitles()).toHaveLength(2));
    fireEvent.click(screen.getByRole('button', { name: /Primeiros Passos/ }));
    await waitFor(() => expect(screen.getByText('Nenhum material introdutório ainda')).toBeInTheDocument());
  });

  it('erro ao carregar oferece tentar novamente', async () => {
    knowledgeService.list.mockRejectedValueOnce(new Error('offline'));
    renderKb();
    await waitFor(() => expect(screen.getByText('Não foi possível carregar a Central')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    await waitFor(() => expect(cardTitles()).toHaveLength(2));
  });
});
