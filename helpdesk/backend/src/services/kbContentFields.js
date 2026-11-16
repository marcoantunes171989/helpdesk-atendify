const CONTENT_TYPES = new Set(['ARTIGO', 'MANUAL', 'VIDEO', 'DOWNLOAD', 'LINK']);

const ALIASES = {
  ARTIGO: 'ARTIGO',
  ARTICLE: 'ARTIGO',
  artigo: 'ARTIGO',
  MANUAL: 'MANUAL',
  manual: 'MANUAL',
  VIDEO: 'VIDEO',
  video: 'VIDEO',
  DOWNLOAD: 'DOWNLOAD',
  download: 'DOWNLOAD',
  LINK: 'LINK',
  link: 'LINK',
};

function normalizeContentType(value) {
  if (value == null || value === '') return null;
  const normalized = ALIASES[value] || ALIASES[String(value).trim().toUpperCase()] || null;
  if (!normalized || !CONTENT_TYPES.has(normalized)) {
    const err = new Error('Tipo de conteúdo inválido. Use ARTIGO, MANUAL, VIDEO, DOWNLOAD ou LINK.');
    err.status = 400;
    throw err;
  }
  return normalized;
}

function contentTypeFromMode(mode) {
  if (mode === 'link') return 'LINK';
  if (mode === 'file') return 'DOWNLOAD';
  if (mode === 'article') return 'ARTIGO';
  return null;
}

/**
 * Aceita apenas https://. Rejeita javascript:, data:, file:, etc.
 */
function normalizeExternalUrl(value, { required = false } = {}) {
  if (value == null || String(value).trim() === '') {
    if (required) {
      const err = new Error('URL externa é obrigatória para este tipo');
      err.status = 400;
      throw err;
    }
    return null;
  }
  const trimmed = String(value).trim();
  let parsed;
  try {
    parsed = new URL(trimmed);
  } catch {
    const err = new Error('URL externa inválida');
    err.status = 400;
    throw err;
  }
  if (parsed.protocol !== 'https:') {
    const err = new Error('A URL externa deve começar com https://');
    err.status = 400;
    throw err;
  }
  if (parsed.username || parsed.password) {
    const err = new Error('URL externa não pode conter credenciais');
    err.status = 400;
    throw err;
  }
  return parsed.toString();
}

/**
 * Resolve campos da Etapa C a partir do body.
 * @param {object} body
 * @param {{ patch?: boolean }} opts patch=true só aplica campos enviados
 */
function resolveContentFields(body = {}, { patch = false } = {}) {
  const out = {};

  if (body.contentType !== undefined) {
    out.contentType = normalizeContentType(body.contentType);
  } else if (!patch) {
    const fromMode = contentTypeFromMode(body.mode);
    if (fromMode) out.contentType = fromMode;
  }

  const effectiveType = out.contentType !== undefined
    ? out.contentType
    : (body.contentType !== undefined ? normalizeContentType(body.contentType) : null);

  if (body.externalUrl !== undefined) {
    out.externalUrl = normalizeExternalUrl(body.externalUrl, {
      required: effectiveType === 'LINK' || body.contentType === 'LINK' || body.mode === 'link',
    });
  } else if (!patch && (out.contentType === 'LINK' || body.mode === 'link') && body.content) {
    const match = String(body.content).match(/https:\/\/[^\s<>"')\]]+/i);
    if (match) out.externalUrl = normalizeExternalUrl(match[0]);
  }

  if (body.featured !== undefined) {
    out.featured = Boolean(body.featured);
  } else if (!patch) {
    out.featured = false;
  }

  return out;
}

module.exports = {
  CONTENT_TYPES,
  normalizeContentType,
  normalizeExternalUrl,
  contentTypeFromMode,
  resolveContentFields,
};
