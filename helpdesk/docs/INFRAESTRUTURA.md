# Atendexa — Infraestrutura Oficial

> Documento de referência permanente. Toda manutenção, deploy ou alteração de infraestrutura deve seguir as regras abaixo. Última auditoria: 2026-11-11 (RBAC-09C, consolidação documental sobre RBAC-09B).

## 1. Identidade do projeto

| Item | Valor |
|---|---|
| Projeto Vercel oficial | `helpdesk-atendify` (`prj_q8XH6M3sBuidepqVTurXP6vmHMiY`) |
| Domínio oficial | `www.atendexa.com.br` (apex `atendexa.com.br` redireciona para `www`) |
| Domínio auxiliar | `suporte.atendexa.com.br` |
| Repositório GitHub | `marcoantunes171989/helpdesk-atendify` |
| Branch de produção | `main` |
| Time Vercel | `Marco Antonio's projects` (`team_iIylzmG0qcwYy1eKH7gRWrAI`) |
| Backend | Render — serviço `helpdesk-atendify` (nome efetivo confirmado no painel, seção 14; `helpdesk/render.yaml` referencia `helpdesk-atendify-api` e **não reflete** a configuração efetiva) |
| Banco de dados | PostgreSQL via Supabase |

## 2. Regras de branches

- Toda feature nova nasce de `main` com o padrão `feat/<escopo>-<descrição>` (ex.: `feat/atendexa-rbac-access-control`).
- `fix/<escopo>` para correções pontuais; `chore/<escopo>` para manutenção/infra.
- Nenhuma branch é publicada em produção sem passar por `main` via merge revisado.
- **Proibido** criar projetos Vercel paralelos para testar branches. Deploys de preview devem usar o mecanismo nativo de preview do próprio projeto `helpdesk-atendify` (deploy automático por PR/branch), nunca um projeto novo.

## 3. Proibição de projetos Vercel paralelos

Está formalmente proibido criar qualquer novo projeto Vercel para o Atendexa fora de `helpdesk-atendify`. Qualquer necessidade de validação isolada deve ser resolvida com:
- Preview deployments do próprio projeto oficial, ou
- Ambiente local (`npm run dev`).

### Status do projeto paralelo `atendexa-validacao`

**Confirmado excluído em 2026-11-11 (auditoria INFRA-02).** Verificação direta via API Vercel:
- `list_projects` (busca por `atendexa`) retorna **apenas** `helpdesk-atendify` — nenhum outro projeto do escopo Atendexa existe na conta/time.
- `get_project(prj_0KP84BERSSFS0symLk0ALhBkD9W0)` retorna `404 not_found: Project not found` — o ID do antigo projeto paralelo não existe mais.

Nenhuma ação adicional é necessária. Regra da seção 3 permanece em vigor para o futuro.

## 4. Procedimento de descontinuação e exclusão

1. Confirmar que o projeto a excluir não possui domínio de produção vinculado.
2. Exportar/registrar quaisquer variáveis de ambiente exclusivas desse projeto, se houver.
3. Excluir via Vercel Dashboard (não há exclusão automatizada por API/MCP neste setup).
4. Reconfirmar via `list_projects`/dashboard que o projeto não aparece mais.
5. Atualizar este documento com a data e evidência da exclusão.

## 5. Política de backups

- Backups do banco são responsabilidade do Supabase (projeto de produção). Confirmar periodicamente, no painel Supabase, a existência de backups automáticos ativos e seu período de retenção.
- Nenhuma migration destrutiva (`DROP`, `TRUNCATE`, renomeação de coluna com perda de dados) deve ser aplicada sem backup/snapshot prévio confirmado.
- Migrations Prisma devem ser aditivas sempre que possível (ver convenção em `backend/prisma/migrations/20261110000001_rbac_access_control/migration.sql`, que usa `ADD COLUMN IF NOT EXISTS` e blocos `DO $$ ... EXCEPTION WHEN duplicate_object` para ser segura em reaplicação).

## 6. Regras de desenvolvimento e testes

