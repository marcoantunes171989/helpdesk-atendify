# Central de Conhecimento — Fase 2 (proposta de backend)

Status: **em andamento por etapas** (A→B→C→D→E). Etapa A implementada no código — migration/storage de produção dependem de autorização.

## Situação atual (Fase 1, só frontend)

| Recurso | Como funciona hoje | Limitação |
|---|---|---|
| Categorias | `KbCategory` = DUVIDA, ERRO, CONFIGURACAO. Mapeadas para os cards: CONFIGURACAO → Configurações; DUVIDA e ERRO → Outros | Treinamentos, Operação do Sistema, Equipamentos e Fiscal sempre mostram 0 |
| Tipo de conteúdo | Derivado no frontend (tag explícita → anexos → URL de vídeo → URL curta → artigo) | Sem campo próprio; depende de convenção de tags |
| Links úteis | URL dentro do texto do conteúdo | Sem campo de URL validado no servidor |
| Mais Acessados | Estado "Em breve" | Não existe contagem de visualizações |
| Favoritos / Histórico | `localStorage` por usuário (`kb:favorites:<id>`, `kb:history:<id>`) | Não sincroniza entre dispositivos; some ao limpar o navegador |
| Arquivos | Base64 na coluna `kb_attachments.data`, corpo JSON até 20 MB | Infla o banco; `GET /:id` devolve todos os anexos inteiros; inviável para vídeo e instaladores grandes |
| Validação de arquivo | Allowlist de extensão e 10 MB só no frontend | Servidor aceita qualquer MIME |

## Mudanças propostas

### 1. Categorias
Opção A (recomendada): tabela `kb_categories` (id, key, label, icon, sortOrder, active) e `kb_articles.categoryId` (FK, nullable na migração). Permite "Gerenciar Categorias" de verdade.
Opção B: estender o enum com TREINAMENTO, OPERACAO, EQUIPAMENTO, FISCAL, OUTROS. Mais simples, mas categorias continuam fixas no código.

Migração de dados (qualquer opção): CONFIGURACAO → Configurações; DUVIDA/ERRO → Outros (ou mantidos como categorias próprias, a decidir). Nenhum conteúdo é apagado; a coluna antiga fica até validação.

### 2. Tipo e URL
- `kb_articles.contentType` enum ARTIGO, MANUAL, VIDEO, DOWNLOAD, LINK (default ARTIGO; backfill com a mesma regra do frontend).
- `kb_articles.externalUrl` (nullable), validado no servidor: apenas `https:`; sem `javascript:`/`data:`.
- Novo campo opcional `kb_articles.featured` / `isIntro` para "Primeiros Passos" (hoje vem de tag).

### 3. Visualizações (Mais Acessados)
- `kb_articles.viewCount Int @default(0)` incrementado em `GET /api/knowledge/:id`, ou tabela `kb_views (articleId, userId, viewedAt)` se quiser deduplicar por usuário/período.
- `GET /api/knowledge?sort=views`.

### 4. Favoritos e histórico no servidor
- `kb_favorites (userId, articleId, createdAt)` PK composta.
- `kb_history (userId, articleId, viewedAt)` com limite de N por usuário.
- Endpoints: `GET/PUT/DELETE /api/knowledge/:id/favorite`, `GET /api/knowledge/me/favorites`, `GET /api/knowledge/me/history`, `DELETE /api/knowledge/me/history`.
- Importação única do `localStorage` atual na primeira carga após o deploy.

### 5. Armazenamento de arquivos
- Supabase Storage, bucket **privado** `kb-files`; `kb_attachments` ganha `storagePath`, mantém `data` até migrar os anexos existentes (sem apagar).
- Upload via multipart (`multer`) ou URL assinada de upload; limite por tipo (ex.: 25 MB documentos, 200 MB instaladores/vídeos — a definir).
- `GET /api/knowledge/:id` deixa de retornar `data`; novo `GET /api/knowledge/attachments/:id/download` → URL assinada curta, `Content-Disposition: attachment`.
- `knowledge.read` exigido no download.

### 6. Validação no servidor
- Allowlist de extensão + MIME + checagem de assinatura (magic bytes) para pdf/png/jpg/zip/docx/xlsx.
- `.exe`/`.msi`: aceitos somente com permissão específica (ex.: `knowledge.upload_executable`), sempre servidos como `application/octet-stream` com `attachment`, nunca inline. Opcional: hash SHA-256 exibido na tela.
- Nome de arquivo sanitizado; SVG/HTML recusados ou servidos só como download.

### 7. Permissões novas (seed RBAC)
- `knowledge.manage_categories`, `knowledge.upload_executable` (se aprovados).

## Ordem sugerida
1. Storage + endpoint de download + validação (resolve risco e peso do banco).
2. Categorias + tipo + URL (habilita os cards e seções sem heurística).
3. Visualizações, favoritos e histórico.

Cada etapa: migration testada em homologação → aprovação → produção. Nenhuma remoção de coluna antes de validar os dados migrados.
