# Atendexa — CI/CD (CICD-01 a CICD-13)

> Preparado em 2026-11-11 (CICD-01). Define o pipeline permanente de CI/CD do
> Atendexa. **Atualizado em 2026-11-11 (CICD-13)** para refletir a ativação
> real do pipeline (CICD-10/11/12): workflow commitado, PR #8 mergeado em
> `main`, branch protection e required status check ativos, deploy de produção
> confirmado no SHA integrado. Ver seção 9 para o status certificado e as
> pendências ainda abertas (Render, RBAC).

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

**Atualizado em CICD-13 (2026-11-11), após ativação CICD-10/11/12.** Estado
anterior ("sem branch protection, 0 workflows") descrevia o diagnóstico
pré-ativação (CICD-01) e não é mais válido — mantido apenas como histórico na
seção 1.1 acima.

| Plataforma | Confirmado | Como |
|---|---|---|
| GitHub | Repo `marcoantunes171989/helpdesk-atendify`, branch `main` **protegida**: PR obrigatório, required status check `Gate final — resumo`, **strict mode ativo** (branch deve estar atualizada antes do merge), proteção **aplicável a administradores** (`enforce_admins: true`), force push e exclusão de branch **proibidos**, auto-merge **desativado** no repositório, GitHub Actions ativo com **1 workflow registrado**. PR #8 ("chore(ci): ativar pipeline automatizado Atendexa") integrado em `main` por **squash merge**, gerando o commit `d56a47ecc2d6448e31617e46b93624141fa932ca`. Os **5 checks** desse commit (`Gate final — resumo`, `Supabase Preview`, `Gate 04/06 — Frontend`, `Gate 04/06 — Backend`, `Gate 07 — Seguranca`) estão todos `completed`/`success` | `gh api .../branches/main/protection`, `gh pr view 8`, `gh api .../commits/d56a47e.../check-runs`, `gh api .../actions/workflows` |
| Vercel | Projeto `helpdesk-atendify` (`prj_q8XH6M3sBuidepqVTurXP6vmHMiY`), framework `vite`. Deployment de produção `dpl_48ZTExnTupaBLKmjwsvdjjxB6VK8` confirmado `READY`/`target: production`, `githubCommitSha: d56a47ecc2d6448e31617e46b93624141fa932ca` (mesmo SHA do merge do PR #8), alias de produção (`www.atendexa.com.br` etc.) aplicado sem erro. Smoke tests executados nesta sessão: frontend 200, `API /health` 200 (healthcheck do backend via Render, abaixo), rota protegida sem token → comportamento esperado — todos aprovados | MCP Vercel (`get_deployment` com `withGitRepoInfo`), checagem HTTP somente-leitura nesta sessão |
| Render | **API respondendo saudável** (`GET /health` → `200` confirmado nesta sessão, somente leitura). **Não certificado nesta sessão**: qual SHA está efetivamente em execução (`SHA LIVE`) e se a configuração do painel (Root Directory, Build/Start command, Auto-Deploy) ainda diverge do `render.yaml` versionado, como já registrado em auditoria anterior (RBAC-09C/seção 14 de `INFRAESTRUTURA.md`). Sem MCP/API do Render nesta sessão para reconfirmar automaticamente — **não declarar Render sincronizado sem essa evidência** | Checagem HTTP somente-leitura nesta sessão (`/health` → 200); divergência de configuração herdada de auditoria anterior, não reconfirmada agora |
| Supabase | Não inspecionado nesta sessão (conector MCP não autenticado) | — |
| RBAC | Trabalho de RBAC (branch `feat/atendexa-rbac-access-control`) existe localmente e **ainda não foi publicado/mergeado em `main`** (confirmado: busca por commits RBAC em `origin/main` não retorna nenhum) | `git log origin/main --oneline \| grep -i rbac` → vazio |

**Risco já documentado e ainda em aberto** (seção 14.2–14.3 de
`INFRAESTRUTURA.md`): o SHA efetivamente ao vivo no Render e a configuração
real do painel ainda não foram recertificados nesta sessão. Isso deve ser
confirmado pelo proprietário antes de qualquer merge que dependa de deploy
coordenado Render+Vercel.

## 2. Estratégia única escolhida

- **CI**: GitHub Actions, workflow único em `.github/workflows/atendexa-ci.yml`
  (raiz do repo — única localização que o GitHub realmente executa),
  restrito por `paths: helpdesk/**` para não reagir a mudanças em
  `controle-financeiro/` ou `divas-lingerie/`.
- **Deploy frontend**: mantém a integração Git nativa da Vercel (já ativa e
  correta) — não duplicado por Actions.
- **Deploy backend**: mantém o Auto-Deploy nativo do Render — não duplicado por
  Actions.
- **Gate de promoção**: (a) branch protection do GitHub exigindo o workflow
  (`Gate final — resumo`) como *required status check* antes do merge em
  `main` — **aplicado e confirmado** (ver seção 1.3); (b) mudar o Auto-Deploy
  do Render de "On Commit" para "After CI Checks Pass" — **ainda não
  confirmado nesta sessão** (sem MCP/API do Render para verificar o painel).

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

## 8. Procedimento de ativação inicial — executado (CICD-10/11/12)

1. ✅ Workflow `.github/workflows/atendexa-ci.yml` revisado e aprovado.
2. ✅ Commit + push via PR #8 ("chore(ci): ativar pipeline automatizado
   Atendexa"), integrado em `main` por squash merge
   (`d56a47ecc2d6448e31617e46b93624141fa932ca`).
3. ✅ Confirmado no GitHub: 1 workflow registrado em Actions
   (`gh api .../actions/workflows` → `total_count: 1`).
4. ✅ Branch protection aplicada em `main`: PR obrigatório, required status
   check `Gate final — resumo`, strict mode, aplicável a administradores,
   force push e exclusão proibidos.
5. ⬜ Mudar Auto-Deploy do Render de "On Commit" para "After CI Checks Pass" —
   **não confirmado nesta sessão** (sem MCP/API do Render).
6. ✅ Push real de teste validado ponta a ponta: PR #8 passou pelos 5 checks,
   foi integrado, e o deploy de produção na Vercel confirmou o mesmo SHA
   (`dpl_48ZTExnTupaBLKmjwsvdjjxB6VK8`, READY) com smoke tests aprovados.

## 9. Status final (CICD-13)

**CERTIFICAÇÃO DOCUMENTAL CONCLUÍDA PARA GITHUB + VERCEL.** Pipeline ativado,
testado e confirmado ponta a ponta nesses dois componentes, com evidência
reproduzível (seção 1.3).

**Pendências que permanecem abertas, não certificadas nesta sessão:**

- **Render**: API responde saudável (`/health` → 200), mas o SHA
  efetivamente em execução (`SHA LIVE`) e a configuração real do painel
  (Root Directory, Build/Start command, Auto-Deploy) não foram
  reconfirmados — divergência frente ao `render.yaml` já registrada em
  auditoria anterior e não revalidada agora.
- **RBAC**: trabalho em `feat/atendexa-rbac-access-control` ainda não
  publicado em `main`.

Nenhuma dessas pendências foi declarada resolvida; esta atualização apenas
documenta o que já está evidenciado e mantém as duas como abertas.
