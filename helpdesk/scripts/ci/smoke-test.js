#!/usr/bin/env node
/**
 * Smoke test pos-deploy — somente leitura, nao destrutivo.
 * Nao cria, altera ou exclui nenhum dado. Nao faz login real (sem credenciais).
 * Uso: node helpdesk/scripts/ci/smoke-test.js
 *
 * Variaveis opcionais:
 *   ATENDEXA_FRONTEND_URL (default https://www.atendexa.com.br)
 *   ATENDEXA_API_URL      (default https://helpdesk-atendify.onrender.com)
 */

const FRONTEND_URL = process.env.ATENDEXA_FRONTEND_URL || 'https://www.atendexa.com.br';
const API_URL = process.env.ATENDEXA_API_URL || 'https://helpdesk-atendify.onrender.com';
const TIMEOUT_MS = 15000;

async function check(name, url, { expectStatus = 200, expectJson = false } = {}) {
  const started = Date.now();
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    const res = await fetch(url, { signal: controller.signal, redirect: 'follow' });
    clearTimeout(timer);
    const ms = Date.now() - started;

    const ok = res.status === expectStatus;
    let detail = `HTTP ${res.status} em ${ms}ms`;

    if (ok && expectJson) {
      try {
        const body = await res.json();
        detail += ` — body: ${JSON.stringify(body)}`;
      } catch {
        return { name, ok: false, detail: `${detail} — esperava JSON e nao recebeu` };
      }
    }

    return { name, ok, detail };
  } catch (e) {
    return { name, ok: false, detail: `Erro: ${e.message}` };
  }
}

async function main() {
  console.log(`Frontend: ${FRONTEND_URL}`);
  console.log(`API:      ${API_URL}\n`);

  const results = await Promise.all([
    check('Frontend carrega (domínio oficial)', FRONTEND_URL, { expectStatus: 200 }),
    check('API /health responde', `${API_URL}/health`, { expectStatus: 200, expectJson: true }),
    // Rota protegida sem token deve responder 401 (nao 500/indisponivel) — nao cria/le dados reais.
    check('API rejeita rota protegida sem token (401 esperado)', `${API_URL}/api/users`, { expectStatus: 401 }),
  ]);

  let failed = false;
  for (const r of results) {
    console.log(`${r.ok ? 'PASS' : 'FAIL'} — ${r.name}: ${r.detail}`);
    if (!r.ok) failed = true;
  }

  if (failed) {
    console.error('\nSMOKE TEST FALHOU — ver itens FAIL acima. Nao declarar deploy como validado.');
    process.exit(1);
  }
  console.log('\nSMOKE TEST OK — frontend e API respondendo como esperado.');
}

main();
