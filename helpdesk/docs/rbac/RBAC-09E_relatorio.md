# RBAC-09E — Preparação operacional e definitiva da migração RBAC

> Relatório de preparação. **Nenhuma operação de escrita foi executada em produção.**
> Nenhum commit, branch, deploy ou seed foi realizado nesta sessão.

## 1. Situação do Git

- Branch atual: `feat/atendexa-rbac-access-control`.
- HEAD: `dceae86` (`docs(infra): documenta infraestrutura oficial Vercel/Supabase/Render e pendencias de auditoria`).
- Working tree: alteração local não commitada em `helpdesk/docs/INFRAESTRUTURA.md` (105 inserções / 17 remoções), preservada e não tocada nesta sessão.
- Nesta sessão foram apenas **criados** dois arquivos novos, não commitados:
  - `helpdesk/docs/rbac/RBAC-09E_migration_operacional.sql`
  - `helpdesk/docs/rbac/RBAC-09E_relatorio.md` (este arquivo)
- Nenhuma branch, commit, push ou merge foi realizado.

## 2. Arquivo SQL operacional preparado

`helpdesk/docs/rbac/RBAC-09E_migration_operacional.sql` — cópia reorganizada (não substitui o original) de
`helpdesk/backend/prisma/migrations/20261110000001_rbac_access_control/migration.sql`, com:

- **FASE 0**: pré-verificação somente leitura (tabelas, colunas, índices conflitantes, confirmação de ausência de `_prisma_migrations`).
- **FASE 1**: `BEGIN` ... DDL idempotente (igual ao original: `ADD COLUMN IF NOT EXISTS`, `CREATE TABLE/INDEX IF NOT EXISTS`, FKs em blocos `DO $$ ... EXCEPTION WHEN duplicate_object`) ... validação interna via `DO $$` que força `RAISE EXCEPTION` (e portanto rollback automático) se alguma tabela/coluna esperada não existir antes do `COMMIT` ... `COMMIT` explícito (comentado como passo deliberado, não automático).
- **FASE 2**: validação pós-execução somente leitura (contagem de tabelas, colunas, índices, FKs, e verificação de que nenhum usuário existente foi afetado).
- Seção de **estratégia de erro**: documenta o comportamento de transação abortada do Postgres e o procedimento de `ROLLBACK` + reexecução da Fase 0.

O arquivo original da migration **não foi alterado**.

## 3. Resultado da revisão técnica

Revisão integral de `migration.sql` (84 linhas):

- Totalmente aditiva: 3 `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` em `users`, 4 `CREATE TABLE IF NOT EXISTS`, 8 índices (`CREATE UNIQUE/INDEX IF NOT EXISTS`), 4 FKs em blocos protegidos contra `duplicate_object`.
- **Nenhum** `DROP`, `TRUNCATE`, `RENAME` ou alteração de tipo/coluna existente.
- `tokenVersion` usa `DEFAULT 0` — sessões JWT já emitidas continuam válidas (o backend já trata `decoded.tokenVersion || 0`, confirmado em `INFRAESTRUTURA.md` §12).
- Risco residual identificado (já documentado em `INFRAESTRUTURA.md` §14.4, reforçado aqui): `IF NOT EXISTS` evita erro de duplicidade, mas **não valida compatibilidade de estrutura** se um objeto homônimo já existir com forma diferente (tipo de coluna, nullability, etc.). É por isso que a FASE 0 do script operacional existe como gate obrigatório antes da FASE 1 — ela é o mecanismo concreto que cobre essa lacuna, não apenas uma observação textual.
- Schema Prisma (`schema.prisma`) confirma consistência: `username String? @unique`, `accessGroupId String?` (+ relação), `tokenVersion Int @default(0)` — compatível com o SQL gerado.

## 4. Consultas de validação

Todas incluídas na FASE 0 e FASE 2 do arquivo SQL operacional (seção 2). Resumo:

| Momento | Consulta | Resultado esperado |
|---|---|---|
| Antes | tabelas RBAC em `information_schema.tables` | 0 linhas |
| Antes | colunas RBAC em `users` | 0 linhas |
| Antes | `_prisma_migrations` existe? | 0 linhas |
| Antes | índices com nomes conflitantes | 0 linhas, ou idênticos ao esperado |
| Depois | tabelas RBAC | 4 linhas |
| Depois | colunas RBAC em `users` | 3 linhas |
| Depois | índices RBAC | 8 linhas |
| Depois | FKs RBAC | 4 linhas |
| Depois | contagem de usuários antes/depois | igual; `tokenVersion=0` e `accessGroupId IS NULL` para todos os usuários legados |

