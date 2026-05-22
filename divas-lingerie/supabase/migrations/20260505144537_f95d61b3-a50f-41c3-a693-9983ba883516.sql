-- 1. Índices para Otimização de Busca
CREATE INDEX IF NOT EXISTS idx_tab_produtos_barras ON public.tab_produtos (pro_codigo_barras);
CREATE INDEX IF NOT EXISTS idx_tab_produtos_descricao ON public.tab_produtos (pro_descricao);
CREATE INDEX IF NOT EXISTS idx_tab_clientes_documento ON public.tab_clientes (cli_documento);
CREATE INDEX IF NOT EXISTS idx_tab_vendas_data ON public.tab_vendas (created_at);

-- 2. Constraints de Validação de Dados
ALTER TABLE public.tab_produtos 
  DROP CONSTRAINT IF EXISTS check_preco_venda_positivo,
  ADD CONSTRAINT check_preco_venda_positivo CHECK (pro_valor_venda >= 0);

ALTER TABLE public.tab_produtos 
  DROP CONSTRAINT IF EXISTS check_estoque_nao_negativo,
  ADD CONSTRAINT check_estoque_nao_negativo CHECK (pro_estoque_atual >= 0);

ALTER TABLE public.tab_itens_venda 
  DROP CONSTRAINT IF EXISTS check_quantidade_positiva,
  ADD CONSTRAINT check_quantidade_positiva CHECK (itv_quantidade > 0);

-- 3. Trigger para Cálculo Automático do Total do Item
CREATE OR REPLACE FUNCTION public.calcular_total_item()
RETURNS TRIGGER AS $$
BEGIN
    NEW.itv_valor_total := NEW.itv_quantidade * NEW.itv_valor_unitario;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_calcular_total_item ON public.tab_itens_venda;
CREATE TRIGGER trg_calcular_total_item
BEFORE INSERT OR UPDATE ON public.tab_itens_venda
FOR EACH ROW
EXECUTE FUNCTION public.calcular_total_item();

-- 4. Trigger para Controle de Estoque (Baixa na Venda)
CREATE OR REPLACE FUNCTION public.baixar_estoque_venda()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.tab_produtos
    SET pro_estoque_atual = pro_estoque_atual - NEW.itv_quantidade
    WHERE id = NEW.itv_produto_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Produto não encontrado.';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_baixar_estoque_venda ON public.tab_itens_venda;
CREATE TRIGGER trg_baixar_estoque_venda
AFTER INSERT ON public.tab_itens_venda
FOR EACH ROW
EXECUTE FUNCTION public.baixar_estoque_venda();

-- 5. Trigger para Controle de Estoque (Estorno no Cancelamento/Exclusão)
CREATE OR REPLACE FUNCTION public.estornar_estoque_venda()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.tab_produtos
    SET pro_estoque_atual = pro_estoque_atual + OLD.itv_quantidade
    WHERE id = OLD.itv_produto_id;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_estornar_estoque_venda ON public.tab_itens_venda;
CREATE TRIGGER trg_estornar_estoque_venda
AFTER DELETE ON public.tab_itens_venda
FOR EACH ROW
EXECUTE FUNCTION public.estornar_estoque_venda();

-- 6. Padronização de Updates de Timestamps
CREATE OR REPLACE FUNCTION public.trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ 
DECLARE 
    t TEXT;
BEGIN
    FOR t IN SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE 'tab_%' AND table_name != 'tab_itens_venda'
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS set_timestamp ON public.%I', t);
        EXECUTE format('CREATE TRIGGER set_timestamp BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp()', t);
    END LOOP;
END $$;
