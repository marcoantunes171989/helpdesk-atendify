-- 1. Add missing Foreign Keys to ensure referential integrity

-- table: perfis (profiles)
ALTER TABLE public.perfis
ADD CONSTRAINT fk_perfis_cargo
FOREIGN KEY (cargo_id) REFERENCES public.cargos(id)
ON DELETE SET NULL;

-- table: produtos (products)
ALTER TABLE public.produtos
ADD CONSTRAINT fk_produtos_categoria
FOREIGN KEY (categoria_id) REFERENCES public.categorias(id)
ON DELETE SET NULL;

-- table: vendas (sales)
ALTER TABLE public.vendas
ADD CONSTRAINT fk_vendas_cliente
FOREIGN KEY (cliente_id) REFERENCES public.clientes(id)
ON DELETE RESTRICT;

-- table: itens_venda (sale items)
ALTER TABLE public.itens_venda
ADD CONSTRAINT fk_itens_venda_venda
FOREIGN KEY (venda_id) REFERENCES public.vendas(id)
ON DELETE CASCADE;

ALTER TABLE public.itens_venda
ADD CONSTRAINT fk_itens_venda_produto
FOREIGN KEY (produto_id) REFERENCES public.produtos(id)
ON DELETE RESTRICT;

-- table: posses (consignments/sacoleira)
ALTER TABLE public.posses
ADD CONSTRAINT fk_posses_cliente
FOREIGN KEY (cliente_id) REFERENCES public.clientes(id)
ON DELETE RESTRICT;

ALTER TABLE public.posses
ADD CONSTRAINT fk_posses_produto
FOREIGN KEY (produto_id) REFERENCES public.produtos(id)
ON DELETE RESTRICT;

-- table: visitas (visits)
ALTER TABLE public.visitas
ADD CONSTRAINT fk_visitas_cliente
FOREIGN KEY (cliente_id) REFERENCES public.clientes(id)
ON DELETE CASCADE;

-- 2. Add validation constraints

-- Ensure stock cannot be negative (already requested in context)
ALTER TABLE public.produtos
ADD CONSTRAINT chk_produtos_estoque_positivo
CHECK (estoque >= 0);

-- Ensure sale quantities are positive
ALTER TABLE public.itens_venda
ADD CONSTRAINT chk_itens_venda_quantidade_positiva
CHECK (quantidade > 0);

-- Ensure consignment quantities are positive
ALTER TABLE public.posses
ADD CONSTRAINT chk_posses_quantidade_positiva
CHECK (quantidade > 0);

-- 3. Automatic inventory management functions

-- Function to handle product stock when a sale item is inserted
CREATE OR REPLACE FUNCTION public.handle_sale_item_insert()
RETURNS TRIGGER AS $$
BEGIN
    -- Decrease stock when item is sold
    UPDATE public.produtos
    SET estoque = estoque - NEW.quantidade
    WHERE id = NEW.produto_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_sale_item_insert
AFTER INSERT ON public.itens_venda
FOR EACH ROW EXECUTE FUNCTION public.handle_sale_item_insert();

-- Function to handle product stock when a sale item is deleted
CREATE OR REPLACE FUNCTION public.handle_sale_item_delete()
RETURNS TRIGGER AS $$
BEGIN
    -- Restore stock when sale item is removed
    UPDATE public.produtos
    SET estoque = estoque + OLD.quantidade
    WHERE id = OLD.produto_id;
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_sale_item_delete
AFTER DELETE ON public.itens_venda
FOR EACH ROW EXECUTE FUNCTION public.handle_sale_item_delete();

-- Function to handle stock during consignment conversion/return
CREATE OR REPLACE FUNCTION public.handle_posse_status_change()
RETURNS TRIGGER AS $$
BEGIN
    -- If status changes from 'em_posse' to 'devolvido'
    IF OLD.status = 'em_posse' AND NEW.status = 'devolvido' THEN
        -- Return items to main stock
        UPDATE public.produtos
        SET estoque = estoque + NEW.quantidade
        WHERE id = NEW.produto_id;
    
    -- If status changes from 'em_posse' to 'vendido'
    -- Note: Sales should be registered separately, but this ensures stock integrity 
    -- if the UI just marks it as sold without creating a sale record.
    -- Usually, 'vendido' would be handled by a higher-level transaction that creates a sale.
    ELSIF OLD.status = 'em_posse' AND NEW.status = 'vendido' THEN
        -- Stock was already decreased when it went 'em_posse', so no action needed here
        -- unless the system decreases stock ONLY on final sale.
        -- Assuming stock is decreased when items go into "posse" (consignment).
        NULL;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_posse_status_update
AFTER UPDATE OF status ON public.posses
FOR EACH ROW EXECUTE FUNCTION public.handle_posse_status_change();

-- Function to decrease stock when items are given to "posse"
CREATE OR REPLACE FUNCTION public.handle_posse_insert()
RETURNS TRIGGER AS $$
BEGIN
    -- Decrease main stock when item is given to consignment
    UPDATE public.produtos
    SET estoque = estoque - NEW.quantidade
    WHERE id = NEW.produto_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_posse_insert
AFTER INSERT ON public.posses
FOR EACH ROW EXECUTE FUNCTION public.handle_posse_insert();
