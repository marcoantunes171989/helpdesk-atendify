# Central de Conhecimento — Etapa B (categorias gerenciáveis)

## Entrega
- Tabela `kb_categories` + `kb_articles.categoryId` (enum legado mantido).
- API:
  - `GET /api/knowledge/categories`
  - `POST /api/knowledge/categories` (`knowledge.create`)
  - `PUT /api/knowledge/categories/:id` (`knowledge.update`)
  - `DELETE /api/knowledge/categories/:id` (`knowledge.update`; desativa se houver artigos)
- Frontend: cartões e formulário usam categorias da API; seção **Categorias** e **Gerenciar Categorias** passam a editar de verdade.
- Backfill: `CONFIGURACAO` → Configurações; `DUVIDA`/`ERRO` → Outros.

## Migration manual
Arquivo: `KB-ETAPA-B_migration_manual.sql` (idempotente, sem apagar artigos).

Ordem: **rodar o SQL no Supabase → merge/deploy Render + Vercel**.

## Sem permissão RBAC nova
Reutiliza `knowledge.create` / `knowledge.update` (já existentes).
