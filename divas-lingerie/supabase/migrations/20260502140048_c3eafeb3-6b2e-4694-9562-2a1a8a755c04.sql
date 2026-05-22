-- 1. Função para verificar consistência de um produto específico
CREATE OR REPLACE FUNCTION public.check_produto_consistencia(p_produto_id UUID)
RETURNS TABLE (
    em_estoque INTEGER,
    em_posse BIGINT,
    total_registrado BIGINT,
    is_consistente BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    WITH resumo AS (
        SELECT 
            p.id,
            p.estoque,
            COALESCE((SELECT SUM(quantidade) FROM public.posses WHERE produto_id = p.id AND status = 'em_posse'), 0) as posse_qtd
        FROM public.produtos p
        WHERE p.id = p_produto_id
    )
    SELECT 
        r.estoque,
        r.posse_qtd,
        (r.estoque + r.posse_qtd) as total,
        -- Aqui você pode comparar com uma tabela de 'entradas_compras' se existir
        -- Por agora, validamos que o estoque nunca é negativo (regra básica)
        (r.estoque >= 0) as consistencia
    FROM resumo r;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Trigger de auditoria de consistência pós-movimentação
CREATE OR REPLACE FUNCTION public.fn_validar_pos_movimentacao()
RETURNS TRIGGER AS $$
DECLARE
    v_estoque_atual INTEGER;
    v_em_posse BIGINT;
BEGIN
    -- Obter dados atuais do produto
    SELECT estoque INTO v_estoque_atual FROM public.produtos WHERE id = NEW.produto_id;
    SELECT COALESCE(SUM(quantidade), 0) INTO v_em_posse FROM public.posses WHERE produto_id = NEW.produto_id AND status = 'em_posse';

    -- Validação: Estoque físico + Consignado não pode ser menor que zero
    -- (Opcional: Se tiver tabela de compras, validar que a soma não excede as entradas)
    IF v_estoque_atual < 0 THEN
        INSERT INTO public.auditoria_recalculos_vendas (
            usuario_id, motivo, observacao
        ) VALUES (
            auth.uid(), 
            'inconsistencia_estoque', 
            format('Produto %s ficou com estoque negativo: %s', NEW.produto_id, v_estoque_atual)
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Aplicar o trigger na tabela de auditoria (que registra toda mudança)
DROP TRIGGER IF EXISTS tr_validar_consistencia ON public.auditoria_estoque;
CREATE TRIGGER tr_validar_consistencia
AFTER INSERT ON public.auditoria_estoque
FOR EACH ROW EXECUTE FUNCTION public.fn_validar_pos_movimentacao();

-- 3. View para Dashboard de Auditoria / Alertas
CREATE OR REPLACE VIEW public.view_alerta_inconsistencias AS
SELECT 
    p.id as produto_id,
    p.descricao,
    p.estoque as estoque_sistema,
    COALESCE(SUM(ps.quantidade) FILTER (WHERE ps.status = 'em_posse'), 0) as qtd_consignada,
    COALESCE(SUM(iv.quantidade), 0) as qtd_vendida,
    -- Exemplo de calculo de "Deveria ter" se tivessemos compras:
    -- (compras - vendas - consignado)
    CASE 
        WHEN p.estoque < 0 THEN 'ERRO: ESTOQUE NEGATIVO'
        ELSE 'OK'
    END as status_consistencia
FROM public.produtos p
LEFT JOIN public.posses ps ON p.id = ps.produto_id
LEFT JOIN public.itens_venda iv ON p.id = iv.produto_id
GROUP BY p.id, p.descricao, p.estoque;

-- 4. Garantir permissões
GRANT SELECT ON public.view_alerta_inconsistencias TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_produto_consistencia(UUID) TO authenticated;