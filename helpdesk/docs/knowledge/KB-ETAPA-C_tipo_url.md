# Central de Conhecimento — Etapa C (tipo, URL, Primeiros Passos)

## Entrega
- Colunas em `kb_articles`: `contentType` (ARTIGO|MANUAL|VIDEO|DOWNLOAD|LINK), `externalUrl`, `featured`.
- Validação de URL: somente `https://`, sem credenciais embutidas.
- Formulário: tipo explícito, URL externa (links/vídeos), switch **Primeiros Passos**.
- Seções da Central usam o tipo do banco quando preenchido; senão mantêm a heurística antiga.
- Destaques / Primeiros Passos: `featured=true` (tags antigas ainda funcionam).

## Migration manual
`KB-ETAPA-C_migration_manual.sql` — inclui backfill por tags.

Ordem: SQL no Supabase → merge → Render + Vercel.
