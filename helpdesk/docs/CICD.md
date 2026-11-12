# Atendexa — CI/CD (CICD-01 → CICD-04)

> Preparado em 2026-11-11, atualizado em 2026-11-11 (CICD-04). Define o
> pipeline permanente de CI/CD do Atendexa.
> **Nada neste documento foi ativado remotamente.** Workflow, scripts e esta
> documentação existem no worktree isolado (`C:/Projetos/atendexa-cicd-worktree`),
> não commitados na `main` real, aguardando autorização.

## 0. CICD-04 — causa do bloqueio da CICD-03 e o que foi corrigido

A CICD-03 preparou workflow e scripts (seções 1–9 abaixo) mas o pacote **nunca
rodou um teste real**: `helpdesk/backend` e `helpdesk/frontend`, na `main`
real (`origin/main` = `1b37bfa`), **não tinham nenhuma infraestrutura de
teste** — sem `jest`, sem `vitest`, sem script `npm test`, sem um único
arquivo `*.test.js`/`*.test.jsx`. Os 65 testes Jest e 22 testes Vitest citados
na seção 3 vieram da branch `feat/atendexa-rbac-access-control` e testavam
código RBAC (`requirePermission`, `resolve.js`, `accessGroupController`,
`userStatusCache`, rotas de treinamento) que **não existe na `main`** — ou
seja, o workflow da CICD-03, se executado contra a `main` real, teria todo
job `backend`/`frontend` falhando em `npm test` (script inexistente).

**Correção aplicada nesta etapa (worktree isolado, base `1b37bfa` = `origin/main`
exato, sem divergência):**

| Área | Antes (CICD-03) | Depois (CICD-04) |
|---|---|---|
| `helpdesk/backend/package.json` | sem `test`, sem `jest` | `"test": "jest --runInBand"`, `devDependencies.jest`, `devDependencies.supertest`, bloco `jest` (testEnvironment node) |
| `helpdesk/backend` testes | 10 arquivos RBAC-dependentes (não copiados) | 2 arquivos novos, escritos contra o código real da `main`: `src/middleware/__tests__/auth.test.js` (7 testes — JWT puro, sem cache/tokenVersion, que só existem na branch RBAC) e `src/controllers/__tests__/dashboardController.test.js` (3 testes — `stats` sem escopo por dono, que só existe na branch RBAC) |
| `helpdesk/frontend/package.json` | sem `test`, sem `vitest` | `"test": "vitest run"`, `devDependencies` (`vitest`, `jsdom`, `@testing-library/react`, `@testing-library/jest-dom`) |
| `helpdesk/frontend/vite.config.js` | sem bloco `test` | `test: { environment: 'jsdom', globals: true, setupFiles: './src/test/setup.js' }` |
| `helpdesk/frontend` testes | 3 arquivos RBAC-dependentes (não copiados: `rbac.test.jsx`, e os outros dois exercitam telas que a `main` não tem do mesmo jeito) | 2 arquivos novos: `src/test/authContext.test.jsx` (3 testes — login/logout reais do `AuthContext` da `main`) e `src/test/login.render.test.jsx` (1 teste — renderização dos campos `email`/`password` da tela `Login.jsx` real da `main`) |
| `src/test/setup.js` | — | novo — polyfill de `window.matchMedia` (ausente no jsdom), exigido pelo `useBreakpoint` do AntD |

**Resultado real desta sessão:** `npm test` do backend → **8/8 testes passando**
(Jest). `npm test` do frontend → **4/4 testes passando** (Vitest). `npm run
build` do frontend → build de produção concluído (bundle gerado, sem erro).
Nenhum teste "RBAC" foi portado — todos os 10 arquivos de teste da branch RBAC
foram classificados como Categoria C/D (dependem de código inexistente na
`main`: `requirePermission.js`, `permissions/resolve.js`,
`permissions/catalog.js`, `accessGroupController.js`,
`utils/userStatusCache.js`, `routes/trainingRoutes.js` — nenhum desses
arquivos existe em `origin/main`) e **não entraram no pacote**.

### 0.1 Testes negativos executados nesta sessão (prova de que os gates bloqueiam de verdade)

