# Atendexa — CI/CD (CICD-01)

> Preparado em 2026-11-11. Define o pipeline permanente de CI/CD do Atendexa.
> **Nada neste documento foi ativado remotamente.** Workflow, scripts e esta
> documentação existem localmente, não commitados, aguardando autorização.

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

## 9. Status final desta tarefa

**PREPARADO.** Workflow, scripts e documentação prontos e testados localmente.
Ativação (passos da seção 8) requer autorização explícita e ações remotas que
este pedido não autorizou.
