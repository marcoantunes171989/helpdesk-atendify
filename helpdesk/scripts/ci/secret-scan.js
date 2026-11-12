#!/usr/bin/env node
/**
 * Gate 07 — verifica ausencia de segredos commitados no escopo do Atendexa.
 * Roda tanto localmente (pre-commit manual) quanto no CI.
 * Falha (exit 1) se encontrar indicios de segredo; nao tenta "corrigir" nada.
 */
const { execSync } = require('child_process');
const path = require('path');

const REPO_ROOT = execSync('git rev-parse --show-toplevel').toString().trim();
const SCOPE = 'helpdesk';

// .env.example / .env.sample / .env.template são templates legítimos para versionar
// (sem segredos reais) — qualquer outro .env* é proibido.
const ALLOWED_ENV_FILENAME = /(^|\/)\.env\.(example|sample|template)$/;

const FORBIDDEN_TRACKED_PATTERNS = [
  /(^|\/)\.env$/,
  /(^|\/)\.env\.[^.]+$/,
  /\.dump$/,
  /\.sql\.gz$/,
];

const SECRET_LINE_PATTERNS = [
  { name: 'DATABASE_URL com credenciais', re: /DATABASE_URL\s*=\s*["']?postgres(ql)?:\/\/[^"'\s]+:[^"'\s@]+@/i },
  { name: 'JWT_SECRET hardcoded (nao vazio)', re: /JWT_SECRET\s*=\s*["']?[A-Za-z0-9+/_-]{8,}["']?/ },
  { name: 'Chave privada PEM', re: /-----BEGIN (RSA |EC |DSA |OPENSSH |ENCRYPTED )?PRIVATE KEY-----/ },
  { name: 'Token Supabase/service_role', re: /service_role[^\n]{0,20}eyJ[A-Za-z0-9_-]{10,}/i },
];

function trackedFilesInScope() {
  // --cached (rastreados) + --others --exclude-standard (novos, ainda nao
  // adicionados ao index, respeitando .gitignore) — sem isso, arquivos novos
  // de uma tarefa em andamento (ex.: os proprios artefatos desta CI antes do
  // primeiro commit) ficariam invisiveis ao scan local pre-commit.
  return execSync(`git ls-files --cached --others --exclude-standard -- ${SCOPE}`, { cwd: REPO_ROOT })
    .toString()
    .split('\n')
    .filter(Boolean);
}

function main() {
  let failed = false;

  const tracked = trackedFilesInScope();

  for (const file of tracked) {
    if (ALLOWED_ENV_FILENAME.test(file)) continue;
    for (const pattern of FORBIDDEN_TRACKED_PATTERNS) {
      if (pattern.test(file)) {
        console.error(`[SECRET-SCAN] Arquivo proibido rastreado pelo Git: ${file}`);
        failed = true;
      }
    }
  }

  // Varre o conteudo apenas dos arquivos de texto rastreados (ignora binarios/imagens/dist
  // e os templates .env.example/.sample/.template, que sao placeholders, nao segredos).
  const textFiles = tracked.filter(
    (f) => !/\.(png|jpg|jpeg|gif|webp|ico|woff2?|ttf|pdf)$/i.test(f) && !ALLOWED_ENV_FILENAME.test(f)
  );

  for (const file of textFiles) {
    let content;
    // Le do disco primeiro: cobre tanto o modo local (working tree com
    // alteracoes ainda nao commitadas, inclusive nao staged) quanto o CI
    // (disco == HEAD apos o checkout). Ler de `git show HEAD` primeiro
    // mascararia segredos adicionados a um arquivo ja rastreado antes do commit.
    try {
      content = require('fs').readFileSync(path.join(REPO_ROOT, file), 'utf8');
    } catch {
      // Arquivo rastreado mas ausente no disco (ex.: removido localmente); cai para HEAD.
      try {
        content = execSync(`git show HEAD:"${file}"`, { cwd: REPO_ROOT, maxBuffer: 1024 * 1024 * 20 }).toString();
      } catch {
        continue;
      }
    }

    for (const { name, re } of SECRET_LINE_PATTERNS) {
      if (re.test(content)) {
        console.error(`[SECRET-SCAN] Possivel segredo (${name}) em: ${file}`);
        failed = true;
      }
    }
  }

  if (failed) {
    console.error('[SECRET-SCAN] FALHOU — corrigir antes de publicar.');
    process.exit(1);
  }

  console.log(`[SECRET-SCAN] OK — ${tracked.length} arquivos rastreados em ${SCOPE}/ verificados, nenhum segredo encontrado.`);
}

main();
