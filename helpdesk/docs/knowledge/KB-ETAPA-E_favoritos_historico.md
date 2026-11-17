# Central de Conhecimento — Etapa E (favoritos e histórico)

## Entrega
- Tabelas `kb_favorites` e `kb_history` (por usuário).
- API:
  - `GET /api/knowledge/me/favorites`
  - `PUT|DELETE /api/knowledge/:id/favorite`
  - `GET|DELETE /api/knowledge/me/history`
  - `POST /api/knowledge/me/import-local` (migração única do localStorage)
- Frontend sincroniza com a conta; grade/lista continua no navegador.
- Na primeira carga após o deploy, importa favoritos/histórico locais uma vez.

## Migration
`KB-ETAPA-E_migration_manual.sql`

Ordem: SQL → merge → Render + Vercel.
