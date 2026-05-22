-- 1. Adicionar coluna user_id para rastreabilidade se não existir
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tab_visitas' AND column_name = 'user_id') THEN
        ALTER TABLE public.tab_visitas ADD COLUMN user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid();
    END IF;
END $$;

-- 2. Atualizar registros existentes com o UID atual (se houver apenas um usuário ou para evitar nulos)
UPDATE public.tab_visitas SET user_id = auth.uid() WHERE user_id IS NULL;

-- 3. Remover políticas permissivas (true)
DROP POLICY IF EXISTS "Permitir leitura para usuários autenticados" ON public.tab_visitas;
DROP POLICY IF EXISTS "Permitir inserção para usuários autenticados" ON public.tab_visitas;
DROP POLICY IF EXISTS "Permitir atualização para usuários autenticados" ON public.tab_visitas;
DROP POLICY IF EXISTS "Permitir exclusão para usuários autenticados" ON public.tab_visitas;

-- 4. Criar novas políticas restritivas baseadas no auth.uid()
CREATE POLICY "Usuários podem ver suas próprias visitas" 
ON public.tab_visitas FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem inserir suas próprias visitas" 
ON public.tab_visitas FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar suas próprias visitas" 
ON public.tab_visitas FOR UPDATE 
TO authenticated 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem excluir suas próprias visitas" 
ON public.tab_visitas FOR DELETE 
TO authenticated 
USING (auth.uid() = user_id);
