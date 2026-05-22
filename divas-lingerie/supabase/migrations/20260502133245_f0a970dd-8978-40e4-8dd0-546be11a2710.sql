-- 1. Adicionar coluna para armazenar o custo histórico no item da venda (se não existir)
ALTER TABLE public.itens_venda ADD COLUMN IF NOT EXISTS valor_custo_na_venda NUMERIC;

-- 2. Atualizar registros existentes para ter um valor inicial (baseado no custo atual do produto)
UPDATE public.itens_venda iv
SET valor_custo_na_venda = p.valor_custo
FROM public.produtos p
WHERE iv.produto_id = p.id AND iv.valor_custo_na_venda IS NULL;

-- 3. Função para preencher o custo na inserção do item
CREATE OR REPLACE FUNCTION public.fn_fill_item_cost()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.valor_custo_na_venda IS NULL THEN
        SELECT valor_custo INTO NEW.valor_custo_na_venda FROM public.produtos WHERE id = NEW.produto_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER tr_fill_item_cost
BEFORE INSERT ON public.itens_venda
FOR EACH ROW EXECUTE FUNCTION public.fn_fill_item_cost();

-- 4. Função para recalcular lucro da venda
CREATE OR REPLACE FUNCTION public.recalcular_lucro_venda(p_venda_id UUID)
RETURNS VOID AS $$
DECLARE
    v_total_lucro NUMERIC;
    v_total_venda NUMERIC;
BEGIN
    -- Calcula lucro total: (valor_venda - valor_custo) * quantidade
    SELECT 
        SUM((valor_unitario - COALESCE(valor_custo_na_venda, 0)) * quantidade),
        SUM(valor_unitario * quantidade)
    INTO v_total_lucro, v_total_venda
    FROM public.itens_venda
    WHERE venda_id = p_venda_id;

    UPDATE public.vendas
    SET lucro = COALESCE(v_total_lucro, 0),
        total = COALESCE(v_total_venda, 0)
    WHERE id = p_venda_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 5. Gatilho para atualizar itens e recalcular lucro quando o custo do produto muda
CREATE OR REPLACE FUNCTION public.fn_update_sales_profit_on_cost_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Se o custo mudou, atualizamos os itens de venda vinculados para refletir o novo custo
    -- e recalculamos o lucro de cada venda afetada.
    -- Nota: Isso atualiza TODAS as vendas históricas. 
    -- Se desejar manter o custo histórico imutável, remova o UPDATE em itens_venda e use apenas o custo no momento da venda.
    
    -- Atualizar o custo nos itens de venda (opcional, dependendo se o usuário quer histórico retroativo)
    UPDATE public.itens_venda
    SET valor_custo_na_venda = NEW.valor_custo
    WHERE produto_id = NEW.id;

    -- Recalcular lucro para todas as vendas que possuem este produto
    PERFORM public.recalcular_lucro_venda(venda_id)
    FROM (SELECT DISTINCT venda_id FROM public.itens_venda WHERE produto_id = NEW.id) s;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER tr_update_profit_on_cost_change
AFTER UPDATE OF valor_custo ON public.produtos
FOR EACH ROW 
WHEN (OLD.valor_custo IS DISTINCT FROM NEW.valor_custo)
EXECUTE FUNCTION public.fn_update_sales_profit_on_cost_change();

-- 6. Garantir que o lucro seja recalculado quando itens são inseridos/deletados
CREATE OR REPLACE FUNCTION public.fn_recalc_venda_on_item_change()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        PERFORM public.recalcular_lucro_venda(OLD.venda_id);
        RETURN OLD;
    ELSE
        PERFORM public.recalcular_lucro_venda(NEW.venda_id);
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS tr_recalc_venda_on_item_change ON public.itens_venda;
CREATE TRIGGER tr_recalc_venda_on_item_change
AFTER INSERT OR UPDATE OR DELETE ON public.itens_venda
FOR EACH ROW EXECUTE FUNCTION public.fn_recalc_venda_on_item_change();