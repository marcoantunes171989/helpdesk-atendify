/**
 * Storage opcional via Supabase Storage REST API.
 * Ativo somente com SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.
 * Sem essas variáveis, os anexos continuam em base64 na coluna data.
 */

const BUCKET = process.env.KB_STORAGE_BUCKET || 'kb-files';

function enabled() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function baseUrl() {
  return String(process.env.SUPABASE_URL).replace(/\/$/, '');
}

function headers(extra = {}) {
  return {
    Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
    apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    ...extra,
  };
}

function objectPath(articleId, fileName) {
  const safe = String(fileName || 'file').replace(/[^\w.\-]+/g, '_').slice(0, 120);
  return `${articleId}/${Date.now()}-${safe}`;
}

async function upload(articleId, fileName, buffer, mimeType) {
  if (!enabled()) return null;
  const storagePath = objectPath(articleId, fileName);
  const url = `${baseUrl()}/storage/v1/object/${BUCKET}/${storagePath}`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: headers({
      'Content-Type': mimeType || 'application/octet-stream',
      'x-upsert': 'false',
    }),
    body: buffer,
  });
  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    throw new Error(`Falha ao enviar arquivo ao Storage (${resp.status}): ${text.slice(0, 200)}`);
  }
  return storagePath;
}

async function download(storagePath) {
  if (!enabled()) throw new Error('Storage não configurado');
  const url = `${baseUrl()}/storage/v1/object/authenticated/${BUCKET}/${storagePath}`;
  const resp = await fetch(url, { headers: headers() });
  if (!resp.ok) {
    // Fallback: endpoint interno com service role
    const url2 = `${baseUrl()}/storage/v1/object/${BUCKET}/${storagePath}`;
    const resp2 = await fetch(url2, { headers: headers() });
    if (!resp2.ok) {
      const text = await resp2.text().catch(() => '');
      throw new Error(`Falha ao baixar do Storage (${resp2.status}): ${text.slice(0, 200)}`);
    }
    return Buffer.from(await resp2.arrayBuffer());
  }
  return Buffer.from(await resp.arrayBuffer());
}

async function remove(storagePath) {
  if (!enabled() || !storagePath) return;
  const url = `${baseUrl()}/storage/v1/object/${BUCKET}`;
  try {
    await fetch(url, {
      method: 'DELETE',
      headers: headers({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ prefixes: [storagePath] }),
    });
  } catch (err) {
    console.error('[kbStorage.remove]', err.message);
  }
}

module.exports = {
  BUCKET,
  enabled,
  upload,
  download,
  remove,
};
