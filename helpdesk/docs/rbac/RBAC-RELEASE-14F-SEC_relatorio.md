# RBAC-RELEASE-14F-SEC — Correção da lacuna de segurança RBAC-09E

> Correção implementada e validada localmente. **Nenhuma alteração foi feita
> em produção.** Nenhum `psql`/SQL Editor foi executado contra o Supabase
> real, nenhum `prisma migrate deploy`/`db push`/`db seed` foi executado,
> nenhum merge, push ou deploy foi realizado nesta sessão.

## 01. Causa da vulnerabilidade

A migration RBAC-09E (tanto a versão operacional
`RBAC-09E_migration_operacional.sql` quanto a migration Prisma
`20261110000001_rbac_access_control/migration.sql`) criava as 4 tabelas
RBAC — `access_groups`, `permissions`, `access_group_permissions`,
`audit_logs` — no schema `public` **sem `ROW LEVEL SECURITY`** e **sem
revogar os privilégios padrão** que o Supabase concede automaticamente às
roles `anon` (visitante não autenticado) e `authenticated` (qualquer sessão
Supabase Auth válida) sobre qualquer tabela nova em `public`.

Isso NÃO é um problema do backend Prisma/Express em si (ele usa autenticação
JWT própria, não Supabase Auth — ver seção 05). O problema é que **toda
tabela em `public` de um projeto Supabase é automaticamente exposta via API
REST (PostgREST)**, independente da aplicação que a criou. Um cliente com
apenas a chave pública `anon` (tipicamente embutida no frontend de qualquer
app Supabase, não é segredo) conseguiria, contra o endpoint REST do projeto:

- Ler todos os grupos de acesso, permissões e vínculos grupo↔permissão.
- Ler todo o log de auditoria (`audit_logs`), incluindo metadados de ações
  administrativas.
- **Escrever diretamente**: inserir um `access_group_permissions` ligando
  qualquer grupo a qualquer permissão (incluindo permissões de
  administração total), ou um `access_groups` falso — **contornando
  completamente** o middleware RBAC (`requirePermission`) e o controller de
  grupos de acesso, pois a escrita ocorre direto no banco, não pela API do
  backend.

Reproduzido e confirmado nesta sessão em ambiente isolado (seção 06/07).

## 02. Arquivos modificados

| Arquivo | Alteração |
|---|---|
| `helpdesk/docs/rbac/RBAC-09E_migration_operacional.sql` | Adiciona `ENABLE ROW LEVEL SECURITY` + `REVOKE` nas 4 tabelas dentro da mesma transação (FASE 1, antes do `COMMIT`); estende a verificação interna pré-commit (agora também aborta se RLS não estiver ativo ou se algum grant residual for encontrado); estende FASE 2 (validação pós-execução) com itens 2.6/2.7/2.8; atualiza o cabeçalho explicando a causa raiz |
| `helpdesk/backend/prisma/migrations/20261110000001_rbac_access_control/migration.sql` | Mesma proteção (RLS + REVOKE condicional) adicionada ao final do arquivo, para manter o artefato Prisma consistente com o SQL operacional corrigido |

Nenhum outro arquivo de código (rotas, middlewares, controllers, schema.prisma,
seed) foi alterado — a correção é puramente de privilégios no banco.

## 03. Alterações SQL

Adicionado, dentro da mesma transação (`BEGIN ... COMMIT`) já existente, logo
após a criação das 4 tabelas e antes da verificação interna pré-commit:

