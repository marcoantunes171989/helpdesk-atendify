-- Etapa A: anexos com Storage opcional. Não apaga conteúdos existentes.
ALTER TABLE "kb_attachments" ADD COLUMN "storagePath" TEXT;
ALTER TABLE "kb_attachments" ADD COLUMN "sha256" TEXT;
ALTER TABLE "kb_attachments" ALTER COLUMN "data" DROP NOT NULL;
