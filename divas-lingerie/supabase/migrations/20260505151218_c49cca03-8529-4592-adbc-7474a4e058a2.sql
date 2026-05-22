-- Trigger para validar exclusão de categorias com produtos vinculados
CREATE OR REPLACE FUNCTION public.check_categoria_delete()
RETURNS TRIGGER AS $$
BEGIN
    IF EXISTS (SELECT 1 FROM public.tab_produtos WHERE pro_categoria_id = OLD.id) THEN
        RAISE EXCEPTION 'Não é possível excluir uma categoria que possui produtos vinculados.';
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_check_categoria_delete
BEFORE DELETE ON public.tab_categorias
FOR EACH ROW
EXECUTE FUNCTION public.check_categoria_delete();

-- Trigger para validar exclusão de produtos com vendas vinculadas
CREATE OR REPLACE FUNCTION public.check_produto_delete()
RETURNS TRIGGER AS $$
BEGIN
    IF EXISTS (SELECT 1 FROM public.tab_itens_venda WHERE itv_produto_id = OLD.id) THEN
        RAISE EXCEPTION 'Não é possível excluir um produto que possui registros de venda.';
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_check_produto_delete
BEFORE DELETE ON public.tab_produtos
FOR EACH ROW
EXECUTE FUNCTION public.check_produto_delete();

-- Trigger para validar exclusão de clientes com vendas vinculadas
CREATE OR REPLACE FUNCTION public.check_cliente_delete()
RETURNS TRIGGER AS $$
BEGIN
    IF EXISTS (SELECT 1 FROM public.tab_vendas WHERE ven_cliente_id = OLD.id) THEN
        RAISE EXCEPTION 'Não é possível excluir um cliente que possui histórico de compras.';
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_check_cliente_delete
BEFORE DELETE ON public.tab_clientes
FOR EACH ROW
EXECUTE FUNCTION public.check_cliente_delete();

-- Garantir consistência dos campos
ALTER TABLE public.tab_categorias ALTER COLUMN cat_nome SET NOT NULL;
ALTER TABLE public.tab_produtos ALTER COLUMN pro_descricao SET NOT NULL;
ALTER TABLE public.tab_clientes ALTER COLUMN cli_nome SET NOT NULL;