```sql
ALTER TABLE "access_groups" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "permissions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "access_group_permissions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "audit_logs" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "access_groups" FROM PUBLIC;
REVOKE ALL ON TABLE "permissions" FROM PUBLIC;
REVOKE ALL ON TABLE "access_group_permissions" FROM PUBLIC;
REVOKE ALL ON TABLE "audit_logs" FROM PUBLIC;

-- anon/authenticated só existem em projetos Supabase (ausentes em Postgres
-- local/CI) — revogação condicional para manter o script idempotente nos
-- dois ambientes.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE 'REVOKE ALL ON TABLE "access_groups" FROM anon';
    EXECUTE 'REVOKE ALL ON TABLE "permissions" FROM anon';
    EXECUTE 'REVOKE ALL ON TABLE "access_group_permissions" FROM anon';
    EXECUTE 'REVOKE ALL ON TABLE "audit_logs" FROM anon';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    EXECUTE 'REVOKE ALL ON TABLE "access_groups" FROM authenticated';
    EXECUTE 'REVOKE ALL ON TABLE "permissions" FROM authenticated';
    EXECUTE 'REVOKE ALL ON TABLE "access_group_permissions" FROM authenticated';
    EXECUTE 'REVOKE ALL ON TABLE "audit_logs" FROM authenticated';
  END IF;
END $$;
```

Nenhuma `POLICY` foi criada — decisão deliberada: nenhum acesso
público/anônimo/autenticado-via-API é necessário para estas 4 tabelas, que
só devem ser acessadas pelo backend.

A verificação interna pré-commit (já existente, que aborta a transação com
`RAISE EXCEPTION` se tabelas/colunas essenciais faltarem) foi estendida para
também abortar se **qualquer** uma das 4 tabelas estiver sem RLS ativo, ou se
`information_schema.role_table_grants` ainda mostrar algum grant para
`PUBLIC`/`anon`/`authenticated` — isso garante que, se a proteção falhar por
qualquer motivo, a transação inteira é desfeita (nenhuma tabela desprotegida
chega a ser commitada).

A FASE 2 (validação pós-execução, fora de transação) ganhou os itens 2.6
(RLS ativo), 2.7 (ausência de grants residuais) e 2.8 (prova de leitura pela
role de conexão atual, confirmando que o acesso do backend continua
funcionando).

## 04. Modelo de privilégios

| Role | O que é | Acesso às 4 tabelas RBAC após a correção |
|---|---|---|
| `postgres.<project-ref>` (via Session Pooler) | Role efetiva da conexão Prisma do backend (`DATABASE_URL`) — **dona** das tabelas (criou-as na migration) | **Preservado, sem GRANT adicional.** RLS não restringe o dono da tabela por padrão (não há `FORCE ROW LEVEL SECURITY`); `REVOKE ... FROM PUBLIC` não afeta o dono, que tem privilégios implícitos sobre seus próprios objetos |
| `anon` | Role PostgREST para requisições sem autenticação Supabase | **Bloqueado.** RLS ativo sem nenhuma `POLICY` = nenhuma linha visível/gravável; `REVOKE` remove também o acesso em nível de tabela (dupla barreira) |
| `authenticated` | Role PostgREST para requisições com JWT Supabase Auth válido | **Bloqueado** (mesmo mecanismo — o backend não usa Supabase Auth, então nenhum usuário real desta aplicação jamais se autentica como esta role, mas o Supabase concede privilégio padrão a ela mesmo assim; por isso a revogação explícita é necessária) |
| `service_role` | Chave administrativa do Supabase (bypass de RLS) | Fora do escopo desta correção — já teria acesso total por design do Supabase; não é a role usada pelo backend (confirmado na seção 05) e não deve ser confundida com ela |

Não foi necessário nenhum `GRANT` explícito para o backend — ele já é o
dono das tabelas.

## 05. Role efetiva do backend

Confirmado via `helpdesk/backend/prisma/schema.prisma`
(`datasource db { url = env("DATABASE_URL") }`) e via os scripts de
diagnóstico já preparados em sessões anteriores
(`01C-Verificar-Config-Pooler-Local.ps1`, `01D-Teste-Mecanismo-Real.ps1`):

- A conexão do backend é uma connection string PostgreSQL pura (Prisma),
  **não** o cliente `@supabase/supabase-js` e **não** `auth.uid()`/Supabase
  Auth. O middleware de autenticação (`helpdesk/backend/src/middleware/auth.js`)
  usa `jsonwebtoken` com segredo próprio (`JWT_SECRET`), validado contra a
  tabela `users` via Prisma — autenticação 100% própria da aplicação.
