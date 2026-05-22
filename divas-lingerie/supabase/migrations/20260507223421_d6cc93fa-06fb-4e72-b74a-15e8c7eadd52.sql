-- Ajustar RLS para permitir que todos os usuários autenticados vejam as vendas e itens
-- (Necessário para indicadores globais de faturamento no CRM)

DROP POLICY IF EXISTS "Usuários podem ver suas próprias vendas" ON public.tab_vendas;
CREATE POLICY "Visualização global de vendas para autenticados" 
ON public.tab_vendas 
FOR SELECT 
USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Usuários podem ver itens de suas vendas" ON public.tab_itens_venda;
CREATE POLICY "Visualização global de itens para autenticados" 
ON public.tab_itens_venda 
FOR SELECT 
USING (auth.role() = 'authenticated');