## 5. Plano de execução do seed

`helpdesk/backend/prisma/seed-permissions.js` revisado — idempotente (`upsert` por `key`), não escreve em `access_groups`, `access_group_permissions` nem `users`. Catálogo (`src/permissions/catalog.js`) gera exatamente **18 módulos** e **69 permissões** (confirmado por geração programática, consistente com a auditoria já registrada em `INFRAESTRUTURA.md` §12).

Procedimento supervisionado (só após FASE 2 do SQL validada com sucesso):

1. Proprietário define `DATABASE_URL` apontando para produção **apenas no ambiente de execução do comando**, nunca commitado.
2. Executar manualmente: `node prisma/seed-permissions.js` (não está ligado ao `start`, confirmado no cabeçalho do script).
3. Validar no banco:
   ```sql
   SELECT count(*) FROM permissions;                 -- esperado: 69
   SELECT module, count(*) FROM permissions GROUP BY module ORDER BY module; -- esperado: 18 módulos
   SELECT key FROM permissions ORDER BY key LIMIT 10; -- amostra para conferência manual
   ```
4. Critério de interrupção: contagem final ≠ 69, ou módulos ≠ 18 → não criar grupos de acesso ainda; investigar divergência entre catálogo e banco antes de prosseguir.

## 6. Procedimento de identidade Supabase

Objetivo: confirmar que o Supabase aberto no SQL Editor é o **mesmo** projeto que a API em produção (Render) usa — sem solicitar senha ou connection string completa.

1. No painel **Render → helpdesk-atendify → Environment**, localizar `DATABASE_URL` (ou `DIRECT_URL`). Pedir ao proprietário para ler **apenas o host**, por exemplo `db.<project-ref>.supabase.co` ou, se via pooler, `aws-0-<region>.pooler.supabase.com` com o parâmetro `?options=project%3D<project-ref>` ou usuário no formato `postgres.<project-ref>`. **Não** solicitar a string inteira nem a senha.
2. No painel **Supabase → Project Settings → General**, ler o `Reference ID` do projeto aberto no SQL Editor.
3. Comparar o `<project-ref>` extraído do host/usuário do passo 1 com o `Reference ID` do passo 2. São o **mesmo identificador** apenas se coincidirem exatamente.
4. **Atenção ao pooler**: conexões via Supavisor/pgbouncer usam um host compartilhado por região (ex.: `aws-0-sa-east-1.pooler.supabase.com`), igual para múltiplos projetos — o host por si só **não identifica o projeto** nesse modo. Nesse caso, o identificador correto está no **usuário** da connection string (`postgres.<project-ref>`), não no host.
5. O nome de usuário `postgres` isoladamente **não é suficiente** para identificar o projeto (é o usuário padrão em todo projeto Supabase) — sempre usar o `<project-ref>`.
6. Critério de interrupção: se os identificadores não coincidirem, **parar imediatamente** — o SQL Editor aberto pode ser de um projeto diferente do que está em produção. Reabrir o projeto correto antes de qualquer execução.

## 7. Procedimento de backup

Antes de qualquer execução (Fase A do plano em `INFRAESTRUTURA.md` §13):

1. Confirmar **plano Supabase** (Free/Pro/Team) no painel → `Project Settings → Billing`. Planos Free não têm backup automático diário garantido da mesma forma que planos pagos.
2. Confirmar em `Project Settings → Database → Backups`:
   - Existência de backup automático ativo.
   - Data/hora da **última execução concluída com sucesso** (não apenas "agendada").
   - **Período de retenção** configurado.
   - Disponibilidade de **restauração** (botão/fluxo de restore habilitado, não apenas listagem).
3. Se o plano/configuração não garantir PITR (Point-in-Time Recovery) ou backup recente, solicitar ao proprietário uma **exportação complementar manual**: `pg_dump` via connection string, executado localmente pelo próprio proprietário (nunca compartilhando a string com este assistente).
4. Quando viável, testar a restauração desse backup/export em um **ambiente separado** (projeto Supabase de teste ou banco local) antes de autorizar a Fase B — isso é o único jeito de confirmar que o backup é **recuperável**, não apenas "existente".
5. **Não afirmar backup confirmado sem evidência concreta** (captura do painel, timestamp da última execução, ou resultado do teste de restauração). Na ausência dessa evidência, o status permanece "não confirmado" e a Fase B não deve avançar.