| Teste | Procedimento | Resultado |
|---|---|---|
| `secret-scan.js` — positivo | Rodado contra as 127 arquivos rastreados do worktree | `OK`, exit 0 |
| `secret-scan.js` — negativo | Criado arquivo temporário com uma linha `DATABASE_URL` sintética no formato `postgres://usuario:senha@host` (fixture descartável, não reproduzida aqui literalmente para não disparar o próprio scanner nesta documentação), removido logo depois | Detectado e bloqueado (`FALHOU`, exit 1) |
| Jest — negativo | Criado teste temporário `expect(1+1).toBe(3)`, removido logo depois | `npm test` retornou exit code real **1** (falha real, não só mensagem) |
| Vitest — negativo | Mesmo procedimento no frontend | `npm test` retornou exit code real **1** |
| YAML do workflow | `npx js-yaml .github/workflows/atendexa-ci.yml` | Sintaxe válida |
| SHAs das actions fixadas | `gh api repos/actions/checkout/git/refs/tags/v7.0.1` e `repos/actions/setup-node/.../v7.1.0` comparados ao SHA fixado no workflow | Ambos conferem exatamente com os SHAs usados (`3d3c42e5...` e `949feb24...`) |
| `gate-summary` — lógica | Leitura do step: `if [ "$X.result" != "success" ]` para os 3 jobs obrigatórios | Cobre `failure`, `cancelled` **e** `skipped` — nenhum caminho produz PASS falso |
| Escopo (Etapa 8) | `git diff --stat origin/main` sobre o worktree completo | 10 arquivos, todos justificáveis (workflow, docs, scripts CI, infra de teste, package.json/lock); `git diff --stat origin/main -- controle-financeiro divas-lingerie helpdesk/backend/prisma` → vazio (zero mudança em outros projetos, zero mudança em schema/migrations) |

**Não executado nesta sessão (limitação declarada):** `prisma generate` real
em container Linux (sem Docker disponível neste ambiente) — validado
indiretamente: `prisma/schema.prisma` não define `binaryTargets` fixo, então
o Prisma CLI baixa o engine correto para `ubuntu-latest` automaticamente (não
depende da DLL do Windows, que só afeta o ambiente de desenvolvimento local).
O `npx prisma generate` local (Windows) funcionou sem erro nesta sessão. A
confirmação definitiva só é possível com a execução real do GitHub Actions
(fora do escopo autorizado desta etapa — ver seção 8).

## 1. Diagnóstico encontrado nesta auditoria

### 1.1 Achado crítico: o CI existente nunca rodou

`helpdesk/.github/workflows/deploy.yml` existe desde o commit `02bdf15` e está
em `main`, mas **o GitHub Actions nunca o descobriu**:

```
gh api repos/marcoantunes171989/helpdesk-atendify/actions/workflows
→ {"total_count":0,"workflows":[]}
```

Causa: GitHub Actions só lê workflows em `.github/workflows/` **na raiz do
repositório Git**. A raiz deste repositório é `C:/Projetos/Atendexa` (confirmado
via `git rev-parse --show-toplevel`), e o arquivo está em
`helpdesk/.github/workflows/`, uma subpasta — portanto nunca foi um workflow
válido do ponto de vista do GitHub, apesar de versionado e sintaticamente correto.
O mesmo vale para `divas-lingerie/.github/workflows/supabase-migrations.yml`
(outro projeto do monorepo, fora do escopo desta tarefa, não alterado).

Consequência prática: **todo merge em `main` até hoje passou direto para
produção sem nenhum teste automatizado rodar.** O Vercel e o Render publicaram
com base apenas no sucesso do build nativo de cada plataforma.

### 1.2 Outras lacunas do workflow antigo (mesmo que fosse descoberto)

- Não executa `npm test` (backend Jest, frontend Vitest) — só `prisma generate`
  e `vite build`.
- Depende de secrets (`DATABASE_URL`, `DIRECT_URL`, `VITE_API_URL`) que **não
  existem no repositório** (`gh api .../actions/secrets` → `total_count: 0`).
- Sem verificação de segredos commitados, sem concorrência, sem permissões
  mínimas, sem pin de actions por versão/SHA.
- Sem gate que bloqueie falha silenciosa (nenhum `continue-on-error`, mas também
  nenhuma trava explícita de "não publicar se X").

### 1.3 Configuração efetiva confirmada (fonte: painéis + APIs, não arquivos)

| Plataforma | Confirmado | Como |
|---|---|---|
| GitHub | Repo `marcoantunes171989/helpdesk-atendify`, branch padrão `main`, **sem branch protection, sem ruleset**, Actions habilitado (`allowed_actions: all`), **0 secrets configurados**, **0 workflows registrados** | `gh api` direto |
| Vercel | Projeto único `helpdesk-atendify` (`prj_q8XH6M3sBuidepqVTurXP6vmHMiY`), framework `vite`, Git Integration ativa em `main` (últimos deploys de produção têm `githubCommitRef: main` e SHA correspondente ao `origin/main` real), domínios de produção intactos | MCP Vercel (`get_project`, `list_deployments`) |
| Render | Serviço `helpdesk-atendify`, Root Directory `helpdesk/backend`, Build `npm install && npx prisma generate`, Start `node src/app.js`, Auto-Deploy `On Commit` — **diverge do `render.yaml` versionado** (nome, root dir e build command diferentes) | Confirmado por captura de painel em auditoria anterior (RBAC-09C/seção 14 de `INFRAESTRUTURA.md`); sem MCP/API do Render nesta sessão para reconfirmar automaticamente |
| Supabase | Não inspecionado nesta sessão (conector MCP não autenticado) | — |

