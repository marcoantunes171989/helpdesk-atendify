-- ============================================================================
-- PERF-01 — Índices de performance (execução manual no SQL Editor do Supabase)
-- ============================================================================
-- O Postgres NÃO cria índice automaticamente em colunas de chave estrangeira.
-- Sem eles, filtros e joins usados nas telas (chamados por empresa/status,
-- funcionários por empresa, cidades por estado, comentários/anexos por chamado
-- etc.) fazem varredura completa da tabela.
--
-- Script 100% aditivo e idempotente (IF NOT EXISTS). Nenhum DROP/ALTER de dado.
-- Nomes seguem o padrão do Prisma (<tabela>_<coluna>_idx).
--
-- Não usa CONCURRENTLY porque o SQL Editor executa em transação. Com o volume
-- atual das tabelas o lock de escrita dura poucos segundos; execute fora do
-- horário de pico.
-- ============================================================================

-- Chamados (tela mais acessada)
CREATE INDEX IF NOT EXISTS "tickets_companyId_idx"     ON "tickets"("companyId");
CREATE INDEX IF NOT EXISTS "tickets_statusId_idx"      ON "tickets"("statusId");
CREATE INDEX IF NOT EXISTS "tickets_status_idx"        ON "tickets"("status");
CREATE INDEX IF NOT EXISTS "tickets_categoryId_idx"    ON "tickets"("categoryId");
CREATE INDEX IF NOT EXISTS "tickets_userId_idx"        ON "tickets"("userId");
CREATE INDEX IF NOT EXISTS "tickets_assignedTo_idx"    ON "tickets"("assignedTo");
CREATE INDEX IF NOT EXISTS "tickets_technicianId_idx"  ON "tickets"("technicianId");
CREATE INDEX IF NOT EXISTS "tickets_employeeId_idx"    ON "tickets"("employeeId");
CREATE INDEX IF NOT EXISTS "tickets_createdAt_idx"     ON "tickets"("createdAt");

CREATE INDEX IF NOT EXISTS "ticket_comments_ticketId_idx"               ON "ticket_comments"("ticketId");
CREATE INDEX IF NOT EXISTS "ticket_attachments_ticketId_idx"            ON "ticket_attachments"("ticketId");
CREATE INDEX IF NOT EXISTS "ticket_comment_attachments_commentId_idx"   ON "ticket_comment_attachments"("commentId");

-- Cadastros
CREATE INDEX IF NOT EXISTS "employees_companyId_idx"   ON "employees"("companyId");
CREATE INDEX IF NOT EXISTS "cities_stateId_idx"        ON "cities"("stateId");
CREATE INDEX IF NOT EXISTS "categories_companyId_idx"  ON "categories"("companyId");
CREATE INDEX IF NOT EXISTS "kb_attachments_articleId_idx" ON "kb_attachments"("articleId");

-- RBAC (vínculo grupo → permissão já tem unique composto; falta o lado da permissão)
CREATE INDEX IF NOT EXISTS "access_group_permissions_permissionId_idx" ON "access_group_permissions"("permissionId");

-- CRM
CREATE INDEX IF NOT EXISTS "crm_contacts_companyId_idx"          ON "crm_contacts"("companyId");
CREATE INDEX IF NOT EXISTS "crm_opportunities_companyId_idx"     ON "crm_opportunities"("companyId");
CREATE INDEX IF NOT EXISTS "crm_activities_companyId_idx"        ON "crm_activities"("companyId");
CREATE INDEX IF NOT EXISTS "crm_activities_opportunityId_idx"    ON "crm_activities"("opportunityId");

-- Implantações / Treinamentos / Visitas
CREATE INDEX IF NOT EXISTS "implantacoes_companyId_idx"                     ON "implantacoes"("companyId");
CREATE INDEX IF NOT EXISTS "implantacao_fases_implantacaoId_idx"            ON "implantacao_fases"("implantacaoId");
CREATE INDEX IF NOT EXISTS "treinamentos_companyId_idx"                     ON "treinamentos"("companyId");
CREATE INDEX IF NOT EXISTS "treinamento_participantes_treinamentoId_idx"    ON "treinamento_participantes"("treinamentoId");
CREATE INDEX IF NOT EXISTS "etapas_treinamento_moduloId_idx"                ON "etapas_treinamento"("moduloId");
CREATE INDEX IF NOT EXISTS "visitas_companyId_idx"                          ON "visitas"("companyId");
CREATE INDEX IF NOT EXISTS "visitas_technicianId_idx"                       ON "visitas"("technicianId");

-- Atualiza estatísticas do planejador para que os índices novos sejam usados já.
ANALYZE "tickets";
ANALYZE "ticket_comments";
ANALYZE "ticket_attachments";
ANALYZE "employees";
ANALYZE "cities";

-- Validação (esperado: todas as linhas listadas acima)
SELECT tablename, indexname
FROM pg_indexes
WHERE schemaname = 'public' AND indexname LIKE '%\_idx' ESCAPE '\'
ORDER BY tablename, indexname;
