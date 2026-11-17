# Central de Conhecimento — Etapa D (visualizações)

## Entrega
- `kb_articles.viewCount` (default 0)
- Tabela `kb_article_views` (userId + articleId) para throttle: no máximo 1 contagem por usuário/artigo a cada 1 hora
- `GET /api/knowledge/:id` registra visualização em background
- `GET /api/knowledge?sort=views` ordena por `viewCount`
- Aba **Mais Acessados** deixa de ser “Em breve” e lista por visualizações
- Cards mostram o contador quando > 0

## Migration
`KB-ETAPA-D_migration_manual.sql`

Ordem: SQL → merge → Render + Vercel.
