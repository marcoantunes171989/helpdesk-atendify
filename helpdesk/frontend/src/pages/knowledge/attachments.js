import { fileKind } from './kbModel';

const INLINE_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/bmp'];

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

export function attachmentBlobUrl(att) {
  return URL.createObjectURL(new Blob([bytesFrom(att.data)], { type: safeMime(att) }));
}

export function inlineImageSrc(att) {
  if (!att?.data || !INLINE_IMAGE_TYPES.includes(att.mimeType)) return null;
  return `data:${att.mimeType};base64,${att.data}`;
}

export function attachmentText(att) {
  return new TextDecoder('utf-8').decode(bytesFrom(att.data));
}

export function downloadAttachment(att) {
  const url = URL.createObjectURL(new Blob([bytesFrom(att.data)], { type: 'application/octet-stream' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = att.name;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function previewMode(att) {
  const kind = fileKind(att);
  if (kind === 'pdf') return 'pdf';
  if (kind === 'image' && INLINE_IMAGE_TYPES.includes(att.mimeType)) return 'image';
  if (kind === 'video' && /^video\/(mp4|webm|ogg)$/.test(att.mimeType)) return 'video';
  if (kind === 'text') return 'text';
  return null;
}
