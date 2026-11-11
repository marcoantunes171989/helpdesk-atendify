# Atendexa — Infraestrutura Oficial

> Documento de referência permanente. Toda manutenção, deploy ou alteração de infraestrutura deve seguir as regras abaixo. Última auditoria: 2026-11-11.

## 1. Identidade do projeto

| Item | Valor |
|---|---|
| Projeto Vercel oficial | `helpdesk-atendify` (`prj_q8XH6M3sBuidepqVTurXP6vmHMiY`) |
| Domínio oficial | `www.atendexa.com.br` (apex `atendexa.com.br` redireciona para `www`) |
| Domínio auxiliar | `suporte.atendexa.com.br` |
| Repositório GitHub | `marcoantunes171989/helpdesk-atendify` |
| Branch de produção | `main` |
| Time Vercel | `Marco Antonio's projects` (`team_iIylzmG0qcwYy1eKH7gRWrAI`) |
| Backend | Render — serviço `helpdesk-atendify-api` (ver `helpdesk/render.yaml`) |
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

**Ainda existe** no Vercel (não foi excluído até esta auditoria):

| Item | Valor |
|---|---|
| ID | `prj_0KP84BERSSFS0symLk0ALhBkD9W0` |
| Domínios | `atendexa-validacao.vercel.app`, `atendexa-validacao-marco-antonio-antunes-junior-1989.vercel.app` |
| Último deploy | READY, criado em 2026-11-15 (timestamp `1794358310513`) |

A API do Vercel **não permite exclusão direta de projeto via MCP** — a ferramenta disponível (`get_project_deletion_link`) apenas gera o link do dashboard para confirmação manual do titular da conta. Portanto a exclusão deste projeto continua **pendente de ação manual** pelo proprietário da conta em: Vercel Dashboard → `atendexa-validacao` → Settings → Delete Project. Não presumir que a exclusão ocorreu até nova verificação confirmar o desaparecimento do projeto na listagem.

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
2. Merge em `main` dispara deploy automático no Vercel (frontend) — **confirmar que o Git Integration do projeto `helpdesk-atendify` está de fato conectado ao branch `main` antes de depender disso**; esta auditoria não conseguiu confirmar o campo de integração Git via API (ver seção 10).
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

## 12. Pendências desta auditoria (2026-11-11)

- **Vercel**: projeto paralelo `atendexa-validacao` ainda não excluído — ação manual necessária no dashboard (ver seção 3).
- **Vercel**: Git Integration (branch de produção conectada, auto-deploy) não pôde ser confirmada via API/MCP nesta sessão — o retorno de `get_project` não trouxe o campo `link` de repositório Git. Confirmar manualmente em Project Settings → Git.
- **Supabase**: conector MCP `claude.ai Supabase` não está autenticado nesta sessão. Não foi possível inspecionar schema, migrations aplicadas, triggers/functions ou backups diretamente. Autenticar via `/mcp` → "claude.ai Supabase" para uma próxima auditoria.
- **Supabase (local)**: `npx prisma migrate status` falhou localmente por falta de `DIRECT_URL`/`DATABASE_URL` no ambiente — não há credenciais de produção configuradas nesta máquina, então o status real das migrations em produção não foi verificado nesta sessão.
- **Render**: não há conector/MCP do Render disponível nesta sessão. As informações de build/start command e variáveis vêm apenas do `render.yaml` versionado no repo; não foi possível confirmar no painel Render se o serviço realmente usa esse arquivo (Blueprint) ou configuração manual equivalente, nem a versão exata do Node em execução, nem o estado real do "Auto-Deploy".
