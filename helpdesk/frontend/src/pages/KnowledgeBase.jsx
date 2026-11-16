import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ConfigProvider, Modal, Spin, message, theme as antdTheme } from 'antd';
import { knowledgeService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { MENU_ITEMS } from '../config/menuConfig';
import KbSidebar from './knowledge/KbSidebar';
import KbHeader from './knowledge/KbHeader';
import KbSearchBanner from './knowledge/KbSearchBanner';
import KbCategoryCards from './knowledge/KbCategoryCards';
import KbContentCard from './knowledge/KbContentCard';
import KbRightPanel from './knowledge/KbRightPanel';
import KbArticleView from './knowledge/KbArticleView';
import KbArticleForm from './knowledge/KbArticleForm';
import KbAiModal from './knowledge/KbAiModal';
import KbIcon from './knowledge/KbIcon';
import useKbPersonal from './knowledge/useKbPersonal';
import {
  CATEGORIES, CONTENT_TYPES, SECTIONS, describe, searchArticles, byDateDesc,
} from './knowledge/kbModel';
import './knowledge/knowledge.css';

const BASE = '/app/knowledge';

const KB_THEME = {
  inherit: false,
  algorithm: antdTheme.defaultAlgorithm,
  token: {
    colorPrimary: '#5b3df5',
    colorLink: '#5b3df5',
    borderRadius: 8,
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    colorText: '#11142d',
    colorTextSecondary: '#5b6078',
    colorBorder: '#e4e3f0',
  },
};

const TABS = [
  { key: 'recentes', label: 'Mais Recentes', icon: 'clock' },
  { key: 'acessados', label: 'Mais Acessados', icon: 'flame' },
  { key: 'favoritos', label: 'Favoritos', icon: 'star' },
];

const SECTION_INFO = {
  categorias: 'Selecione uma categoria para ver os conteúdos relacionados.',
  favoritos: 'Conteúdos marcados com estrela neste navegador.',
  historico: 'Conteúdos abertos recentemente neste navegador.',
  'primeiros-passos': 'Materiais introdutórios para quem está começando.',
};

function parsePath(splat = '') {
  const [first, second] = splat.split('/');
  if (first === 'artigo' && second) return { section: null, articleId: second };
  const known = SECTIONS.some(s => s.key === first) || first === 'primeiros-passos';
  return { section: known ? first : '', articleId: null };
}

function EmptyState({ icon = 'inbox', title, children }) {
  return (
    <div className="kb-empty" role="status">
      <span className="kb-empty-icon"><KbIcon name={icon} /></span>
      <strong>{title}</strong>
      {children && <p>{children}</p>}
    </div>
  );
}

export default function KnowledgeBase() {
  const params = useParams();
  const navigate = useNavigate();
  const { user, can, logout } = useAuth();
  const { section, articleId } = parsePath(params['*']);

  const canCreate = can('knowledge.create');
  const canUpdate = can('knowledge.update');
  const canDelete = can('knowledge.delete');

  const personal = useKbPersonal(user?.id);
  const { favorites, history, view, toggleFavorite, recordView, clearHistory, setView } = personal;

  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [query, setQuery] = useState('');
  const [committed, setCommitted] = useState('');
  const [category, setCategory] = useState(null);
  const [tab, setTab] = useState('recentes');
  const [menuOpen, setMenuOpen] = useState(false);
  const [formState, setFormState] = useState({ open: false, mode: 'article', editing: null });
  const [aiOpen, setAiOpen] = useState(false);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const exitPath = useMemo(
    () => MENU_ITEMS.find(m => m.key !== BASE && can(m.permission))?.key || null,
    [can],
  );

  const load = useCallback(() => {
    setLoading(true);
    setLoadError(false);
    return knowledgeService.list()
      .then(data => setArticles(Array.isArray(data) ? data : []))
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!articleId) { setDetail(null); return undefined; }
    let alive = true;
    setDetailLoading(true);
    knowledgeService.get(articleId)
      .then(a => { if (alive) { setDetail(a); recordView(a.id); } })
      .catch(() => { if (alive) setDetail(null); })
      .finally(() => { if (alive) setDetailLoading(false); });
    return () => { alive = false; };
  }, [articleId, recordView]);

  useEffect(() => { setMenuOpen(false); }, [section, articleId]);

  const go = useCallback((path) => {
    navigate(path ? `${BASE}/${path}` : BASE);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [navigate]);

  const items = useMemo(() => articles
    .filter(a => a.active !== false || canUpdate)
    .map(a => ({ article: a, meta: describe(a) })), [articles, canUpdate]);

  const sectionDef = SECTIONS.find(s => s.key === section);
  const sectionType = sectionDef?.type || null;

  const sectionItems = useMemo(() => {
    if (sectionType) return items.filter(i => i.meta.type === sectionType);
    if (section === 'favoritos') {
      return favorites.map(id => items.find(i => i.article.id === id)).filter(Boolean);
    }
    if (section === 'historico') {
      return history.map(h => items.find(i => i.article.id === h.id)).filter(Boolean);
    }
    if (section === 'primeiros-passos') return items.filter(i => i.meta.intro);
    return items;
  }, [items, section, sectionType, favorites, history]);

  const counts = useMemo(() => {
    const c = {};
    for (const i of sectionItems) c[i.meta.category.key] = (c[i.meta.category.key] || 0) + 1;
    return c;
  }, [sectionItems]);

  const ordered = section === 'favoritos' || section === 'historico';

  const visible = useMemo(() => {
    let list = category ? sectionItems.filter(i => i.meta.category.key === category) : sectionItems;
    if (committed) return searchArticles(list, committed);
    if (tab === 'favoritos') list = list.filter(i => favorites.includes(i.article.id));
    if (tab === 'acessados') return [];
    return ordered ? list : [...list].sort(byDateDesc);
  }, [sectionItems, category, committed, tab, favorites, ordered]);

  const submitSearch = (value) => {
    const q = (value ?? query).trim();
    setQuery(value ?? query);
    setCommitted(q);
    if (articleId) go('');
  };

  const clearSearch = () => {
    setQuery('');
    setCommitted('');
  };

  const changeQuery = (v) => {
    setQuery(v);
    if (!v.trim()) setCommitted('');
  };

  const openArticle = (id) => go(`artigo/${id}`);

  const quickActions = [
    canCreate && { key: 'article', label: 'Criar Novo Artigo', icon: 'plus' },
    canCreate && { key: 'file', label: 'Enviar Arquivo', icon: 'upload' },
    canCreate && { key: 'link', label: 'Cadastrar Link', icon: 'link' },
    (canCreate || canUpdate) && { key: 'categories', label: 'Gerenciar Categorias', icon: 'folder' },
  ].filter(Boolean);

  const onQuickAction = (key) => {
    if (key === 'categories') { go('categorias'); return; }
    setFormState({ open: true, mode: key, editing: null });
  };

  const handleSubmit = async (payload) => {
    try {
      if (formState.editing) {
        const updated = await knowledgeService.update(formState.editing.id, payload);
        message.success('Conteúdo atualizado');
        if (detail?.id === formState.editing.id) setDetail(await knowledgeService.get(updated.id));
      } else {
        const created = await knowledgeService.create(payload);
        message.success('Conteúdo cadastrado');
        setFormState({ open: false, mode: 'article', editing: null });
        await load();
        openArticle(created.id);
        return;
      }
      setFormState({ open: false, mode: 'article', editing: null });
      load();
    } catch (err) {
      message.error(err.response?.data?.error || 'Erro ao salvar o conteúdo');
      throw err;
    }
  };

  const confirmDelete = () => {
    if (!detail) return;
    Modal.confirm({
      title: 'Excluir conteúdo',
      content: `Deseja excluir "${detail.title}"? Os anexos vinculados também serão removidos. Esta ação não pode ser desfeita.`,
      okText: 'Excluir permanentemente',
      okButtonProps: { danger: true },
      cancelText: 'Cancelar',
      centered: true,
      onOk: async () => {
        try {
          await knowledgeService.remove(detail.id);
          message.success('Conteúdo excluído');
          await load();
          go('');
        } catch (err) {
          message.error(err.response?.data?.error || 'Erro ao excluir o conteúdo');
        }
      },
    });
  };

  const onType = (t) => go(section === t.section ? '' : t.section);

  const heading = articleId ? null : (section && section !== '' ? {
    title: section === 'primeiros-passos' ? 'Primeiros Passos' : sectionDef?.label,
    info: section === 'categorias' && (canCreate || canUpdate)
      ? `${SECTION_INFO.categorias} As categorias são fixas nesta versão; cadastrar novas depende de alteração no backend.`
      : SECTION_INFO[section] || CONTENT_TYPES.find(t => t.key === sectionType)?.detail?.replace(/[()]/g, ''),
  } : null);

  const renderList = () => {
    if (loading) {
      return <div className="kb-loading" role="status"><Spin /> <span>Carregando conteúdos...</span></div>;
    }
    if (loadError) {
      return (
        <EmptyState icon="alert" title="Não foi possível carregar a Central">
          <button type="button" className="kb-btn-primary" onClick={load}>Tentar novamente</button>
        </EmptyState>
      );
    }
    if (!committed && tab === 'acessados') {
      return (
        <EmptyState icon="flame" title="Em breve">
          A ordenação por mais acessados depende da contagem de visualizações no servidor, que ainda não existe.
        </EmptyState>
      );
    }
    if (visible.length === 0) {
      if (committed) {
        return (
          <EmptyState icon="search" title={`Nenhum resultado para "${committed}"`}>
            Tente outras palavras, menos termos ou{' '}
            <button type="button" className="kb-inline-link" onClick={() => setAiOpen(true)}>pergunte ao assistente de IA</button>.
          </EmptyState>
        );
      }
      if (section === 'primeiros-passos') {
        return (
          <EmptyState icon="rocket" title="Nenhum material introdutório ainda">
            {canUpdate ? 'Adicione a palavra-chave "primeiros passos" aos conteúdos que devem aparecer aqui.' : 'Os materiais introdutórios aparecerão aqui assim que forem publicados.'}
          </EmptyState>
        );
      }
      if (section === 'favoritos' || tab === 'favoritos') {
        return <EmptyState icon="star" title="Nenhum favorito">Use a estrela dos cartões para guardar conteúdos aqui.</EmptyState>;
      }
      if (section === 'historico') return <EmptyState icon="history" title="Nenhum conteúdo visto ainda" />;
      return <EmptyState title="Nenhum conteúdo encontrado">{category ? 'Não há conteúdos nesta categoria.' : null}</EmptyState>;
    }
    return (
      <div className={`kb-grid kb-grid--${view}`}>
        {visible.map(({ article, meta }) => (
          <KbContentCard
            key={article.id}
            article={article}
            meta={meta}
            layout={view}
            favorite={favorites.includes(article.id)}
            onToggleFavorite={toggleFavorite}
            onOpen={openArticle}
          />
        ))}
      </div>
    );
  };

  return (
    <ConfigProvider theme={KB_THEME}>
      <div className="kb-root">
        <KbSidebar
          section={articleId ? null : section}
          onNavigate={go}
          onExit={exitPath ? () => navigate(exitPath) : null}
          open={menuOpen}
          onClose={() => setMenuOpen(false)}
        />

        <div className="kb-shell">
          <KbHeader
            user={user}
            onMenu={() => setMenuOpen(true)}
            onExit={exitPath ? () => navigate(exitPath) : null}
            onLogout={logout}
          />

          <div className="kb-columns">
            <main className="kb-main" id="kb-main">
              {articleId ? (
                <KbArticleView
                  article={detail}
                  loading={detailLoading}
                  favorite={detail ? favorites.includes(detail.id) : false}
                  onToggleFavorite={toggleFavorite}
                  onBack={() => (window.history.length > 1 ? navigate(-1) : go(''))}
                  canUpdate={canUpdate}
                  canDelete={canDelete}
                  onEdit={() => setFormState({ open: true, mode: 'article', editing: detail })}
                  onDelete={confirmDelete}
                />
              ) : (
                <>
                  <KbSearchBanner
                    value={query}
                    onChange={changeQuery}
                    onSubmit={submitSearch}
                    onClear={clearSearch}
                    busy={loading && !!committed}
                  />

                  <KbCategoryCards counts={counts} selected={category} onSelect={setCategory} />

                  {heading && (
                    <div className="kb-section-head">
                      <div>
                        <h2>{heading.title}</h2>
                        {heading.info && <p>{heading.info}</p>}
                      </div>
                      {section === 'historico' && history.length > 0 && (
                        <button type="button" className="kb-btn-ghost" onClick={clearHistory}>Limpar histórico</button>
                      )}
                    </div>
                  )}

                  <div className="kb-toolbar">
                    <div className="kb-tabs" role="tablist" aria-label="Ordenação dos conteúdos">
                      {TABS.map(t => (
                        <button
                          key={t.key}
                          type="button"
                          role="tab"
                          aria-selected={!committed && tab === t.key}
                          className={`kb-tab${!committed && tab === t.key ? ' is-active' : ''}`}
                          onClick={() => { setTab(t.key); setCommitted(''); }}
                        >
                          <KbIcon name={t.icon} />
                          <span>{t.label}</span>
                        </button>
                      ))}
                    </div>
                    <div className="kb-views" role="group" aria-label="Visualização">
                      <button type="button" className={`kb-view${view === 'grid' ? ' is-active' : ''}`} aria-pressed={view === 'grid'}
                        aria-label="Exibir em grade" onClick={() => setView('grid')}><KbIcon name="grid" /></button>
                      <button type="button" className={`kb-view${view === 'list' ? ' is-active' : ''}`} aria-pressed={view === 'list'}
                        aria-label="Exibir em lista" onClick={() => setView('list')}><KbIcon name="list" /></button>
                    </div>
                  </div>

                  {(committed || category) && !loading && (
                    <div className="kb-results" aria-live="polite">
                      <span>
                        {visible.length} {visible.length === 1 ? 'resultado' : 'resultados'}
                        {committed && <> para <strong>"{committed}"</strong></>}
                        {category && <> em <strong>{CATEGORIES.find(c => c.key === category)?.label}</strong></>}
                      </span>
                      {committed && (
                        <button type="button" className="kb-inline-link" onClick={() => setAiOpen(true)}>
                          <KbIcon name="sparkles" /> Perguntar à IA
                        </button>
                      )}
                      <button type="button" className="kb-inline-link" onClick={() => { clearSearch(); setCategory(null); }}>
                        <KbIcon name="x" /> Limpar filtros
                      </button>
                    </div>
                  )}

                  {renderList()}
                </>
              )}
            </main>

            <KbRightPanel
              actions={quickActions}
              onAction={onQuickAction}
              onIntro={() => go('primeiros-passos')}
              onType={onType}
              activeType={sectionType}
            />
          </div>
        </div>

        <KbArticleForm
          open={formState.open}
          mode={formState.mode}
          editing={formState.editing}
          onCancel={() => setFormState({ open: false, mode: 'article', editing: null })}
          onSubmit={handleSubmit}
        />
        <KbAiModal open={aiOpen} initialQuestion={committed || query} onClose={() => setAiOpen(false)} onOpenArticle={openArticle} />
      </div>
    </ConfigProvider>
  );
}