**Risco já documentado e ainda em aberto** (seção 14.2–14.3 de
`INFRAESTRUTURA.md`): o commit publicado no Render pode estar atrasado frente a
`origin/main`. Isso deve ser confirmado pelo proprietário antes de qualquer
merge que dependa de deploy coordenado Render+Vercel.

## 2. Estratégia única escolhida

- **CI**: GitHub Actions, workflow único em `.github/workflows/atendexa-ci.yml`
  (raiz do repo — única localização que o GitHub realmente executa),
  restrito por `paths: helpdesk/**` para não reagir a mudanças em
  `controle-financeiro/` ou `divas-lingerie/`.
- **Deploy frontend**: mantém a integração Git nativa da Vercel (já ativa e
  correta) — não duplicado por Actions.
- **Deploy backend**: mantém o Auto-Deploy nativo do Render — não duplicado por
  Actions.
- **Gate de promoção**: nesta fase, sem Vercel "Deployment Checks" confirmado
  disponível no plano, a trava fica em: (a) branch protection do GitHub
  exigindo o workflow como *required status check* antes do merge em `main`, e
  (b) mudar o Auto-Deploy do Render de "On Commit" para "After CI Checks Pass"
  — **ambas as mudanças são remotas e não foram aplicadas** (fora do escopo
  autorizado desta tarefa).

## 3. O workflow (`.github/workflows/atendexa-ci.yml`)

Jobs: `secret-scan` → (`backend`, `frontend` em paralelo) → `gate-summary`.

- Dispara em `push`/`pull_request` para `main`, só quando `helpdesk/**` ou o
  próprio workflow mudam.
- `concurrency` cancela execução obsoleta da mesma branch.
- `permissions: contents: read` (mínimo necessário).
- Actions fixadas por SHA revisado (`actions/checkout@3d3c42e...` = v7.0.1,
  `actions/setup-node@949feb2...` = v7.1.0).
- `backend`: `npm ci` → `prisma generate` (com `DATABASE_URL`/`DIRECT_URL`
  **fictícios**, só para o Prisma Client gerar — não é preciso banco real para
  `generate`) → `npm test` (Jest, 65 testes).
- `frontend`: `npm ci` → `npm test` (Vitest, 22 testes) → `npm run build`
  (com `VITE_API_URL` placeholder não sensível).
- `gate-summary`: falha explicitamente se qualquer job anterior não passou —
  evita sucesso falso por job pulado/cancelado.
- Nenhum passo roda `migrate deploy`, `db push` ou seed contra banco real.

## 4. Scripts preparados (`helpdesk/scripts/ci/`)

| Script | Função | Testado nesta sessão |
|---|---|---|
| `secret-scan.js` | Gate 07 — varre os arquivos rastreados de `helpdesk/` por `.env` real, dumps e padrões de segredo; ignora `.env.example/.sample/.template` | ✅ `node scripts/ci/secret-scan.js` → OK, 149 arquivos |
| `preflight.js` | Roda localmente antes de propor commit: branch, divergência com `origin/main`, arquivos fora do escopo, secret-scan, testes reais de backend e frontend | ✅ passou, 65+22 testes OK |
| `smoke-test.js` | Pós-deploy, somente leitura: frontend 200, `API /health` 200, rota protegida sem token → 401 | ✅ executado contra produção real agora: todos PASS |

Nenhum script cria, altera ou exclui dados. `smoke-test.js` foi executado
contra `https://www.atendexa.com.br` e `https://helpdesk-atendify.onrender.com`
nesta sessão e confirmou produção saudável no momento desta auditoria.

## 5. Classificação de mudanças e política de banco (ETAPA 7)

| Tipo | Descrição | Pode seguir pipeline automático (após ativação)? |
|---|---|---|
| A | Só frontend | Sim |
| B | Backend sem mudança de schema | Sim |
| C | Frontend+backend com contrato compatível | Sim |
| D | Mudança aditiva no banco | Não — exige backup confirmado, autorização de migration, validação de estrutura antes do push do código dependente |
| E | Mudança destrutiva/incompatível | Não — exige plano de migração, backup, recuperação testada e autorização específica |

