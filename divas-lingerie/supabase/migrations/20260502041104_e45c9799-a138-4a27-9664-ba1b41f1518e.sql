-- 1. Constraints de validação básica
ALTER TABLE public.produtos ADD CONSTRAINT check_valor_venda_positivo CHECK (valor_venda >= 0);
ALTER TABLE public.produtos ADD CONSTRAINT check_estoque_positivo CHECK (estoque >= 0);
ALTER TABLE public.itens_venda ADD CONSTRAINT check_quantidade_venda_positiva CHECK (quantidade > 0);
ALTER TABLE public.posses ADD CONSTRAINT check_quantidade_posse_positiva CHECK (quantidade > 0);

-- 2. Função para atualizar estoque na venda direta
CREATE OR REPLACE FUNCTION public.handle_venda_estoque()
RETURNS TRIGGER AS $$
BEGIN
    -- Deduzir do estoque do produto
    UPDATE public.produtos
    SET estoque = estoque - NEW.quantidade
    WHERE id = NEW.produto_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trigger_atualizar_estoque_venda
AFTER INSERT ON public.itens_venda
FOR EACH ROW EXECUTE FUNCTION public.handle_venda_estoque();

-- 3. Função para processar alteração de status em consignação (posses)
CREATE OR REPLACE FUNCTION public.handle_posse_status_change()
RETURNS TRIGGER AS $$
DECLARE
    v_venda_id UUID;
    v_lucro DECIMAL(10,2);
    v_valor_venda DECIMAL(10,2);
    v_valor_custo DECIMAL(10,2);
BEGIN
    -- Se o status mudou para 'devolvido', o produto volta para o estoque
    IF NEW.status = 'devolvido' AND OLD.status = 'em_posse' THEN
        UPDATE public.produtos
        SET estoque = estoque + NEW.quantidade
        WHERE id = NEW.produto_id;
    END IF;

    -- Se o status mudou para 'vendido', gera uma venda automaticamente (opcional, mas garante integridade)
    IF NEW.status = 'vendido' AND OLD.status = 'em_posse' THEN
        -- Buscar valores atuais do produto
        SELECT valor_venda, valor_custo INTO v_valor_venda, v_valor_custo
        FROM public.produtos WHERE id = NEW.produto_id;

        v_lucro := (v_valor_venda - v_valor_custo) * NEW.quantidade;

        -- Criar cabeçalho da venda
        INSERT INTO public.vendas (cliente_id, total, lucro, data)
        VALUES (NEW.cliente_id, v_valor_venda * NEW.quantidade, v_lucro, CURRENT_DATE)
        RETURNING id INTO v_venda_id;

        -- Criar item da venda (o trigger de itens_venda NÃO deve rodar aqui para não duplicar saída de estoque, 
        -- pois na consignação o item já saiu do estoque físico original ou será controlado separadamente)
        -- Nota: Como o item já estava "em posse", ele já não constava no estoque disponível.
        INSERT INTO public.itens_venda (venda_id, produto_id, quantidade, valor_unitario)
        VALUES (v_venda_id, NEW.produto_id, NEW.quantidade, v_valor_venda);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trigger_posse_status_change
AFTER UPDATE OF status ON public.posses
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION public.handle_posse_status_change();

-- 4. Ajustar saída de estoque inicial ao registrar consignação
CREATE OR REPLACE FUNCTION public.handle_posse_estoque_inicial()
RETURNS TRIGGER AS $$
BEGIN
    -- Quando entra em consignação, sai do estoque disponível
    IF NEW.status = 'em_posse' THEN
        UPDATE public.produtos
        SET estoque = estoque - NEW.quantidade
        WHERE id = NEW.produto_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trigger_posse_estoque_inicial
AFTER INSERT ON public.posses
FOR EACH ROW EXECUTE FUNCTION public.handle_posse_estoque_inicial();