## 8. Estratégia de publicação

Reaproveita o plano de fases A–L já documentado em `INFRAESTRUTURA.md` §13, com a trava de segurança já registrada: como o Render está em `Auto-Deploy On Commit` e o Vercel também dispara deploy automático a partir de `main`, a migration SQL (Fase B) e o seed (Fase D) **devem** estar aplicados e validados em produção **antes** do merge da branch RBAC em `main` (Fase F) — caso contrário o código novo entra em produção esperando tabelas/colunas que ainda não existem.

Adicionalmente, considerando a divergência de commit publicado já identificada (`INFRAESTRUTURA.md` §14.2/14.3: Render publicado em `b5f6b58`, `origin/main` em `1b37bfa`): antes da Fase F, revisar `git log b5f6b58..1b37bfa` para confirmar que o deploy do Render na Fase G não trará, junto com o RBAC, mudanças pendentes de `main` ainda não avaliadas para produção.

## 9. Critérios de interrupção

- FASE 0 do SQL: qualquer tabela/coluna/índice já existente com estrutura diferente da esperada, ou `_prisma_migrations` presente.
- FASE 1 do SQL: qualquer erro antes do `COMMIT` (a validação interna via `DO $$` força isso automaticamente caso algo esperado não exista ao final da transação).
- FASE 2 do SQL: contagens de tabelas (≠4), colunas (≠3), índices (≠8) ou FKs (≠4) fora do esperado.
- Seed: contagem final de permissões ≠ 69 ou módulos ≠ 18.
- Pós-deploy (Fases G–J do plano): 5xx sistemático em `/api/auth/login` ou `/api/tickets`, falha de migration, usuário perdendo acesso indevidamente ou ganhando acesso indevido.
- Identidade Supabase: `project-ref` do painel ≠ `project-ref` inferido da conexão de produção.
- Backup: ausência de evidência concreta de backup recuperável.

## 10. Procedimento de recuperação

- **Banco**: restaurar a partir do backup/PITR Supabase confirmado na seção 7, anterior à execução da FASE 1. Não tentar reverter manualmente uma migration aditiva em produção sem esse backup — especialmente sem `_prisma_migrations` para apoiar qualquer rollback automatizado.
- **Render**: reverter para o commit anterior estável (`b5f6b58` ou o commit efetivo antes da Fase F) e forçar novo deploy.
- **Vercel**: `request_rollback` / "Promote" para o deployment anterior READY.
- Em qualquer rollback, revalidar a FASE 0 do SQL operacional (somente leitura) para confirmar o estado real do schema antes de decidir o próximo passo.

## 11. Autorizações necessárias antes de avançar

1. Confirmação humana de que a identidade do projeto Supabase (seção 6) foi verificada e corresponde à produção.
2. Evidência concreta de backup recuperável (seção 7) — captura de tela ou confirmação textual com timestamp.
3. Autorização explícita para executar a FASE 1 do SQL operacional (seção 2) no SQL Editor de produção.
4. Autorização explícita para executar o seed de permissões (seção 5) contra `DATABASE_URL` de produção.
5. Autorização explícita para o merge de `feat/atendexa-rbac-access-control` em `main` — apenas após 3 e 4 estarem concluídas e validadas (Fases B–E do plano em `INFRAESTRUTURA.md` §13).

## 12. Status final

- Preparação técnica **completa**: SQL operacional revisado e documentado, seed revisado, procedimentos de identidade/backup/publicação/rollback definidos.
- **Nenhuma operação de produção foi executada**: nenhum SQL rodou no Supabase, nenhum seed rodou, nenhum commit/branch/push/merge/deploy foi feito nesta sessão.
- Pendências que dependem exclusivamente do proprietário (já listadas em `INFRAESTRUTURA.md` §12, reconfirmadas aqui): autenticação do conector Supabase (ou verificação manual equivalente), confirmação de backup com evidência, confirmação da identidade do projeto Supabase de produção, e autorização formal para cada uma das quatro ações da seção 11.
- Pronto para a Fase A→B do plano em `INFRAESTRUTURA.md` §13 tão logo as autorizações da seção 11 sejam concedidas.
