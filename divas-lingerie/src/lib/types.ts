import { Database } from "@/integrations/supabase/types";

export type Categoria = Database["public"]["Tables"]["tab_categorias"]["Row"];
export type Produto = Database["public"]["Tables"]["tab_produtos"]["Row"];
export type Cliente = Database["public"]["Tables"]["tab_clientes"]["Row"];
export type Venda = Database["public"]["Tables"]["tab_vendas"]["Row"];
export type ItemVenda = Database["public"]["Tables"]["tab_itens_venda"]["Row"];
export type Perfil = Database["public"]["Tables"]["tab_usuarios"]["Row"];

// Mocks temporários para tipos removidos
export type Posse = {
  id: string;
  status: 'em_posse' | 'vendido' | 'devolvido';
  cliente_id: string;
  produto_id: string;
  quantidade: number;
  data_saida: string;
  data_devolucao?: string;
};

export type Visita = {
  id: string;
  cliente_id: string;
  data: string;
  produtos_demonstrados: string[];
  observacoes: string;
};

export type StatusPosse = 'em_posse' | 'vendido' | 'devolvido';

export type LeadCRM = {
  id: string;
  clienteId: string;
  data: string;
  origemVisitaId: string;
  produtosInteresse: string[];
  tipoInteresse: "venda" | "consignado" | "ambos";
  status: "novo" | "em_atendimento" | "convertido" | "arquivado";
};

// Frontend support types
export type Usuario = {
  id: string;
  nome: string;
  email: string;
  cargoId: string;
  status: "ativo" | "inativo";
  ultimoAcesso?: string;
};

export type Cargo = {
  id: string;
  nome: string;
  permissoes: string[];
  descricao?: string;
};

export type StatusRetirada = "em_posse" | "devolvido" | "comprado";

export type RetiradaFornecedor = {
  id: string;
  fornecedor: string;
  produtoId: string;
  quantidade: number;
  dataRetirada: string;
  dataDevolucao?: string;
  status: StatusRetirada;
};