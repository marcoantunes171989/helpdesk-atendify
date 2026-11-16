import { normalize } from '../../utils/constants';

// Fallback local (Etapa B): usado se a API de categorias ainda não estiver
// disponível. `sources` mapeia o enum legado KbCategory.
export const CATEGORIES = [
  { key: 'configuracoes', label: 'Configurações', icon: 'settings', tone: 'purple', sources: ['CONFIGURACAO'] },
  { key: 'treinamentos', label: 'Treinamentos', icon: 'graduation', tone: 'blue', sources: [] },
  { key: 'operacao', label: 'Operação do Sistema', icon: 'monitor', tone: 'green', sources: [] },
  { key: 'equipamentos', label: 'Equipamentos', icon: 'printer', tone: 'orange', sources: [] },
  { key: 'fiscal', label: 'Fiscal', icon: 'fileText', tone: 'red', sources: [] },
  { key: 'outros', label: 'Outros', icon: 'layers', tone: 'sky', sources: ['DUVIDA', 'ERRO'] },
];

export const CATEGORY_ICON_OPTIONS = [
  'settings', 'graduation', 'monitor', 'printer', 'fileText', 'layers',
  'bookOpen', 'download', 'link', 'star', 'folder', 'sparkles',
];

export const CATEGORY_TONE_OPTIONS = ['purple', 'blue', 'green', 'orange', 'red', 'sky', 'violet', 'amber', 'indigo'];

/** @deprecated preferir categoryId / categoryRef (Etapa B) */
export const BACKEND_CATEGORIES = [
  { value: 'CONFIGURACAO', label: 'Configuração' },
  { value: 'DUVIDA', label: 'Dúvida' },
  { value: 'ERRO', label: 'Erro' },
];

export const BACKEND_CATEGORY_LABEL = Object.fromEntries(BACKEND_CATEGORIES.map(c => [c.value, c.label]));

export function normalizeCategory(row) {
  if (!row) return null;
  return {
    id: row.id,
    key: row.key,
    label: row.label,
    icon: row.icon || 'layers',
    tone: row.tone || 'sky',
    sortOrder: row.sortOrder ?? 0,
    active: row.active !== false,
    articleCount: row._count?.articles ?? row.articleCount ?? 0,
    sources: row.sources || [],
  };
}

export function categoryOf(article, catalog = CATEGORIES) {
  if (article?.categoryRef?.key) {
    const fromCatalog = catalog.find(c => c.key === article.categoryRef.key || c.id === article.categoryRef.id);
    return normalizeCategory(fromCatalog || article.categoryRef);
  }
  if (article?.categoryId) {
    const byId = catalog.find(c => c.id === article.categoryId);
    if (byId) return normalizeCategory(byId);
  }
  const legacy = catalog.find(c => (c.sources || []).includes(article?.category));
  return normalizeCategory(legacy || catalog[catalog.length - 1] || CATEGORIES[CATEGORIES.length - 1]);
}

export const CONTENT_TYPES = [
  { key: 'artigo', label: 'Artigos', detail: '(Textos e Guias)', icon: 'fileText', section: 'artigos' },
  { key: 'manual', label: 'Manuais', detail: '(PDF e Documentos)', icon: 'bookOpen', section: 'manuais' },
  { key: 'video', label: 'Vídeos', detail: '(Tutoriais)', icon: 'monitorPlay', section: 'tutoriais' },
  { key: 'download', label: 'Downloads', detail: '(EXE, ZIP, Arquivos)', icon: 'download', section: 'downloads' },
  { key: 'link', label: 'Links', detail: '(Sites e Integrações)', icon: 'link', section: 'links' },
];

export const SECTIONS = [
  { key: '', label: 'Início', icon: 'home' },
  { key: 'artigos', label: 'Artigos', icon: 'fileText', type: 'artigo' },
  { key: 'manuais', label: 'Manuais', icon: 'bookOpen', type: 'manual' },
  { key: 'tutoriais', label: 'Tutoriais (Vídeos)', icon: 'monitorPlay', type: 'video' },
  { key: 'downloads', label: 'Downloads', icon: 'download', type: 'download' },
  { key: 'links', label: 'Links Úteis', icon: 'link', type: 'link' },
  { key: 'categorias', label: 'Categorias', icon: 'layers' },
  { key: 'favoritos', label: 'Favoritos', icon: 'star' },
  { key: 'historico', label: 'Histórico', icon: 'clock' },
];

