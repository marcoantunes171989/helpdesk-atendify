const crypto = require('crypto');
const path = require('path');

const MAX_SIZE = 10 * 1024 * 1024;

const ALLOWED = {
  '.pdf': { mime: ['application/pdf'], magic: [[0x25, 0x50, 0x44, 0x46]] }, // %PDF
  '.txt': { mime: ['text/plain'], magic: null },
  '.csv': { mime: ['text/csv', 'text/plain', 'application/vnd.ms-excel'], magic: null },
  '.doc': { mime: ['application/msword'], magic: null },
  '.docx': {
    mime: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/zip'],
    magic: [[0x50, 0x4b, 0x03, 0x04]],
  },
  '.xls': { mime: ['application/vnd.ms-excel'], magic: null },
  '.xlsx': {
    mime: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/zip'],
    magic: [[0x50, 0x4b, 0x03, 0x04]],
  },
  '.png': { mime: ['image/png'], magic: [[0x89, 0x50, 0x4e, 0x47]] },
  '.jpg': { mime: ['image/jpeg'], magic: [[0xff, 0xd8, 0xff]] },
  '.jpeg': { mime: ['image/jpeg'], magic: [[0xff, 0xd8, 0xff]] },
  '.zip': { mime: ['application/zip', 'application/x-zip-compressed'], magic: [[0x50, 0x4b, 0x03, 0x04], [0x50, 0x4b, 0x05, 0x06]] },
  '.rar': { mime: ['application/vnd.rar', 'application/x-rar-compressed', 'application/octet-stream'], magic: [[0x52, 0x61, 0x72, 0x21]] },
};

const EXECUTABLE_EXT = new Set(['.exe', '.msi', '.bat', '.cmd', '.ps1', '.scr', '.com']);
const BLOCKED_INLINE = new Set(['.svg', '.html', '.htm', '.xhtml', '.js']);

function sanitizeFileName(name) {
  const base = path.basename(String(name || 'arquivo')).replace(/[^\w.\- ()[\]]+/g, '_').slice(0, 180);
  return base || 'arquivo';
}

function fileExt(name) {
  const m = String(name || '').toLowerCase().match(/(\.[a-z0-9]+)$/);
  return m ? m[1] : '';
}

function decodeBase64(data) {
  if (typeof data !== 'string' || !data) throw new Error('Arquivo sem conteúdo');
  const cleaned = data.replace(/^data:[^;]+;base64,/, '');
  return Buffer.from(cleaned, 'base64');
}

function matchesMagic(buf, patterns) {
  if (!patterns) return true;
  return patterns.some((sig) => sig.every((b, i) => buf[i] === b));
}

function isExecutableName(name) {
  return EXECUTABLE_EXT.has(fileExt(name));
}

/**
 * Valida um anexo enviado no body JSON (name, mimeType, size, data base64).
 * Retorna { name, mimeType, size, buffer, sha256, executable }.
 */
function validateAttachmentInput(raw) {
  if (!raw || typeof raw !== 'object') {
    const err = new Error('Anexo inválido');
    err.status = 400;
    throw err;
  }

  const name = sanitizeFileName(raw.name);
  const ext = fileExt(name);
  if (!ext) {
    const err = new Error('Arquivo sem extensão');
    err.status = 400;
    throw err;
  }
  if (BLOCKED_INLINE.has(ext)) {
    const err = new Error(`Tipo de arquivo não permitido: ${ext}`);
    err.status = 400;
    throw err;
  }
  if (EXECUTABLE_EXT.has(ext)) {
    const err = new Error('Envio de executáveis não é permitido nesta versão. Use ZIP se necessário.');
    err.status = 400;
    throw err;
  }

  const rule = ALLOWED[ext];
  if (!rule) {
    const err = new Error(`Extensão não permitida: ${ext}. Use PDF, Office, imagem, TXT/CSV ou ZIP/RAR.`);
    err.status = 400;
    throw err;
  }

  const buffer = decodeBase64(raw.data);
  const size = buffer.length;
  if (size === 0) {
    const err = new Error('Arquivo vazio');
    err.status = 400;
    throw err;
  }
  if (size > MAX_SIZE) {
    const err = new Error(`Arquivo excede o limite de ${Math.floor(MAX_SIZE / 1024 / 1024)}MB`);
    err.status = 413;
    throw err;
  }
  if (typeof raw.size === 'number' && Math.abs(raw.size - size) > 64) {
    const err = new Error('Tamanho do arquivo não confere com o conteúdo');
    err.status = 400;
    throw err;
  }
  if (!matchesMagic(buffer, rule.magic)) {
    const err = new Error(`Conteúdo do arquivo não corresponde à extensão ${ext}`);
    err.status = 400;
    throw err;
  }

  const mimeType = rule.mime.includes(raw.mimeType) ? raw.mimeType : rule.mime[0];
  const sha256 = crypto.createHash('sha256').update(buffer).digest('hex');

  return { name, mimeType, size, buffer, sha256, executable: false };
}

function safeResponseMime(att) {
  const ext = fileExt(att.name);
  if (EXECUTABLE_EXT.has(ext)) return 'application/octet-stream';
  if (BLOCKED_INLINE.has(ext)) return 'application/octet-stream';
  if (ext === '.pdf') return 'application/pdf';
  if (ext === '.png') return 'image/png';
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.txt' || ext === '.csv') return 'text/plain; charset=utf-8';
  if (/^image\/(png|jpeg|gif|webp|bmp)$/.test(att.mimeType)) return att.mimeType;
  if (/^video\/(mp4|webm|ogg)$/.test(att.mimeType)) return att.mimeType;
  return 'application/octet-stream';
}

function canInline(att) {
  const ext = fileExt(att.name);
  if (EXECUTABLE_EXT.has(ext) || BLOCKED_INLINE.has(ext)) return false;
  const mime = safeResponseMime(att);
  return mime.startsWith('image/') || mime === 'application/pdf' || mime.startsWith('text/') || mime.startsWith('video/');
}

module.exports = {
  MAX_SIZE,
  ALLOWED,
  sanitizeFileName,
  fileExt,
  validateAttachmentInput,
  isExecutableName,
  safeResponseMime,
  canInline,
};