- A `DATABASE_URL` de produção usa o **Session Pooler** do Supabase
  (host `*.pooler.supabase.com:5432`), com usuário no formato
  `postgres.<project-ref>` — isto é apenas a forma como o Supavisor
  (pooler) identifica a sessão; a role PostgreSQL efetiva do outro lado é
  `postgres`, a mesma role dona das tabelas (criadas via SQL Editor/`psql`
  manual, nunca via `prisma migrate deploy`).
- **Não é** a chave `service_role` (essa é um JWT usado pelo cliente
  `supabase-js`/PostgREST, não uma credencial de conexão PostgreSQL direta)
  e **não são** `anon`/`authenticated` (essas são roles PostgREST, relevantes
  apenas para quem acessa via API REST automática do Supabase, não para a
  conexão Prisma).

Esta distinção é exatamente a causa raiz do Gate 01: a suposição implícita
de que "nenhuma política pública" bastaria sem tratar `anon`/`authenticated`
ignorava que essas roles concedem acesso **independente** do mecanismo de
autenticação da aplicação.

## 06. Resultados dos testes

Ambiente: PostgreSQL 17 isolado (container Docker `atendexa-rbac-sec-test`,
via WSL, porta aleatória `127.0.0.1:55491`, removido ao final). Roles
sintéticas criadas para reproduzir fielmente o cenário Supabase: `app_backend`
(dona das tabelas, equivalente à role `postgres` de produção), `anon` e
`authenticated` (com os privilégios padrão que o Supabase concede a elas
sobre tabelas novas, replicados via `ALTER DEFAULT PRIVILEGES`). Nenhuma
credencial ou dado real foi usado.

| # | Verificação | Resultado |
|---|---|---|
| 1 | Migration completa (FASE 1, versão corrigida) | ✅ `COMMIT` sem erro |
| 2 | Rollback diante de erro | ✅ Transação truncada para falhar **depois** da criação das 4 tabelas e **antes** da proteção RLS/REVOKE → `ROLLBACK` confirmado, 0 tabelas RBAC persistidas (prova que não existe intervalo de exposição mesmo em falha tardia) |
| 3 | Quatro tabelas criadas | ✅ `access_groups`, `permissions`, `access_group_permissions`, `audit_logs` |
| 4 | Três colunas adicionadas em `users` | ✅ `username`, `accessGroupId`, `tokenVersion` |
| 5 | Oito índices criados | ✅ confirmado via `pg_indexes` |
| 6 | Quatro foreign keys criadas | ✅ confirmado via `DO $$ ... EXCEPTION WHEN duplicate_object` sem erro |
| 7 | RLS habilitado | ✅ `rowsecurity = t` nas 4 tabelas (`pg_tables`) |
| 8 | Privilégios públicos revogados | ✅ `information_schema.role_table_grants` para `PUBLIC`/`anon`/`authenticated` nas 4 tabelas → 0 linhas |
| 9 | Bloqueio efetivo de `anon` | ✅ `SELECT` → `ERROR: permission denied for table access_groups`; `INSERT` → `ERROR: permission denied for table access_groups` (confirmado explicitamente também **antes** da correção: o mesmo `INSERT` como `anon` teve **sucesso** contra a migration original, provando a vulnerabilidade de forma reproduzível) |
| 10 | Bloqueio efetivo de `authenticated` | ✅ `SELECT FROM permissions` → `ERROR: permission denied for table permissions` |
| 11 | Acesso do backend preservado | ✅ `app_backend` (role dona) lê e escreve normalmente nas 4 tabelas sem nenhum `GRANT` adicional; fluxo completo testado: criar `access_groups`, vincular `access_group_permissions`, atribuir `accessGroupId` a um usuário — tudo funcionando |
| 12 | Seed idempotente | ✅ `node prisma/seed-permissions.js` executado 2x contra o banco protegido → `69 permissões sincronizadas` nas duas execuções, sem erro |
| 13 | Integridade dos usuários | ✅ `users` preservada, FK `users_accessGroupId_fkey` funcional, nenhuma linha afetada negativamente |
| 14 | Compatibilidade Prisma | ✅ Prisma Client já gerado localmente funciona sem regeneração contra o schema protegido (RLS/REVOKE não alteram tipos/colunas que o Prisma mapeia) |
| 15 | Reexecução segura da migration | ✅ FASE 1 completa executada uma segunda vez sobre o mesmo banco já migrado → idempotente, sem erro, sem duplicar objetos |