Para o Supabase do Atendexa especificamente: `prisma migrate deploy` continua
proibido enquanto `_prisma_migrations` não existir em produção (confirmado
ausente — ver seção 12 de `INFRAESTRUTURA.md`). Migrations vão como SQL puro
controlado, nunca implícitas em build/CI.

## 6. Recuperação e rollback

- **Frontend (Vercel)**: `request_rollback` para o deployment de produção
  anterior confirmado `READY` (existe candidato: `dpl_Be8fBn6QG99fKWL9jWfV4Vme6rRv`,
  commit `1b37bfa`, no momento desta auditoria).
- **Backend (Render)**: rollback manual pelo painel para o deploy anterior —
  sem API/MCP do Render nesta sessão para automatizar; **não** usar force-push
  como rollback.
- **Banco**: nunca rollback automático. Qualquer reversão de schema é manual,
  supervisionada, após confirmação de backup/PITR no Supabase.
- Toda falha pós-deploy detectada por `smoke-test.js` deve interromper novas
  publicações até investigação — não há retry automático silencioso.

## 7. Procedimento permanente (ETAPA 13)

```
SOLICITAÇÃO → ANÁLISE → IMPLEMENTAÇÃO → TESTES (preflight.js)
  → VALIDAÇÃO DE SEGURANÇA (secret-scan.js) → COMMIT → PUSH → CI (atendexa-ci.yml)
  → DEPLOY (Vercel/Render nativos) → SMOKE TEST (smoke-test.js) → RELATÓRIO
```

Para tarefas Tipo A/B/C que passarem em todos os gates, a publicação pode ser
proposta sem pausa de confirmação a cada etapa de baixo risco — mas commit e
push desta própria tarefa (CICD-01) **não foram executados**, conforme
restrição explícita do pedido original.

## 8. Procedimento de ativação inicial (pendente de autorização do proprietário)

1. Revisar e aprovar `.github/workflows/atendexa-ci.yml` e remover (ou arquivar)
   `helpdesk/.github/workflows/deploy.yml`, que é redundante e nunca foi
   executável.
2. Commit + push deste conjunto de arquivos (workflow, scripts, esta
   documentação) para `main` (ou via PR).
3. Confirmar no GitHub que o workflow aparece em Actions após o push
   (`gh api .../actions/workflows` deve deixar de retornar `total_count: 0`).
4. Decidir e aplicar (ação remota, fora desta sessão): branch protection em
   `main` exigindo o workflow como status check obrigatório.
5. Decidir e aplicar (ação remota): mudar Auto-Deploy do Render de
   "On Commit" para "After CI Checks Pass", se disponível no plano.
6. Validar um push real de teste (mudança trivial, Tipo A) ponta a ponta antes
   de confiar o fluxo a tarefas de maior risco.

## 9. Status final — CICD-01/03

**PREPARADO.** Workflow, scripts e documentação prontos e testados localmente.
Ativação (passos da seção 8) requer autorização explícita e ações remotas que
este pedido não autorizou.

## 10. Status final — CICD-04

**PASS_COM_LIMITAÇÕES.**

O que passou de verdade nesta sessão, em ambiente local isolado (seção 0):
- `npm test` do backend (Jest): 8/8 testes reais, contra o código atual da
  `main`, sem RBAC.
- `npm test` do frontend (Vitest): 4/4 testes reais, idem.
- `npm run build` do frontend: build de produção sem erro.
- `secret-scan.js`: positivo e negativo confirmados.
- Testes negativos de Jest/Vitest: confirmado que falha real produz exit
  code 1 (não há falso PASS).
- YAML do workflow: sintaticamente válido; SHAs das actions fixadas
  conferem com as tags oficiais reivindicadas.
- Escopo: nenhum arquivo RBAC, de schema, de migration/seed, ou de outro
  projeto do monorepo entrou no pacote.

O que **não** foi validado nesta sessão (requer ação remota, fora da
autorização desta etapa — ver seção 8, passos 2–7):
- Execução real do workflow no GitHub Actions (descoberta, jobs, gate-summary
  rodando de fato em `ubuntu-latest`).
- `prisma generate` em container Linux real (só validado por inferência: sem
  `binaryTargets` fixo no schema, o engine correto é baixado automaticamente).
- Qualquer configuração de branch protection, required status check ou
  mudança do Auto-Deploy do Render — todas são ações remotas pendentes de
  autorização explícita do proprietário.

Nada foi commitado, nenhum push foi feito, nenhuma branch foi criada, nenhuma
migration/seed foi aplicada, nenhuma configuração remota (GitHub/Vercel/Render/
Supabase) foi alterada nesta sessão.
