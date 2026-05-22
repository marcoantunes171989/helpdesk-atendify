-- Step 1: Drop existing views because they depend on tables we will rename/drop
DROP VIEW IF EXISTS view_formas_pagamento_stats;
DROP VIEW IF EXISTS view_alerta_inconsistencias;
DROP VIEW IF EXISTS view_auditoria_detalhada;
DROP VIEW IF EXISTS view_estoque_consolidado;
DROP VIEW IF EXISTS view_auditoria_posses;
DROP VIEW IF EXISTS view_historico_posses_detalhes;
DROP VIEW IF EXISTS view_metricas_vendas_consolidada;
DROP VIEW IF EXISTS view_dashboard_stats_global;
DROP VIEW IF EXISTS view_dashboard_metrics;
DROP VIEW IF EXISTS view_posses_detalhes;
DROP VIEW IF EXISTS view_resumo_vendas_diario;
DROP VIEW IF EXISTS view_top_produtos;
DROP VIEW IF EXISTS view_top_clientes;
DROP VIEW IF EXISTS view_lucro_mensal;

-- Step 2: Drop existing tables and recreate with new pattern
DROP TABLE IF EXISTS auditoria_estoque CASCADE;
DROP TABLE IF EXISTS auditoria_movimentacoes CASCADE;
DROP TABLE IF EXISTS auditoria_recalculos_vendas CASCADE;
DROP TABLE IF EXISTS historico_posses CASCADE;
DROP TABLE IF EXISTS itens_venda CASCADE;
DROP TABLE IF EXISTS vendas CASCADE;
DROP TABLE IF EXISTS posses CASCADE;
DROP TABLE IF EXISTS produtos CASCADE;
DROP TABLE IF EXISTS categorias CASCADE;
DROP TABLE IF EXISTS cargos CASCADE;
DROP TABLE IF EXISTS visitas CASCADE;

-- Categories
CREATE TABLE public.tab_categorias (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    cat_nome TEXT NOT NULL,
    cat_descricao TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Products
CREATE TABLE public.tab_produtos (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    pro_codigo TEXT NOT NULL UNIQUE,
    pro_descricao TEXT NOT NULL,
    pro_valor_compra DECIMAL(10,2),
    pro_valor_venda DECIMAL(10,2),
    pro_estoque_minimo INTEGER DEFAULT 0,
    pro_estoque_atual INTEGER DEFAULT 0,
    pro_categoria_id UUID REFERENCES public.tab_categorias(id),
    pro_codigo_barras TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Sales
CREATE TABLE public.tab_vendas (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    ven_cliente_id UUID REFERENCES public.tab_clientes(id),
    ven_usuario_id UUID REFERENCES public.tab_usuarios(id),
    ven_valor_total DECIMAL(10,2) NOT NULL,
    ven_desconto DECIMAL(10,2) DEFAULT 0,
    ven_forma_pagamento TEXT,
    ven_status TEXT DEFAULT 'concluida',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Sale Items
CREATE TABLE public.tab_itens_venda (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    itv_venda_id UUID REFERENCES public.tab_vendas(id) ON DELETE CASCADE,
    itv_produto_id UUID REFERENCES public.tab_produtos(id),
    itv_quantidade INTEGER NOT NULL,
    itv_valor_unitario DECIMAL(10,2) NOT NULL,
    itv_valor_total DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.tab_categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tab_produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tab_vendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tab_itens_venda ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acesso total tab_categorias" ON public.tab_categorias FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Acesso total tab_produtos" ON public.tab_produtos FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Acesso total tab_vendas" ON public.tab_vendas FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Acesso total tab_itens_venda" ON public.tab_itens_venda FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Triggers for updated_at
CREATE TRIGGER update_tab_categorias_updated_at BEFORE UPDATE ON public.tab_categorias FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_tab_produtos_updated_at BEFORE UPDATE ON public.tab_produtos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_tab_vendas_updated_at BEFORE UPDATE ON public.tab_vendas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