Testes automatizados afetados: **Backend Jest — 65/65 passaram**
(`npm test` em `helpdesk/backend`, mock de Prisma — nenhum teste depende do
schema real, logo não há dependência circular com a correção). Frontend não
foi alterado por esta correção (nenhum código de UI, rota ou middleware foi
modificado) — suíte Vitest não executada nesta sessão por não ser afetada.

## 07. Resultado do seed local

```
[seed-permissions] 69 permissões sincronizadas.
```

Executado 2x consecutivas contra o banco de teste já protegido (RLS +
REVOKE ativos), ambas com sucesso e o mesmo resultado — confirma idempotência
e que o seed (que roda via Prisma, como a role dona das tabelas) não é
afetado pela correção.

## 08. Compatibilidade com Prisma

- `schema.prisma` não precisou de nenhuma alteração: RLS e privilégios de
  role não são modelados pelo Prisma Schema Language e não afetam geração de
  cliente, migrations shadow-database ou introspecção de tipos.
- A migration Prisma (`20261110000001_rbac_access_control/migration.sql`) foi
  atualizada com a mesma proteção, por consistência entre os dois artefatos
  (Gate 04). **Ressalva**: se algum ambiente local de outro contribuidor já
  tiver executado `prisma migrate dev` sobre esta migration antes desta
  correção, o checksum registrado em `_prisma_migrations` **daquele ambiente
  local** vai divergir do arquivo agora editado — o Prisma detectará isso na
  próxima `migrate dev`/`migrate status` e pedirá resolução (recriar o banco
  de desenvolvimento local ou `prisma migrate resolve`). Isso **não afeta
  produção** (confirmado ausência de `_prisma_migrations` em produção — RBAC-09E/RBAC-RELEASE-11) nem o CI (banco efêmero recriado a cada execução).
- CI (`atendexa-ci.yml`) roda apenas `prisma generate` com `DATABASE_URL`
  fictícia (não executa `migrate deploy`/`db push` contra banco real) —
  nenhum impacto.

## 09. Riscos remanescentes

1. **Escopo da correção é só RBAC-09E.** Não foi auditado se outras tabelas
   pré-existentes do projeto (`users`, `tickets`, etc.) têm o mesmo problema
   de exposição via PostgREST — isso está fora do escopo explícito desta
   tarefa, mas é um risco sistêmico que deveria ser avaliado separadamente
   (nenhum uso de RLS foi encontrado em nenhum lugar do schema/migrations
   auditados nesta sessão).
2. **Confirmação em produção pendente.** A correção foi validada em
   PostgreSQL 17 isolado com roles sintéticas que replicam o comportamento
   documentado do Supabase (privilégios padrão a `anon`/`authenticated`).
   A aplicação real em produção exige execução supervisionada (FASE 0 → FASE 1
   → FASE 2 do script operacional atualizado) contra o Supabase real, com
   backup confirmado antes (ver pendências RBAC-10B/RBAC-RELEASE-13N).
3. **Checksum Prisma local.** Ver ressalva na seção 08 — qualquer ambiente
   de desenvolvimento que já tenha aplicado a migration original precisa
   recriar o banco local ou resolver o checksum.
4. **Possível necessidade de `service_role` no futuro.** Caso alguma
   funcionalidade futura precise acessar estas tabelas via Supabase Storage,
   Edge Functions ou PostgREST intencionalmente, será necessário desenhar
   policies específicas — hoje, deliberadamente, nenhum acesso via API
   Supabase é permitido.

## 10. Situação do PR #9

Não foi mergeado, fechado ou alterado nesta sessão (fora do escopo
autorizado — "Não realizar merge"). As alterações desta correção ainda não
foram comitadas (ver seção 12); cabe ao proprietário decidir se entram no
PR #9 existente ou em um PR dedicado de segurança.

