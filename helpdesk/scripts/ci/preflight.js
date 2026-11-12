#!/usr/bin/env node
/**
 * Preflight local — roda os gates 01/02/10 antes de propor qualquer commit/push
 * de uma tarefa do Atendexa. Somente leitura: nao altera nada, nao faz push,
 * nao toca em Vercel/Render/Supabase. Uso: node helpdesk/scripts/ci/preflight.js
 */
const { execSync } = require('child_process');

const REPO_ROOT = execSync('git rev-parse --show-toplevel').toString().trim();
const SCOPE = 'helpdesk';

function sh(cmd) {
  return execSync(cmd, { cwd: REPO_ROOT }).toString().trim();
}

function section(title) {
  console.log(`\n== ${title} ==`);
}

function main() {
  const problems = [];

  section('Gate 10 — Identidade e estado do Git');
  const branch = sh('git rev-parse --abbrev-ref HEAD');
  console.log(`Branch atual: ${branch}`);
  if (branch === 'main') {
    problems.push('Branch atual e a propria main — tarefas devem ser feitas em branch de feature.');
  }

  try {
    sh('git fetch origin main --quiet');
  } catch (e) {
    problems.push(`Nao foi possivel atualizar origin/main: ${e.message}`);
  }

  try {
    const aheadBehind = sh('git rev-list --left-right --count origin/main...HEAD');
    console.log(`origin/main...HEAD (atras/na frente): ${aheadBehind}`);
  } catch {
    console.log('Nao foi possivel comparar com origin/main (branch local pode nao existir ainda).');
  }

  section('Gate 10 — Arquivos fora do escopo Atendexa');
  const changed = sh('git status --porcelain').split('\n').filter(Boolean);
  const outOfScope = changed
    .map((l) => l.slice(3).replace(/^"|"$/g, ''))
    .filter((f) => f && !f.startsWith(`${SCOPE}/`) && f !== '.gitignore');
  if (outOfScope.length) {
    console.log('Arquivos alterados fora de helpdesk/ (revisar se pertencem a esta tarefa):');
    outOfScope.forEach((f) => console.log(`  - ${f}`));
  } else {
    console.log('Nenhuma alteracao fora de helpdesk/ (alem de .gitignore).');
  }

  section('Gate 07 — Segredos');
  try {
    sh(`node ${SCOPE}/scripts/ci/secret-scan.js`);
    console.log('secret-scan.js: OK');
  } catch (e) {
    problems.push('secret-scan.js falhou — ver saida acima.');
  }

  section('Gate 04/05 — Dependencias e testes (execucao real)');
  for (const pkg of ['backend', 'frontend']) {
    const dir = `${SCOPE}/${pkg}`;
    try {
      console.log(`[${pkg}] npm test`);
      console.log(execSync('npm test', { cwd: `${REPO_ROOT}/${dir}` }).toString());
    } catch (e) {
      problems.push(`Testes de ${pkg} falharam.`);
      console.error(e.stdout?.toString() || e.message);
    }
  }

  section('Resultado');
  if (problems.length) {
    console.error('BLOQUEADO — pendencias encontradas:');
    problems.forEach((p) => console.error(`  - ${p}`));
    process.exit(1);
  }
  console.log('PASS — preflight local concluido sem bloqueios. Pronto para commit/PR (push ainda requer decisao humana).');
}

main();
