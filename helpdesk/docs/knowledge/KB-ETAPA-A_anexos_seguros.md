# Central de Conhecimento — Etapa A (anexos seguros)

Status do código: implementado na branch / PR desta etapa.  
Status do banco/storage de produção: **pendente de autorização**.

## O que esta etapa entrega

1. `GET /api/knowledge/:id` **não devolve mais** o base64 dos anexos.
2. Novo `GET /api/knowledge/attachments/:id/download` (auth + `knowledge.read`):
   - `?inline=1` só para tipos seguros (PDF, imagem, texto, vídeo);
   - executáveis e tipos desconhecidos sempre `Content-Disposition: attachment` + `application/octet-stream`;
   - header `X-Content-Type-Options: nosniff`.
3. Validação no servidor no create/update: extensão allowlist, tamanho máx. 10 MB, magic bytes (PDF/PNG/JPG/ZIP/DOCX/XLSX/RAR), bloqueio de SVG/HTML/JS e de `.exe`/`.msi` no upload.
4. Schema: `kb_attachments.storagePath`, `sha256`, `data` nullable.
5. Storage Supabase **opcional**: se `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` estiverem no Render, novos uploads vão para o bucket `kb-files` (ou `KB_STORAGE_BUCKET`). Sem essas variáveis, continua gravando base64 em `data` (legado).
6. Frontend baixa/visualiza via API autenticada (não depende mais do base64 no detalhe).

## Migration (SQL)

Arquivo: `backend/prisma/migrations/20261117000001_kb_attachment_storage/migration.sql`

```sql
ALTER TABLE "kb_attachments" ADD COLUMN "storagePath" TEXT;
ALTER TABLE "kb_attachments" ADD COLUMN "sha256" TEXT;
ALTER TABLE "kb_attachments" ALTER COLUMN "data" DROP NOT NULL;
```

Não apaga anexos existentes. Não remove a coluna `data`.

## Bucket Supabase (opcional, recomendado)

No projeto Supabase do Atendexa (`gnotdvtorbnqfojurlpq`), criar bucket **privado** `kb-files`. Sem políticas públicas de leitura. O backend usa a service role.

Variáveis no Render (`helpdesk-atendify`):

- `SUPABASE_URL` = `https://gnotdvtorbnqfojurlpq.supabase.co`
- `SUPABASE_SERVICE_ROLE_KEY` = (service role, nunca no frontend)
- `KB_STORAGE_BUCKET` = `kb-files` (opcional)

## Ordem segura de publicação

1. Autorizar e aplicar a migration em produção (SQL Editor ou `prisma migrate deploy`).
2. Deploy do backend no Render (merge em `main` dispara se Auto-Deploy estiver ativo).
3. Deploy do frontend na Vercel (mesmo merge).
4. (Opcional) configurar Storage + variáveis; novos uploads passam a usar o bucket.

**Atenção:** publicar só o frontend sem o backend/migration quebra visualização/download de anexos na Central.

## Próximas etapas

- **B** Categorias gerenciáveis (`kb_categories`)
- **C** Tipo + URL + Primeiros Passos
- **D** Visualizações / Mais Acessados
- **E** Favoritos e histórico no servidor