- Alterações de schema entram como migration versionada em `backend/prisma/migrations/`, nunca como edição manual direta no banco de produção.
- Rotas de API novas devem usar o middleware `requirePermission` (`backend/src/middleware/requirePermission.js`) quando o recurso exigir controle de acesso.
- Testes automatizados residem em `__tests__` junto dos módulos (backend) e `frontend/src/test` (frontend). Rodar a suíte local antes de qualquer PR para `main`.
- `npm run build` (frontend) e `prisma generate` (backend) devem ser validados localmente antes do push.

## 7. Segurança e integridade dos dados

- Segredos (`DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`) nunca são commitados; vivem em `.env` local e nas variáveis de ambiente do Render/Vercel (`sync: false` no `render.yaml`).
- SSO Protection está habilitado no projeto Vercel para todos os domínios exceto os customizados de produção (`ssoProtection.deploymentType = all_except_custom_domains`) — não desabilitar sem avaliação de impacto.
- Autenticação JWT com `tokenVersion` por usuário para permitir revogação de sessão (ver migration RBAC).
- Auditoria de ações sensíveis é registrada em `audit_logs` (tabela criada pela migration RBAC).

## 8. Procedimento de publicação em produção

1. PR da branch de feature para `main`, revisado.
2. Merge em `main` dispara deploy automático no Vercel (frontend) — **confirmado em 2026-11-11**: os últimos 3 deployments de produção READY (`dpl_Be8fBn6QG9...`, `dpl_CxBxm8FQ8G...`, `dpl_F9JTtyrz1R...`) têm `source: "git"`, `githubRepo: helpdesk-atendify`, `githubOrg: marcoantunes171989`, `githubCommitRef: main`, cada um correspondendo a um commit real de `main` (`1b37bfa`, `19e0ca3`, `998c000`). Git Integration está ativa e conectada a `main`.
3. Backend (Render) faz deploy a partir do mesmo `main`, conforme `render.yaml` (`buildCommand: npm ci --include=dev && npx prisma generate`, `startCommand: node src/app.js`).
4. Migrations de banco **não** rodam automaticamente no build do Render (isoladas conforme commit `60d3651`) — devem ser aplicadas manualmente/via pipeline controlado antes ou junto do deploy, nunca de forma implícita no build.

## 9. Verificações pós-deploy

- Checar `https://www.atendexa.com.br` responde 200 e autentica.
- Checar health/status da API Render.
- Validar que usuários com diferentes grupos de acesso (RBAC) veem apenas os módulos permitidos.
- Checar logs de erro recentes (Vercel Runtime Logs / Render logs) nos primeiros minutos pós-deploy.

## 10. Critérios de interrupção (rollback trigger)

Interromper/revertê-lo imediatamente se, pós-deploy:
- A API retornar erro 5xx sistemático em rotas críticas (`/api/auth/login`, `/api/tickets`).
- Migration falhar ou deixar o schema inconsistente.
- Usuários perderem acesso indevido (bug de permissão bloqueando todo o sistema) ou ganharem acesso indevido (falha de RBAC).

## 11. Plano de recuperação

- Vercel: usar "Promote"/rollback para o deployment anterior READY através do dashboard ou API (`request_rollback`).
- Render: reverter para o commit anterior estável e forçar novo deploy.
- Banco: restaurar a partir do backup Supabase mais recente anterior à migration problemática; nunca tentar "desfazer" uma migration aditiva manualmente em produção sem script de rollback revisado.

---

## 12. Pendências consolidadas (auditoria RBAC-09A, 2026-11-11)

