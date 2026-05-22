-- Ensure migration tracking schema exists
CREATE SCHEMA IF NOT EXISTS supabase_migrations;
CREATE TABLE IF NOT EXISTS supabase_migrations.schema_migrations (
    version text NOT NULL PRIMARY KEY
);

-- Mark all previous migrations as applied so supabase db push never re-applies them
INSERT INTO supabase_migrations.schema_migrations (version) VALUES
  ('20260502040147'),
  ('20260502040159'),
  ('20260502041104'),
  ('20260502041240'),
  ('20260502041537'),
  ('20260502041813'),
  ('20260502042048'),
  ('20260502042110'),
  ('20260502042237'),
  ('20260502042410'),
  ('20260502042423'),
  ('20260502042505'),
  ('20260502042517'),
  ('20260502042716'),
  ('20260502042729'),
  ('20260502042849'),
  ('20260502043000'),
  ('20260502043327'),
  ('20260502043409'),
  ('20260502043754'),
  ('20260502043826'),
  ('20260502043913'),
  ('20260502044628'),
  ('20260502122852'),
  ('20260502122915'),
  ('20260502123547'),
  ('20260502123840'),
  ('20260502132234'),
  ('20260502132258'),
  ('20260502132412'),
  ('20260502132635'),
  ('20260502132938'),
  ('20260502133119'),
  ('20260502133245'),
  ('20260502133402'),
  ('20260502133750'),
  ('20260502134018'),
  ('20260502134138'),
  ('20260502134206'),
  ('20260502134233'),
  ('20260502134304'),
  ('20260502134326'),
  ('20260502134448'),
  ('20260502134857'),
  ('20260502135055'),
  ('20260502135252'),
  ('20260502135614'),
  ('20260502140048'),
  ('20260502140328'),
  ('20260502140529'),
  ('20260502142443'),
  ('20260502142515'),
  ('20260502142546'),
  ('20260502142615'),
  ('20260502142646'),
  ('20260502142802'),
  ('20260502143156'),
  ('20260504014521'),
  ('20260504014712'),
  ('20260504015301'),
  ('20260504015337'),
  ('20260505144117'),
  ('20260505144139'),
  ('20260505144537'),
  ('20260505144555'),
  ('20260505144653'),
  ('20260505151218'),
  ('20260505151316'),
  ('20260505155707'),
  ('20260505155738'),
  ('20260505160245'),
  ('20260505163742'),
  ('20260505164953'),
  ('20260506000603'),
  ('20260506004616'),
  ('20260506004849'),
  ('20260506010927'),
  ('20260506011148'),
  ('20260506012343'),
  ('20260506013044'),
  ('20260506013654'),
  ('20260506014342'),
  ('20260506020044'),
  ('20260506021135'),
  ('20260506021858'),
  ('20260506022154'),
  ('20260506022500'),
  ('20260506023426'),
  ('20260506025051'),
  ('20260506025626'),
  ('20260506025912'),
  ('20260506031444'),
  ('20260506031632'),
  ('20260506031747'),
  ('20260506031843'),
  ('20260506031935'),
  ('20260506032100'),
  ('20260506032224'),
  ('20260506032336'),
  ('20260506032535'),
  ('20260506035235'),
  ('20260506035253'),
  ('20260506041645'),
  ('20260506041713'),
  ('20260507010251'),
  ('20260507010317'),
  ('20260507011355'),
  ('20260507011638'),
  ('20260507020415'),
  ('20260507021921'),
  ('20260507022144'),
  ('20260507022214'),
  ('20260507022243'),
  ('20260507030419'),
  ('20260507163502'),
  ('20260507163752'),
  ('20260507164018'),
  ('20260507164349'),
  ('20260507164628'),
  ('20260507201731'),
  ('20260507214001'),
  ('20260507220136'),
  ('20260507222202'),
  ('20260507223404'),
  ('20260507223421'),
  ('20260507224026'),
  ('20260507225429'),
  ('20260507230606'),
  ('20260507231457'),
  ('20260507232042'),
  ('20260511212922'),
  ('20260512001804'),
  ('20260512015836'),
  ('20260512022612'),
  ('20260512022852'),
  ('20260513204358'),
  ('20260513204639'),
  ('20260513210150'),
  ('20260513210314'),
  ('20260513210545'),
  ('20260513210633'),
  ('20260513235843'),
  ('20260514002414')
