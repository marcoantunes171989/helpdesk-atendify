ALTER TABLE public.tab_consignacao 
ADD COLUMN IF NOT EXISTS con_venda_id UUID REFERENCES public.tab_vendas(id);

COMMENT ON COLUMN public.tab_consignacao.con_venda_id IS 'ID da venda gerada a partir desta consignação';