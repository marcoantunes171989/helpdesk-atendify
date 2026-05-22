-- Criar tabela de fornecedores
CREATE TABLE public.tab_fornecedores (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    for_documento TEXT,
    for_razao_social TEXT NOT NULL,
    for_fantasia TEXT,
    for_endereco TEXT,
    for_numero TEXT,
    for_bairro TEXT,
    for_cidade TEXT,
    for_estado TEXT,
    for_cep TEXT,
    for_observacao VARCHAR(150),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

-- Habilitar RLS
ALTER TABLE public.tab_fornecedores ENABLE ROW LEVEL SECURITY;

-- Criar políticas
CREATE POLICY "Permitir leitura para autenticados" ON public.tab_fornecedores FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Permitir inserção para autenticados" ON public.tab_fornecedores FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Permitir atualização para autenticados" ON public.tab_fornecedores FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Permitir exclusão para autenticados" ON public.tab_fornecedores FOR DELETE USING (auth.role() = 'authenticated');

-- Gatilho para atualizar updated_at
CREATE TRIGGER update_tab_fornecedores_updated_at
BEFORE UPDATE ON public.tab_fornecedores
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Gatilho de auditoria (reutilizando a lógica de auditoria existente se possível ou criando uma específica)
CREATE TRIGGER trg_auditoria_fornecedores
AFTER INSERT OR UPDATE OR DELETE ON public.tab_fornecedores
FOR EACH ROW EXECUTE FUNCTION public.fn_auditoria_clientes(); -- A função fn_auditoria_clientes parece ser genérica o suficiente se ajustada ou podemos criar uma genérica
