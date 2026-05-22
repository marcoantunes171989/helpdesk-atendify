-- Criar bucket de recibos se não existir
INSERT INTO storage.buckets (id, name, public) 
VALUES ('recibos-vendas', 'recibos-vendas', true)
ON CONFLICT (id) DO NOTHING;

-- Política para leitura pública
CREATE POLICY "Recibos são públicos" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'recibos-vendas');

-- Política para upload por usuários autenticados
CREATE POLICY "Usuários autenticados podem fazer upload de recibos" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'recibos-vendas' AND auth.role() = 'authenticated');
