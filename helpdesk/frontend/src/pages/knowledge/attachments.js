import { knowledgeService } from '../../services/api';
import { fileKind } from './kbModel';

const INLINE_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/bmp'];
const blobCache = new Map();

function bytesFrom(base64) {
  const bin = atob(base64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

// Executáveis e tipos desconhecidos viram application/octet-stream: o navegador
// só baixa, nunca tenta abrir ou executar.
function safeMime(att) {
  const kind = fileKind(att);
  if (kind === 'pdf') return 'application/pdf';
  if (kind === 'image' && INLINE_IMAGE_TYPES.includes(att.mimeType)) return att.mimeType;
  if (kind === 'video' && /^video\/(mp4|webm|ogg)$/.test(att.mimeType)) return att.mimeType;
  if (kind === 'text') return 'text/plain;charset=utf-8';
  return 'application/octet-stream';
}

async function loadBlob(att, { inline = false } = {}) {
  if (att?.data) {
    return new Blob([bytesFrom(att.data)], { type: inline ? safeMime(att) : 'application/octet-stream' });
  }
  if (!att?.id) throw new Error('Anexo sem identificador');
  const key = `${att.id}:${inline ? 'i' : 'd'}`;
  if (blobCache.has(key)) return blobCache.get(key);
  const blob = await knowledgeService.fetchAttachment(att.id, { inline });
  const typed = inline
    ? new Blob([blob], { type: safeMime(att) })
    : new Blob([blob], { type: 'application/octet-stream' });
  blobCache.set(key, typed);
  return typed;
}

export function previewMode(att) {
  const kind = fileKind(att);
  if (kind === 'pdf') return 'pdf';
  if (kind === 'image' && INLINE_IMAGE_TYPES.includes(att.mimeType)) return 'image';
  if (kind === 'video' && /^video\/(mp4|webm|ogg)$/.test(att.mimeType)) return 'video';
  if (kind === 'text') return 'text';
  return null;
}

export function canPreview(att) {
  return Boolean(previewMode(att) && (att?.data || att?.id));
}

export function canDownload(att) {
  return Boolean(att?.data || att?.id || att?.hasContent);
}

export async function attachmentObjectUrl(att, { inline = true } = {}) {
  const blob = await loadBlob(att, { inline });
  return URL.createObjectURL(blob);
}

export async function attachmentText(att) {
  const blob = await loadBlob(att, { inline: true });
  return blob.text();
}

export async function downloadAttachment(att) {
  const blob = await loadBlob(att, { inline: false });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = att.name || 'arquivo';
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** @deprecated use attachmentObjectUrl — mantido para compat com base64 legado */
export function attachmentBlobUrl(att) {
  return URL.createObjectURL(new Blob([bytesFrom(att.data)], { type: safeMime(att) }));
}

/** @deprecated imagens agora carregam via download autenticado */
export function inlineImageSrc(att) {
  if (!att?.data || !INLINE_IMAGE_TYPES.includes(att.mimeType)) return null;
  return `data:${att.mimeType};base64,${att.data}`;
}
