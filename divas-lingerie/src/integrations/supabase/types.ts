export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      posses_auditoria: {
        Row: {
          cliente_id: string | null
          criado_at: string | null
          dados_anteriores: Json | null
          dados_novos: Json | null
          id: string
          posse_id: string
          produto_id: string | null
          quantidade: number | null
          status_anterior: string | null
          status_novo: string | null
          usuario_id: string | null
        }
        Insert: {
          cliente_id?: string | null
          criado_at?: string | null
          dados_anteriores?: Json | null
          dados_novos?: Json | null
          id?: string
          posse_id: string
          produto_id?: string | null
          quantidade?: number | null
          status_anterior?: string | null
          status_novo?: string | null
          usuario_id?: string | null
        }
        Update: {
          cliente_id?: string | null
          criado_at?: string | null
          dados_anteriores?: Json | null
          dados_novos?: Json | null
          id?: string
          posse_id?: string
          produto_id?: string | null
          quantidade?: number | null
          status_anterior?: string | null
          status_novo?: string | null
          usuario_id?: string | null
        }
        Relationships: []
      }
      tab_auditoria: {
        Row: {
          criado_em: string | null
          dados_antigos: Json | null
          dados_novos: Json | null
          id: string
          operacao: string
          registro_id: string
          tabela_nome: string
          usuario_id: string | null
        }
        Insert: {
          criado_em?: string | null
          dados_antigos?: Json | null
          dados_novos?: Json | null
          id?: string
          operacao: string
          registro_id: string
          tabela_nome: string
          usuario_id?: string | null
        }
        Update: {
          criado_em?: string | null
          dados_antigos?: Json | null
          dados_novos?: Json | null
          id?: string
          operacao?: string
          registro_id?: string
          tabela_nome?: string
          usuario_id?: string | null
        }
        Relationships: []
      }
      tab_cargos: {
        Row: {
          created_at: string
          id: string
          nome: string
          permissoes: Json | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          nome: string
          permissoes?: Json | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          nome?: string
          permissoes?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      tab_categorias: {
        Row: {
          cat_descricao: string | null
          cat_nome: string
          created_at: string
          id: string
          updated_at: string
        }
        Insert: {
          cat_descricao?: string | null
          cat_nome: string
          created_at?: string
          id?: string
          updated_at?: string
        }
        Update: {
          cat_descricao?: string | null
          cat_nome?: string
          created_at?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      tab_clientes: {
        Row: {
          cli_bairro: string | null
          cli_cep: string | null
          cli_cidade: string | null
          cli_documento: string | null
          cli_email: string | null
          cli_endereco: string | null
          cli_estado: string | null
          cli_nome: string
          cli_numero: string | null
          cli_telefone: string | null
          created_at: string
          created_by: string | null
          id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          cli_bairro?: string | null
          cli_cep?: string | null
          cli_cidade?: string | null
          cli_documento?: string | null
          cli_email?: string | null
          cli_endereco?: string | null
          cli_estado?: string | null
          cli_nome: string
          cli_numero?: string | null
          cli_telefone?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          cli_bairro?: string | null
          cli_cep?: string | null
          cli_cidade?: string | null
          cli_documento?: string | null
          cli_email?: string | null
          cli_endereco?: string | null
          cli_estado?: string | null
          cli_nome?: string
          cli_numero?: string | null
          cli_telefone?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      tab_consignacao: {
        Row: {
          con_cliente_id: string
          con_data_saida: string
          con_produto_id: string
          con_quantidade: number
          con_status: Database["public"]["Enums"]["status_consignacao"]
          con_venda_id: string | null
          created_at: string
          id: string
          updated_at: string
        }
        Insert: {
          con_cliente_id: string
          con_data_saida?: string
          con_produto_id: string
          con_quantidade: number
          con_status?: Database["public"]["Enums"]["status_consignacao"]
          con_venda_id?: string | null
          created_at?: string
          id?: string
          updated_at?: string
        }
        Update: {
          con_cliente_id?: string
          con_data_saida?: string
          con_produto_id?: string
          con_quantidade?: number
          con_status?: Database["public"]["Enums"]["status_consignacao"]
          con_venda_id?: string | null
          created_at?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tab_consignacao_con_cliente_id_fkey"
            columns: ["con_cliente_id"]
            isOneToOne: false
            referencedRelation: "tab_clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tab_consignacao_con_cliente_id_fkey"
            columns: ["con_cliente_id"]
            isOneToOne: false
            referencedRelation: "view_auditoria_detalhada"
            referencedColumns: ["cliente_id"]
          },
          {
            foreignKeyName: "tab_consignacao_con_cliente_id_fkey"
            columns: ["con_cliente_id"]
            isOneToOne: false
            referencedRelation: "view_crm_analytics"
            referencedColumns: ["cliente_id"]
          },
          {
            foreignKeyName: "tab_consignacao_con_cliente_id_fkey"
            columns: ["con_cliente_id"]
            isOneToOne: false
            referencedRelation: "view_visitas_detalhada"
            referencedColumns: ["cliente_id"]
          },
          {
            foreignKeyName: "tab_consignacao_con_produto_id_fkey"
            columns: ["con_produto_id"]
            isOneToOne: false
            referencedRelation: "tab_produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tab_consignacao_con_produto_id_fkey"
            columns: ["con_produto_id"]
            isOneToOne: false
            referencedRelation: "view_auditoria_detalhada"
            referencedColumns: ["produto_id"]
          },
          {
            foreignKeyName: "tab_consignacao_con_produto_id_fkey"
            columns: ["con_produto_id"]
            isOneToOne: false
            referencedRelation: "view_top_produtos"
            referencedColumns: ["produto_id"]
          },
          {
            foreignKeyName: "tab_consignacao_con_venda_id_fkey"
            columns: ["con_venda_id"]
            isOneToOne: false
            referencedRelation: "tab_vendas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tab_consignacao_con_venda_id_fkey"
            columns: ["con_venda_id"]
            isOneToOne: false
            referencedRelation: "view_auditoria_detalhada"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tab_consignacao_con_venda_id_fkey"
            columns: ["con_venda_id"]
            isOneToOne: false
            referencedRelation: "view_auditoria_detalhada"
            referencedColumns: ["venda_id"]
          },
        ]
      }
      tab_cores: {
        Row: {
          cor_descricao: string | null
          cor_nome: string
          created_at: string
          id: string
          updated_at: string
        }
        Insert: {
          cor_descricao?: string | null
          cor_nome: string
          created_at?: string
          id?: string
          updated_at?: string
        }
        Update: {
          cor_descricao?: string | null
          cor_nome?: string
          created_at?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      tab_finalizadoras: {
        Row: {
          created_at: string | null
          fin_ativa: boolean | null
          fin_codigo_atalho: string | null
          fin_descricao: string
          fin_icone: string | null
          fin_ordem: number
          fin_permite_troco: boolean | null
          id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          fin_ativa?: boolean | null
          fin_codigo_atalho?: string | null
          fin_descricao: string
          fin_icone?: string | null
          fin_ordem?: number
          fin_permite_troco?: boolean | null
          id?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          fin_ativa?: boolean | null
          fin_codigo_atalho?: string | null
          fin_descricao?: string
          fin_icone?: string | null
          fin_ordem?: number
          fin_permite_troco?: boolean | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      tab_fornecedores: {
        Row: {
          created_at: string
          created_by: string | null
          for_bairro: string | null
          for_cep: string | null
          for_cidade: string | null
          for_documento: string | null
          for_endereco: string | null
          for_estado: string | null
          for_fantasia: string | null
          for_numero: string | null
          for_observacao: string | null
          for_razao_social: string
          id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          for_bairro?: string | null
          for_cep?: string | null
          for_cidade?: string | null
          for_documento?: string | null
          for_endereco?: string | null
          for_estado?: string | null
          for_fantasia?: string | null
          for_numero?: string | null
          for_observacao?: string | null
          for_razao_social: string
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          for_bairro?: string | null
          for_cep?: string | null
          for_cidade?: string | null
          for_documento?: string | null
          for_endereco?: string | null
          for_estado?: string | null
          for_fantasia?: string | null
          for_numero?: string | null
          for_observacao?: string | null
          for_razao_social?: string
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      tab_itens_venda: {
        Row: {
          created_at: string
          id: string
          itv_produto_id: string | null
          itv_quantidade: number
          itv_status: string | null
          itv_valor_total: number
          itv_valor_unitario: number
          itv_venda_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          itv_produto_id?: string | null
          itv_quantidade: number
          itv_status?: string | null
          itv_valor_total: number
          itv_valor_unitario: number
          itv_venda_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          itv_produto_id?: string | null
          itv_quantidade?: number
          itv_status?: string | null
          itv_valor_total?: number
          itv_valor_unitario?: number
          itv_venda_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_itens_produto"
            columns: ["itv_produto_id"]
            isOneToOne: false
            referencedRelation: "tab_produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_itens_produto"
            columns: ["itv_produto_id"]
            isOneToOne: false
            referencedRelation: "view_auditoria_detalhada"
            referencedColumns: ["produto_id"]
          },
          {
            foreignKeyName: "fk_itens_produto"
            columns: ["itv_produto_id"]
            isOneToOne: false
            referencedRelation: "view_top_produtos"
            referencedColumns: ["produto_id"]
          },
          {
            foreignKeyName: "fk_itens_venda"
            columns: ["itv_venda_id"]
            isOneToOne: false
            referencedRelation: "tab_vendas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_itens_venda"
            columns: ["itv_venda_id"]
            isOneToOne: false
            referencedRelation: "view_auditoria_detalhada"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_itens_venda"
            columns: ["itv_venda_id"]
            isOneToOne: false
            referencedRelation: "view_auditoria_detalhada"
            referencedColumns: ["venda_id"]
          },
        ]
      }
      tab_log_mensagens: {
        Row: {
          conteudo: string | null
          created_at: string | null
          erro: string | null
          id: string
          metadata: Json | null
          numero_destino: string
          status: string | null
        }
        Insert: {
          conteudo?: string | null
          created_at?: string | null
          erro?: string | null
          id?: string
          metadata?: Json | null
          numero_destino: string
          status?: string | null
        }
        Update: {
          conteudo?: string | null
          created_at?: string | null
          erro?: string | null
          id?: string
          metadata?: Json | null
          numero_destino?: string
          status?: string | null
        }
        Relationships: []
      }
      tab_maintenance_logs: {
        Row: {
          created_at: string | null
          details: Json | null
          error_message: string | null
          finished_at: string | null
          id: string
          operation_name: string
          status: string
        }
        Insert: {
          created_at?: string | null
          details?: Json | null
          error_message?: string | null
          finished_at?: string | null
          id?: string
          operation_name: string
          status: string
        }
        Update: {
          created_at?: string | null
          details?: Json | null
          error_message?: string | null
          finished_at?: string | null
          id?: string
          operation_name?: string
          status?: string
        }
        Relationships: []
      }
      tab_produtos: {
        Row: {
          created_at: string
          id: string
          pro_categoria_id: string
          pro_codigo: string
          pro_codigo_barras: string | null
          pro_cor_id: string
          pro_descricao: string
          pro_estoque_atual: number | null
          pro_estoque_minimo: number | null
          pro_tamanho_id: string
          pro_valor_compra: number | null
          pro_valor_total: number | null
          pro_valor_venda: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          pro_categoria_id: string
          pro_codigo: string
          pro_codigo_barras?: string | null
          pro_cor_id: string
          pro_descricao: string
          pro_estoque_atual?: number | null
          pro_estoque_minimo?: number | null
          pro_tamanho_id: string
          pro_valor_compra?: number | null
          pro_valor_total?: number | null
          pro_valor_venda?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          pro_categoria_id?: string
          pro_codigo?: string
          pro_codigo_barras?: string | null
          pro_cor_id?: string
          pro_descricao?: string
          pro_estoque_atual?: number | null
          pro_estoque_minimo?: number | null
          pro_tamanho_id?: string
          pro_valor_compra?: number | null
          pro_valor_total?: number | null
          pro_valor_venda?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tab_produtos_pro_categoria_id_fkey"
            columns: ["pro_categoria_id"]
            isOneToOne: false
            referencedRelation: "tab_categorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tab_produtos_pro_cor_id_fkey"
            columns: ["pro_cor_id"]
            isOneToOne: false
            referencedRelation: "tab_cores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tab_produtos_pro_tamanho_id_fkey"
            columns: ["pro_tamanho_id"]
            isOneToOne: false
            referencedRelation: "tab_tamanhos"
            referencedColumns: ["id"]
          },
        ]
      }
      tab_tamanhos: {
        Row: {
          created_at: string
          id: string
          tam_descricao: string | null
          tam_nome: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          tam_descricao?: string | null
          tam_nome: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          tam_descricao?: string | null
          tam_nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      tab_teste_conexao: {
        Row: {
          created_at: string
          descricao: string | null
          id: string
          nome: string
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
        }
        Update: {
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
        }
        Relationships: []
      }
      tab_usuarios: {
        Row: {
          created_at: string
          id: string
          updated_at: string
          usu_avatar_url: string | null
          usu_cargo: string | null
          usu_cargo_id: string | null
          usu_email: string | null
          usu_nome: string
        }
        Insert: {
          created_at?: string
          id: string
          updated_at?: string
          usu_avatar_url?: string | null
          usu_cargo?: string | null
          usu_cargo_id?: string | null
          usu_email?: string | null
          usu_nome: string
        }
        Update: {
          created_at?: string
          id?: string
          updated_at?: string
          usu_avatar_url?: string | null
          usu_cargo?: string | null
          usu_cargo_id?: string | null
          usu_email?: string | null
          usu_nome?: string
        }
        Relationships: [
          {
            foreignKeyName: "tab_usuarios_usu_cargo_id_fkey"
            columns: ["usu_cargo_id"]
            isOneToOne: false
            referencedRelation: "tab_cargos"
            referencedColumns: ["id"]
          },
        ]
      }
      tab_vendas: {
        Row: {
          created_at: string
          id: string
          updated_at: string
          ven_cliente_id: string | null
          ven_desconto: number | null
          ven_forma_pagamento: string | null
          ven_status: string | null
          ven_usuario_id: string | null
          ven_valor_total: number
        }
        Insert: {
          created_at?: string
          id?: string
          updated_at?: string
          ven_cliente_id?: string | null
          ven_desconto?: number | null
          ven_forma_pagamento?: string | null
          ven_status?: string | null
          ven_usuario_id?: string | null
          ven_valor_total: number
        }
        Update: {
          created_at?: string
          id?: string
          updated_at?: string
          ven_cliente_id?: string | null
          ven_desconto?: number | null
          ven_forma_pagamento?: string | null
          ven_status?: string | null
          ven_usuario_id?: string | null
          ven_valor_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_vendas_cliente"
            columns: ["ven_cliente_id"]
            isOneToOne: false
            referencedRelation: "tab_clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_vendas_cliente"
            columns: ["ven_cliente_id"]
            isOneToOne: false
            referencedRelation: "view_auditoria_detalhada"
            referencedColumns: ["cliente_id"]
          },
          {
            foreignKeyName: "fk_vendas_cliente"
            columns: ["ven_cliente_id"]
            isOneToOne: false
            referencedRelation: "view_crm_analytics"
            referencedColumns: ["cliente_id"]
          },
          {
            foreignKeyName: "fk_vendas_cliente"
            columns: ["ven_cliente_id"]
            isOneToOne: false
            referencedRelation: "view_visitas_detalhada"
            referencedColumns: ["cliente_id"]
          },
          {
            foreignKeyName: "tab_vendas_ven_usuario_id_fkey"
            columns: ["ven_usuario_id"]
            isOneToOne: false
            referencedRelation: "tab_usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tab_vendas_ven_usuario_id_fkey"
            columns: ["ven_usuario_id"]
            isOneToOne: false
            referencedRelation: "view_auditoria_detalhada"
            referencedColumns: ["usuario_id"]
          },
        ]
      }
      tab_vendas_pagamentos: {
        Row: {
          created_at: string | null
          id: string
          vpa_finalizadora_id: string | null
          vpa_forma_pagamento: string
          vpa_valor: number
          vpa_venda_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          vpa_finalizadora_id?: string | null
          vpa_forma_pagamento: string
          vpa_valor: number
          vpa_venda_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          vpa_finalizadora_id?: string | null
          vpa_forma_pagamento?: string
          vpa_valor?: number
          vpa_venda_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_pagamentos_venda"
            columns: ["vpa_venda_id"]
            isOneToOne: false
            referencedRelation: "tab_vendas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_pagamentos_venda"
            columns: ["vpa_venda_id"]
            isOneToOne: false
            referencedRelation: "view_auditoria_detalhada"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_pagamentos_venda"
            columns: ["vpa_venda_id"]
            isOneToOne: false
            referencedRelation: "view_auditoria_detalhada"
            referencedColumns: ["venda_id"]
          },
          {
            foreignKeyName: "tab_vendas_pagamentos_vpa_finalizadora_id_fkey"
            columns: ["vpa_finalizadora_id"]
            isOneToOne: false
            referencedRelation: "tab_finalizadoras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tab_vendas_pagamentos_vpa_venda_id_fkey"
            columns: ["vpa_venda_id"]
            isOneToOne: false
            referencedRelation: "tab_vendas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tab_vendas_pagamentos_vpa_venda_id_fkey"
            columns: ["vpa_venda_id"]
            isOneToOne: false
            referencedRelation: "view_auditoria_detalhada"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tab_vendas_pagamentos_vpa_venda_id_fkey"
            columns: ["vpa_venda_id"]
            isOneToOne: false
            referencedRelation: "view_auditoria_detalhada"
            referencedColumns: ["venda_id"]
          },
        ]
      }
      tab_visitas: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          updated_at: string
          user_id: string | null
          vis_cliente_id: string
          vis_data_prevista: string
          vis_data_reagendada: string | null
          vis_data_real: string | null
          vis_motivo_cancelamento: string | null
          vis_observacoes: string | null
          vis_produtos_ids: string[] | null
          vis_status: string | null
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          updated_at?: string
          user_id?: string | null
          vis_cliente_id: string
          vis_data_prevista?: string
          vis_data_reagendada?: string | null
          vis_data_real?: string | null
          vis_motivo_cancelamento?: string | null
          vis_observacoes?: string | null
          vis_produtos_ids?: string[] | null
          vis_status?: string | null
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          updated_at?: string
          user_id?: string | null
          vis_cliente_id?: string
          vis_data_prevista?: string
          vis_data_reagendada?: string | null
          vis_data_real?: string | null
          vis_motivo_cancelamento?: string | null
          vis_observacoes?: string | null
          vis_produtos_ids?: string[] | null
          vis_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_visitas_cliente"
            columns: ["vis_cliente_id"]
            isOneToOne: false
            referencedRelation: "tab_clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_visitas_cliente"
            columns: ["vis_cliente_id"]
            isOneToOne: false
            referencedRelation: "view_auditoria_detalhada"
            referencedColumns: ["cliente_id"]
          },
          {
            foreignKeyName: "fk_visitas_cliente"
            columns: ["vis_cliente_id"]
            isOneToOne: false
            referencedRelation: "view_crm_analytics"
            referencedColumns: ["cliente_id"]
          },
          {
            foreignKeyName: "fk_visitas_cliente"
            columns: ["vis_cliente_id"]
            isOneToOne: false
            referencedRelation: "view_visitas_detalhada"
            referencedColumns: ["cliente_id"]
          },
          {
            foreignKeyName: "tab_visitas_vis_cliente_id_fkey"
            columns: ["vis_cliente_id"]
            isOneToOne: false
            referencedRelation: "tab_clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tab_visitas_vis_cliente_id_fkey"
            columns: ["vis_cliente_id"]
            isOneToOne: false
            referencedRelation: "view_auditoria_detalhada"
            referencedColumns: ["cliente_id"]
          },
          {
            foreignKeyName: "tab_visitas_vis_cliente_id_fkey"
            columns: ["vis_cliente_id"]
            isOneToOne: false
            referencedRelation: "view_crm_analytics"
            referencedColumns: ["cliente_id"]
          },
          {
            foreignKeyName: "tab_visitas_vis_cliente_id_fkey"
            columns: ["vis_cliente_id"]
            isOneToOne: false
            referencedRelation: "view_visitas_detalhada"
            referencedColumns: ["cliente_id"]
          },
        ]
      }
    }
    Views: {
      view_auditoria_detalhada: {
        Row: {
          cliente_id: string | null
          cliente_nome: string | null
          created_at: string | null
          id: string | null
          observacao: string | null
          produto_codigo: string | null
          produto_descricao: string | null
          produto_id: string | null
          quantidade: number | null
          tipo_movimentacao: string | null
          usuario_id: string | null
          usuario_nome: string | null
          valor_total: number | null
          venda_id: string | null
        }
        Relationships: []
      }
      view_crm_analytics: {
        Row: {
          cli_cidade: string | null
          cli_nome: string | null
          cli_telefone: string | null
          cliente_id: string | null
          ticket_medio: number | null
          total_gasto: number | null
          ultima_compra: string | null
          vendas_count: number | null
        }
        Relationships: []
      }
      view_formas_pagamento_stats: {
        Row: {
          forma_pagamento: string | null
          total_vendas: number | null
          volume_financeiro: number | null
        }
        Relationships: []
      }
      view_resumo_vendas_diario: {
        Row: {
          data_referencia: string | null
          lucro_total: number | null
          total_vendas: number | null
          volume_vendas: number | null
        }
        Relationships: []
      }
      view_top_produtos: {
        Row: {
          descricao: string | null
          produto_id: string | null
          receita_total: number | null
          total_vendido: number | null
          valor_total: number | null
        }
        Relationships: []
      }
      view_visitas_detalhada: {
        Row: {
          cliente_bairro: string | null
          cliente_cidade: string | null
          cliente_documento: string | null
          cliente_endereco: string | null
          cliente_id: string | null
          cliente_nome: string | null
          cliente_numero: string | null
          cliente_telefone: string | null
          created_at: string | null
          deleted_at: string | null
          id: string | null
          produtos_detalhes: Json | null
          user_id: string | null
          vis_data_prevista: string | null
          vis_data_reagendada: string | null
          vis_data_real: string | null
          vis_motivo_cancelamento: string | null
          vis_observacoes: string | null
          vis_status: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      cancel_all_sales: { Args: never; Returns: undefined }
      cancelar_item_venda: { Args: { p_item_id: string }; Returns: undefined }
      cancelar_item_venda_pdv: {
        Args: { p_item_id: string }
        Returns: undefined
      }
      cancelar_venda_inteira_pdv: {
        Args: { p_venda_id: string }
        Returns: undefined
      }
      cancelar_venda_transacional: {
        Args: { p_venda_id: string }
        Returns: undefined
      }
      cancelar_venda_transacional_segura: {
        Args: { p_venda_id: string }
        Returns: undefined
      }
      check_produto_consistencia: {
        Args: { p_produto_id: string }
        Returns: {
          em_estoque: number
          em_posse: number
          is_consistente: boolean
          total_registrado: number
        }[]
      }
      check_user_permission: {
        Args: { required_permission: string }
        Returns: boolean
      }
      converter_posse_em_venda: {
        Args: { p_cliente_id: string; p_posse_id: string }
        Returns: string
      }
      converter_posse_em_venda_transacional: {
        Args: { p_posse_id: string }
        Returns: string
      }
      has_permission: { Args: { p_permission: string }; Returns: boolean }
      is_admin: { Args: never; Returns: boolean }
      marcar_posse_como_devolvida_transacional: {
        Args: { p_posse_id: string }
        Returns: undefined
      }
      movimentar_estoque: {
        Args: {
          p_observacao?: string
          p_posse_id?: string
          p_produto_id: string
          p_quantidade: number
          p_tipo: string
          p_venda_id?: string
        }
        Returns: undefined
      }
      recalcular_lucro_venda:
        | { Args: { p_venda_id: string }; Returns: undefined }
        | {
            Args: { p_motivo?: string; p_venda_id: string }
            Returns: undefined
          }
      registrar_venda_completa:
        | {
            Args: {
              p_cliente_id: string
              p_desconto: number
              p_forma_pagamento: string
              p_itens: Json
              p_usuario_id: string
              p_valor_total: number
            }
            Returns: string
          }
        | {
            Args: {
              p_cliente_id: string
              p_desconto: number
              p_forma_pagamento: string
              p_itens: Json
              p_pagamentos?: Json
              p_usuario_id: string
              p_valor_total: number
            }
            Returns: string
          }
      registrar_venda_transacional:
        | {
            Args: {
              p_cliente_id: string
              p_itens: Json
              p_total_esperado?: number
            }
            Returns: string
          }
        | {
            Args: {
              p_cliente_id: string
              p_forma_pagamento?: string
              p_itens: Json
              p_total_esperado?: number
            }
            Returns: string
          }
      reset_database_data: { Args: never; Returns: undefined }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      test_estoque_consistency: {
        Args: never
        Returns: {
          detalhe: string
          status: string
          teste: string
        }[]
      }
      test_posse_to_venda_stock_consistency: { Args: never; Returns: string }
    }
    Enums: {
      status_consignacao: "em_posse" | "vendido" | "devolvido"
      status_posse: "em_posse" | "vendido" | "devolvido"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      status_consignacao: ["em_posse", "vendido", "devolvido"],
      status_posse: ["em_posse", "vendido", "devolvido"],
    },
  },
} as const