## 11. Risco de deploy automático

**Achado relevante e discordante da premissa da tarefa.** A tarefa instrui
"o proprietário definiu deploy manual sob demanda" para o Render, mas a
documentação já existente neste repositório (`CICD.md`, seção 1.3, e
`RBAC-RELEASE-14A/14C_relatorio.md`) registra o **último estado confirmado**
do painel Render (sessão de 2026-11-11) como:

> Auto-Deploy: **"On Commit"** a partir de `main` — ainda **não** alterado
> para "After CI Checks Pass"/manual, por falta de conector/API do Render
> disponível para confirmar ou aplicar a mudança.

Esta sessão também não tem MCP/API do Render disponível — não foi possível
reconfirmar o estado atual do painel, nem alterá-lo (fora do escopo
autorizado: "Não modificar as configurações de produção nesta etapa").

**Conclusão**: salvo confirmação em contrário pelo proprietário diretamente
no painel Render (`Settings → Build & Deploy → Auto-Deploy`), deve-se
assumir que **mergear o PR #9 em `main` dispara um deploy automático do
backend no Render**, antes de qualquer migration/seed terem sido aplicados
manualmente em produção — o que seria uma falha de ordem (código esperando
colunas/tabelas que ainda não existem). O procedimento necessário para
evitar isso, sem o Render MCP:

1. Proprietário acessa o painel Render → `helpdesk-atendify` → `Settings` →
   confirma e, se necessário, muda `Auto-Deploy` de "On Commit" para "Off"
   ou "After CI Checks Pass" **antes** do merge do PR #9.
2. Alternativa sem alterar o painel: aplicar a migration (FASE 1 do SQL
   corrigido) e o seed em produção **antes** do merge — assim, mesmo que o
   deploy automático dispare no merge, o schema já estará compatível com o
   código. Esta é a ordem já documentada em `RBAC-RELEASE-14A`
   (banco → validação → seed → **só então** merge → deploy).

## 12. Estado Git

Branch: `feat/atendexa-rbac-access-control` (sem commits novos desta sessão
até a entrega deste relatório — nenhum commit/push foi feito, conforme
restrição "Não realizar commit ou push sem autorização").

Arquivos modificados nesta sessão (não comitados):

```
M helpdesk/backend/prisma/migrations/20261110000001_rbac_access_control/migration.sql
M helpdesk/docs/rbac/RBAC-09E_migration_operacional.sql
```

(Os demais arquivos `M`/`??` already presentes no `git status` no início da
sessão — scripts de backup e relatórios de sessões anteriores — não foram
tocados por esta tarefa.)

## 13. Próxima ação para implantação

1. Proprietário revisa este relatório e o diff dos dois arquivos SQL.
2. Confirmar/ajustar o Auto-Deploy do Render (seção 11) **antes** do merge.
3. Confirmar backup lógico válido do Supabase (pendência já registrada em
   RBAC-10B/RBAC-RELEASE-13N — não repetida aqui).
4. Executar manualmente, nesta ordem, contra o Supabase real (SQL Editor/
   `psql` supervisionado, nunca `prisma migrate deploy`):
   `RBAC-09E_fase0_verificacao_unica.sql` (leitura) → FASE 1 do
   `RBAC-09E_migration_operacional.sql` corrigido → FASE 2 (validação,
   incluindo os novos itens 2.6/2.7/2.8) → `node prisma/seed-permissions.js`
   apontando para produção.
5. Só então autorizar o merge do PR #9 e o deploy (coordenado com o item 2).

## Classificação

**SEC_CORRIGIDA_E_VALIDADA**

A correção foi implementada nos dois artefatos SQL, validada de ponta a
ponta em ambiente isolado (vulnerabilidade reproduzida, corrigida, e todas
as 15 verificações do Gate 05 confirmadas), e a suíte Jest do backend
(65/65) continua passando. A classificação é condicionada à execução
supervisionada em produção (seção 13) e à resolução do risco de deploy
automático do Render (seção 11), ambas pendentes de ação do proprietário e
fora do escopo autorizado desta sessão.