Reconfirmado nesta auditoria (sem repetir trabalho já concluído em INFRA-02):
- `get_project(prj_q8XH6M3sBuidepqVTurXP6vmHMiY)` via API Vercel: projeto único, domínios de produção intactos (`www.atendexa.com.br`, `atendexa.com.br`, `suporte.atendexa.com.br`), `ssoProtection.deploymentType = all_except_custom_domains`, latestDeployment READY. Nenhuma divergência frente à seção 1/3.
- Catálogo de permissões (`backend/src/permissions/catalog.js`): geração programática confirma exatamente **18 módulos** (`MODULES`) e **69 permissões** (`PERMISSION_KEYS`/`PERMISSIONS`), consistente com `seed-permissions.js` (upsert idempotente, sem alterar usuários/grupos). **Correção desta auditoria (RBAC-09C)**: contagem anterior registrada como 17 módulos estava incorreta; valor confirmado por execução direta do módulo é 18 módulos / 69 permissões.
- `backend/src/permissions/resolve.js` e `middleware/auth.js`: usuário `SUPER_ADMIN` sempre tem bypass total; usuário sem `accessGroupId` (legado) cai em `ROLE_DEFAULT_PERMISSIONS` (ADMIN legado = todas as permissões) — **nenhum usuário existente perde acesso** ao aplicar a migration. `tokenVersion` tem `DEFAULT 0` na migration e no token decodificado (`decoded.tokenVersion || 0`), portanto sessões já emitidas antes da migration continuam válidas sem forçar logout em massa.
- `requirePermission` é *deny by default* e grava em `audit_logs` toda negação — mas só é usado nas rotas sensíveis (gestão de usuários/grupos/permissões); rotas de alto tráfego continuam no middleware `auth` leve, preservando a otimização de performance do login.

Ainda pendentes (dependem exclusivamente de ação do proprietário da conta — fora do alcance de uma sessão somente-leitura local):
- **Supabase**: conector MCP `claude.ai Supabase` continua não autenticado (`authenticate` retorna instrução para rodar `/mcp` manualmente). Reconfirmado nesta sessão — não solicitado de novo além desta checagem. Sem ele, não é possível confirmar a identidade do projeto Supabase de produção, nem schema real, `_prisma_migrations`, backups ou retenção. **Ação necessária do usuário**: `/mcp` → "claude.ai Supabase" → autorizar.
- **Backup Supabase**: sem o conector autenticado, não há como confirmar plano, retenção ou último backup concluído. **Não presumir backup automático** — antes da Fase B (ver seção 13), o proprietário deve confirmar manualmente no painel Supabase (Project Settings → Database → Backups) a existência de ao menos um backup/point-in-time recovery recente, ou disparar uma exportação manual (`pg_dump` via connection string, feita localmente pelo proprietário).
- **Render**: nenhum conector/MCP do Render disponível. Build/Start Command, Root Directory e Auto-Deploy só podem ser inferidos do `render.yaml` versionado (seção 1); o estado efetivo no painel (Blueprint sync vs. config manual, versão exata do Node, variáveis realmente definidas) continua **não confirmado por API**. **Ação necessária do usuário**: confirmar no painel Render que o serviço `helpdesk-atendify-api` usa o `render.yaml` do repo (ou que a configuração manual é equivalente) e que `Auto-Deploy` está ligado em `main`.
- **Identidade do projeto Supabase de produção**: sem o conector, não é possível comparar o `DATABASE_URL`/`DIRECT_URL` configurado no Render com o projeto Supabase real. **Ação necessária do usuário**: confirmar, no painel Render (Environment), o host do `DATABASE_URL` (ex.: `db.<ref>.supabase.co`) e comparar com o projeto Supabase aberto no painel — sem expor a connection string completa.
- **`_prisma_migrations` ausente**: confirmado pelo proprietário (consulta somente-leitura, seção 2 do pedido original) que a tabela não existe em produção. Isso significa que o banco de produção **nunca foi gerenciado via `prisma migrate deploy`** — portanto a migration RBAC **não deve** ser aplicada com `prisma migrate deploy` (criaria uma baseline de histórico inconsistente). Deve ser aplicada como SQL puro controlado (ver seção 13, Fase B), exatamente como o arquivo `migration.sql` já foi escrito (idempotente, sem depender de histórico Prisma).

### Resultados de teste (última execução local confirmada, 2026-11-11)

| Suíte | Resultado |
|---|---|
| Backend Jest | 10 suites, **65/65 testes passando** |
| Frontend Vitest | 3 arquivos, **22/22 testes passando** |
| Build frontend (`npm run build`) | **Sucesso** (alguns chunks >500kB — aviso de performance, não bloqueante) |
| `prisma generate` | Client existente válido e funcional; regeneração bloqueada por `EPERM` (arquivo em uso) — não impede testes nem build |