// Classificação explícita por tag — permite ao autor definir o tipo hoje,
// sem coluna nova no banco.
const TYPE_TAGS = {
  artigo: 'artigo', artigos: 'artigo', guia: 'artigo',
  manual: 'manual', manuais: 'manual', documento: 'manual',
  video: 'video', videos: 'video', tutorial: 'video', tutoriais: 'video',
  download: 'download', downloads: 'download', arquivo: 'download',
  link: 'link', links: 'link', site: 'link',
};

const INTRO_TAGS = ['primeiros passos', 'introducao', 'onboarding', 'iniciante', 'comece por aqui'];

const URL_RE = /https?:\/\/[^\s<>"')\]]+/gi;
const VIDEO_HOST_RE = /(youtube\.com|youtu\.be|vimeo\.com|loom\.com)/i;

export function splitTags(tags) {
  return (tags || '').split(',').map(t => t.trim()).filter(Boolean);
}

export function extractUrls(text) {
  return Array.from(new Set((text || '').match(URL_RE) || []));
}

export function fileExt(name = '') {
  const m = /\.([a-z0-9]+)$/i.exec(name);
  return m ? m[1].toLowerCase() : '';
}

// Classifica um anexo por mimeType + extensão (o mimeType vem do navegador de
// quem enviou e pode estar vazio ou genérico).
export function fileKind({ mimeType = '', name = '' } = {}) {
  const ext = fileExt(name);
  const mt = mimeType.toLowerCase();
  if (mt.includes('pdf') || ext === 'pdf') return 'pdf';
  if (['exe', 'msi'].includes(ext) || mt.includes('msdownload') || mt.includes('x-msi')) return 'exe';
  if (['zip', 'rar', '7z'].includes(ext) || /zip|rar|compressed|7z/.test(mt)) return 'zip';
  if (['xls', 'xlsx', 'csv'].includes(ext) || /sheet|excel|csv/.test(mt)) return 'sheet';
  if (['doc', 'docx', 'odt', 'rtf'].includes(ext) || /word|opendocument\.text|rtf/.test(mt)) return 'doc';
  if (mt.startsWith('video/') || ['mp4', 'webm', 'mov'].includes(ext)) return 'video';
  if (mt.startsWith('image/') || ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp'].includes(ext)) return 'image';
  if (mt.startsWith('text/') || ext === 'txt') return 'text';
  return 'file';
}

export const FILE_KIND_LABEL = {
  pdf: 'PDF', exe: 'Executável', zip: 'Arquivo compactado', sheet: 'Planilha', doc: 'Documento Word',
  video: 'Vídeo', image: 'Imagem', text: 'Texto', file: 'Arquivo',
};

function explicitType(tags) {
  for (const t of tags) {
    const type = TYPE_TAGS[normalize(t)];
    if (type) return type;
  }
  return null;
}

// Deriva tipo, formato e ícone do conteúdo a partir dos dados existentes
// (tags, anexos e links do texto). Não altera o registro.
export function describe(article) {
  const tags = splitTags(article.tags);
  const kinds = (article.attachments || []).map(fileKind);
  const urls = extractUrls(article.content);
  const videoUrl = urls.find(u => VIDEO_HOST_RE.test(u)) || null;
  const plain = (article.content || '').replace(URL_RE, '').trim();

  let type = explicitType(tags);
  if (!type) {
    if (kinds.includes('video') || videoUrl) type = 'video';
    else if (kinds.includes('pdf') || kinds.includes('doc')) type = 'manual';
    else if (kinds.some(k => ['exe', 'zip', 'sheet'].includes(k))) type = 'download';
    else if (urls.length > 0 && plain.length <= 280) type = 'link';
    else type = 'artigo';
  }

  let format;
  let icon;
  if (type === 'video') { format = 'Vídeo'; icon = 'video'; }
  else if (type === 'link') { format = 'Link Externo'; icon = 'link'; }
  else if (type === 'manual') {
    format = kinds.includes('pdf') ? 'PDF' : 'Manual';
    icon = kinds.includes('pdf') ? 'pdf' : 'manual';
  } else if (type === 'download') {
    if (kinds.includes('exe')) { format = 'Executável'; icon = 'exe'; }
    else { format = 'Download'; icon = kinds.includes('zip') ? 'zip' : kinds.includes('sheet') ? 'sheet' : 'download'; }
  } else { format = 'Artigo'; icon = 'article'; }

  const introTag = tags.some(t => INTRO_TAGS.includes(normalize(t)));

  return {
    type, format, icon, tags, urls, videoUrl, intro: introTag,
    category: categoryOf(article, article._categoryCatalog || CATEGORIES),
    summary: summarize(article.content),
    date: article.updatedAt || article.createdAt,
  };
}

export function describeWithCatalog(article, catalog) {
  return describe({ ...article, _categoryCatalog: catalog });
}

export function summarize(content, max = 140) {
  const text = (content || '').replace(URL_RE, '').replace(/\s+/g, ' ').trim();
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  return `${cut.slice(0, cut.lastIndexOf(' ') > 80 ? cut.lastIndexOf(' ') : max).trim()}…`;
}

const MONTHS = ['jan.', 'fev.', 'mar.', 'abr.', 'mai.', 'jun.', 'jul.', 'ago.', 'set.', 'out.', 'nov.', 'dez.'];

export function formatDate(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatSize(bytes = 0) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1).replace('.', ',')} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`;
}

// Busca local: todas as palavras precisam aparecer (parcialmente, sem acento)
// em algum campo; título e tags pesam mais na ordenação.
export function searchArticles(items, query) {
  const tokens = normalize(query || '').split(/\s+/).filter(t => t.length >= 2);
  if (tokens.length === 0) return items;
  const scored = [];
  for (const item of items) {
    const { article, meta } = item;
    const fields = [
      [normalize(article.title), 6],
      [normalize(meta.tags.join(' ')), 4],
      [normalize(`${meta.category.label} ${BACKEND_CATEGORY_LABEL[article.category] || ''}`), 3],
      [normalize(`${meta.format} ${CONTENT_TYPES.find(t => t.key === meta.type)?.label || ''}`), 2],
      [normalize((article.attachments || []).map(a => a.name).join(' ')), 2],
      [normalize(article.content), 1],
    ];
    let score = 0;
    let all = true;
    for (const token of tokens) {
      let hit = 0;
      for (const [text, weight] of fields) if (text.includes(token)) hit += weight;
      if (!hit) { all = false; break; }
      score += hit;
    }
    if (all) scored.push({ item, score });
  }
  return scored
    .sort((a, b) => b.score - a.score || byDateDesc(a.item, b.item))
    .map(s => s.item);
}

export function byDateDesc(a, b) {
  return new Date(b.meta.date || 0) - new Date(a.meta.date || 0);
}

export function initials(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return ((parts[0][0] || '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

const YT_RE = /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/i;
const VIMEO_RE = /vimeo\.com\/(?:video\/)?(\d+)/i;
const LOOM_RE = /loom\.com\/(?:share|embed)\/([a-f0-9]+)/i;

// Monta a URL de incorporação apenas para provedores conhecidos, a partir do ID
// extraído — nunca incorpora a URL original diretamente.
export function videoEmbedUrl(url) {
  if (!url) return null;
  let m = YT_RE.exec(url);
  if (m) return `https://www.youtube-nocookie.com/embed/${m[1]}`;
  m = VIMEO_RE.exec(url);
  if (m) return `https://player.vimeo.com/video/${m[1]}`;
  m = LOOM_RE.exec(url);
  if (m) return `https://www.loom.com/embed/${m[1]}`;
  return null;
}

export const URL_SPLIT_RE = /(https?:\/\/[^\s<>"')\]]+)/gi;