ON CONFLICT (version) DO NOTHING;

-- Fix registrar_venda_completa: garante que o usuário existe em tab_usuarios
-- antes de inserir em tab_vendas (evita FK violation sem remover a constraint)
CREATE OR REPLACE FUNCTION public.registrar_venda_completa(
    p_cliente_id uuid,
    p_usuario_id uuid,
    p_valor_total numeric,
    p_desconto numeric,
    p_forma_pagamento text,
    p_itens jsonb,
    p_pagamentos jsonb DEFAULT NULL::jsonb
)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_venda_id UUID;
    v_item RECORD;
    v_pagto RECORD;
    v_total_pago NUMERIC := 0;
    v_fin_status BOOLEAN;
    v_fin_nome TEXT;
BEGIN
    -- Garante que o usuário existe em tab_usuarios (necessário para FK de tab_vendas)
    IF p_usuario_id IS NOT NULL THEN
        INSERT INTO public.tab_usuarios (id, usu_nome)
        VALUES (p_usuario_id, 'Usuário')
        ON CONFLICT (id) DO NOTHING;
    END IF;

    -- 1. Validação de Finalizadoras Ativas
    IF p_pagamentos IS NOT NULL AND jsonb_array_length(p_pagamentos) > 0 THEN
        FOR v_pagto IN SELECT * FROM jsonb_to_recordset(p_pagamentos) AS x(forma TEXT, valor NUMERIC, finalizadora_id UUID)
        LOOP
            SELECT fin_ativa, fin_descricao INTO v_fin_status, v_fin_nome
            FROM public.tab_finalizadoras
            WHERE id = v_pagto.finalizadora_id;

            IF v_fin_status IS NULL THEN
                RAISE EXCEPTION 'Finalizadora com ID % não encontrada.', v_pagto.finalizadora_id;
            END IF;

            IF v_fin_status = false THEN
                RAISE EXCEPTION 'A finalizadora "%" está inativa e não pode ser utilizada.', v_fin_nome;
            END IF;
        END LOOP;

        -- 2. Validação de Valor Pago vs Total
        SELECT SUM((val->>'valor')::NUMERIC) INTO v_total_pago FROM jsonb_array_elements(p_pagamentos) AS val;

        IF v_total_pago < p_valor_total THEN
            RAISE EXCEPTION 'Valor pago (%) insuficiente. Total da venda: %', v_total_pago, p_valor_total;
        END IF;
    END IF;

    -- 3. Inserção do Cabeçalho
    INSERT INTO public.tab_vendas (
        ven_cliente_id,
        ven_usuario_id,
        ven_valor_total,
        ven_desconto,
        ven_forma_pagamento,
        ven_status,
        created_at,
        updated_at
    ) VALUES (
        p_cliente_id,
        p_usuario_id,
        p_valor_total,
        COALESCE(p_desconto, 0),
        p_forma_pagamento,
        'concluida',
        now(),
        now()
    ) RETURNING id INTO v_venda_id;

    -- 4. Inserção dos Itens
    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_itens) AS x(produto_id UUID, quantidade INT, valor_unitario NUMERIC, valor_total NUMERIC)
    LOOP
        INSERT INTO public.tab_itens_venda (
            itv_venda_id,
            itv_produto_id,
            itv_quantidade,
            itv_valor_unitario,
            itv_valor_total,
            itv_status,
            created_at
        ) VALUES (
            v_venda_id,
            v_item.produto_id,
            v_item.quantidade,
            v_item.valor_unitario,
            v_item.valor_total,
            'ativo',
            now()
        );
    END LOOP;

    -- 5. Registro dos Pagamentos Detalhados
    IF p_pagamentos IS NOT NULL THEN
        FOR v_pagto IN SELECT * FROM jsonb_to_recordset(p_pagamentos) AS x(forma TEXT, valor NUMERIC, finalizadora_id UUID)
        LOOP
            INSERT INTO public.tab_vendas_pagamentos (
                vpa_venda_id,
                vpa_forma_pagamento,
                vpa_valor,
                vpa_finalizadora_id
            ) VALUES (
                v_venda_id,
                v_pagto.forma,
                v_pagto.valor,
                v_pagto.finalizadora_id
            );
        END LOOP;
    END IF;

    RETURN v_venda_id;
END;
$function$;