Código inalterado desde essa execução (apenas este documento foi editado nesta sessão) — resultados reutilizados conforme instrução de não repetir testes sem necessidade.

## 13. Plano único de publicação do RBAC (fases A–L)

Nenhuma fase de escrita/publicação foi executada nesta auditoria. Este é o roteiro para execução supervisionada pelo proprietário.

**Trava de segurança contra publicação prematura:** o Vercel faz deploy automático a cada push em `main` (Git Integration confirmada, seção 8) e o Render também acompanha `main`. Antes de integrar a branch RBAC em `main` (Fase F), garantir que a migration SQL (Fase B) e o seed de permissões (Fase D) **já estejam aplicados em produção** — caso contrário, o código novo (que espera as 4 tabelas e 3 colunas) entraria em produção antes do schema existir. Se não for possível aplicar o SQL antes do merge, usar deploy do Render pausado manualmente (`Suspend` no painel) até a Fase C ser validada.

| Fase | Ação | Critério de interrupção/rollback |
|---|---|---|
| A | Prechecks (este documento) + confirmação manual de backup/PITR no Supabase | Sem backup confirmado → não avançar |
| B | Proprietário aplica `migration.sql` manualmente via SQL editor/psql no Supabase (não via `prisma migrate deploy`) | Erro de sintaxe/constraint → abortar, restaurar backup se houve alteração parcial |
| C | Validar: 4 tabelas criadas, 3 colunas em `users`, índices e FKs presentes (consulta somente-leitura) | Qualquer estrutura ausente → não seguir para D |
| D | Proprietário executa `node prisma/seed-permissions.js` apontando para produção (`DATABASE_URL` de produção) | Contagem final ≠ 69 → investigar antes de prosseguir |
| E | Validar `SELECT count(*) FROM permissions` = 69 e amostra de `key`s | Divergência → não criar grupos de acesso ainda |
| F | Merge da branch `feat/atendexa-rbac-access-control` em `main` (PR revisado) — **só depois de B–E concluídas** | Build falhar no CI/Render → não mergear |
| G | Deploy automático do backend no Render a partir de `main` | Healthcheck falhar ou 5xx em `/api/auth/login` → rollback Render para commit anterior |
| H | Testes de autenticação: login de usuário legado (sem grupo), login de `SUPER_ADMIN`, acesso negado a rota sem permissão (verificar `audit_logs`) | Usuário legado perder acesso → rollback imediato |
| I | Deploy automático do frontend no Vercel a partir de `main` | Build falhar → Vercel mantém deployment anterior automaticamente |
| J | Validar `https://www.atendexa.com.br` responde 200 e tela de login funciona | Domínio não resolver/erro 5xx → `request_rollback` no Vercel |
| K | Smoke test: criar grupo de acesso, atribuir permissões, confirmar que módulo liberado/bloqueado reflete na UI | Regressão em módulo existente → investigar antes de liberar a grupos reais |
| L | Relatório final de implantação + atualização deste documento com data/evidência | — |

Autorizações específicas que o proprietário precisa dar antes de iniciar a Fase B: (1) autenticar o conector Supabase ou executar o SQL manualmente; (2) confirmar existência de backup/PITR; (3) autorizar a execução do seed de permissões contra o banco de produção; (4) autorizar o merge para `main`.

## 14. Configuração efetiva do Render (confirmada por captura do painel, RBAC-09C, 2026-11-11)

A seção anterior (8.3) descrevia o Render **apenas a partir do `render.yaml` versionado**, sem confirmação do painel. Nesta auditoria o proprietário forneceu captura do painel Render com a configuração **efetivamente aplicada** ao serviço:

| Item | Valor efetivo (painel Render) |
|---|---|
| Serviço | `helpdesk-atendify` |
| Repositório GitHub | `marcoantunes171989/helpdesk-atendify` |
| Branch | `main` |
| Root Directory | `helpdesk/backend` |
| Build Command | `npm install && npx prisma generate` |
| Start Command | `node src/app.js` |
| Pre-Deploy Command | *(vazio)* |
| Auto-Deploy | On Commit |

### 14.1 Divergências frente a `helpdesk/render.yaml`

O arquivo `helpdesk/render.yaml` versionado **não corresponde** à configuração efetiva acima:

| Campo | `render.yaml` | Painel (efetivo) |
|---|---|---|
| Nome do serviço | `helpdesk-atendify-api` | `helpdesk-atendify` |
| Root Directory | `backend` (via `rootDir`, relativo à raiz do repo `helpdesk-atendify`) | `helpdesk/backend` |
| Build Command | `npm ci --include=dev && npx prisma generate` | `npm install && npx prisma generate` |
| Pre-Deploy Command | não definido no blueprint | vazio (confirmado explicitamente, não apenas omisso) |
| Start Command | `node src/app.js` | `node src/app.js` (igual) |
| Branch/Auto-Deploy | não definido no blueprint (Render infere do repo conectado) | `main` / On Commit (igual na prática) |

**Conclusão**: `helpdesk/render.yaml` **não deve ser considerado automaticamente a configuração efetiva do serviço**. O serviço no painel não está sincronizado como Blueprint a partir desse arquivo (nome e Root Directory diferem), ou foi configurado manualmente por cima dele em algum momento. Qualquer alteração de infraestrutura do Render deve ser verificada diretamente no painel, não inferida do YAML.

### 14.2 Divergência de commit publicado

- `origin/main` (conforme auditoria Git nesta sessão): `1b37bfa`.
- Commit publicado no Render (conforme captura do painel apresentada pelo proprietário): `b5f6b58`.

Esses dois commits **não coincidem**. Isso indica que o backend publicado no Render está rodando um estado do código diferente do HEAD atual de `origin/main` — pode estar atrasado (deploy anterior não disparado/falhado) ou adiantado (commit fora da sequência linear auditada). A causa exata não foi determinada nesta sessão (fora do alcance de uma auditoria somente-leitura local); requer inspeção do histórico de deploys no painel Render pelo proprietário.

### 14.3 Risco de integração da branch RBAC em `main`

Combinando 14.1 e 14.2 com o Auto-Deploy "On Commit" confirmado: ao integrar `feat/atendexa-rbac-access-control` em `main` (Fase F da seção 13), o Render disparará deploy automático a partir do novo HEAD de `main`. Se o commit atualmente publicado (`b5f6b58`) estiver **atrasado** em relação a `origin/main` (`1b37bfa`), esse deploy não trará apenas o código RBAC — trará também **todas as alterações de `main` já mescladas desde `b5f6b58` até `1b37bfa` e ainda não publicadas**, de uma só vez. Isso amplia o escopo de risco do deploy da Fase G além do RBAC isoladamente. **Ação recomendada antes da Fase F**: o proprietário deve revisar o diff entre `b5f6b58` e `1b37bfa` (`git log b5f6b58..1b37bfa`, `git diff b5f6b58..1b37bfa`) para confirmar que nenhuma dessas alterações pendentes é incompatível com um deploy direto em produção.

### 14.4 Controle de execução da migration SQL RBAC

Reforçando e detalhando a seção 13 (Fase B): a migration `backend/prisma/migrations/20261110000001_rbac_access_control/migration.sql` **não deve ser aplicada sem**:
1. **Controle transacional explícito** — envolver a execução em uma transação (`BEGIN`/`COMMIT`) no SQL editor/`psql`, mesmo que o arquivo já use blocos `DO $$ ... EXCEPTION` para idempotência; isso garante que uma falha a meio da execução não deixe o schema em estado parcial.
2. **Validação pré-execução** — confirmar o estado atual do schema (tabelas/colunas que a migration espera criar ainda não existem, ou já existem de forma compatível) antes de rodar.
3. **Validação pós-execução** — confirmar as 4 tabelas, 3 colunas em `users`, índices e FKs (já previsto na Fase C da seção 13).
4. **Backup recuperável previamente confirmado** — não apenas "existência de backup" genérica (seção 12), mas confirmação de que o backup/PITR é efetivamente restaurável antes de iniciar a Fase B, dado que a tabela `_prisma_migrations` está ausente em produção (seção 12) e não há histórico Prisma para apoiar um rollback automatizado.

Nenhuma dessas quatro condições foi executada nesta sessão (fora do alcance de uma auditoria somente-leitura local).
