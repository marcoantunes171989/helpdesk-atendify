import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Produto, Cliente, Venda, Posse, RetiradaFornecedor, Visita, LeadCRM } from '@/lib/types';

interface AppState {
  produtos: Produto[];
  clientes: Cliente[];
  vendas: Venda[];
  posses: Posse[];
  retiradasFornecedor: RetiradaFornecedor[];
  visitas: Visita[];
  leadsCRM: LeadCRM[];
  
  setProdutos: (produtos: Produto[]) => void;
  setVendas: (vendas: Venda[]) => void;
  addVenda: (venda: Venda) => void;
  updateEstoque: (produtoId: string, quantidade: number) => void;
  setPosses: (posses: Posse[]) => void;
  setRetiradasFornecedor: (retiradas: RetiradaFornecedor[]) => void;
  addVisita: (visita: Visita) => void;
  setVisitas: (visitas: Visita[]) => void;
  addLeadCRM: (lead: LeadCRM) => void;
  setLeadsCRM: (leads: LeadCRM[]) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      produtos: [],
      clientes: [],
      vendas: [],
      posses: [],
      retiradasFornecedor: [],
      visitas: [],
      leadsCRM: [],
      
      setProdutos: (produtos: Produto[]) => set({ produtos }),
      setVendas: (vendas: Venda[]) => set({ vendas }),
      addVenda: (venda: Venda) => set((state: AppState) => ({ 
        vendas: [venda, ...state.vendas] 
      })),
      updateEstoque: (produtoId: string, quantidade: number) => set((state: AppState) => ({
        produtos: state.produtos.map((p: Produto) => 
          p.id === produtoId ? { ...p, pro_estoque_atual: Math.max(0, (p.pro_estoque_atual || 0) - quantidade) } : p
        )
      })),
      setPosses: (posses: Posse[]) => set({ posses }),
      setRetiradasFornecedor: (retiradas: RetiradaFornecedor[]) => set({ retiradasFornecedor: retiradas }),
      addVisita: (visita: Visita) => set((state: AppState) => ({ 
        visitas: [visita, ...state.visitas] 
      })),
      setVisitas: (visitas: Visita[]) => set({ visitas }),
      addLeadCRM: (lead: LeadCRM) => set((state: AppState) => ({ 
        leadsCRM: [lead, ...state.leadsCRM] 
      })),
      setLeadsCRM: (leads: LeadCRM[]) => set({ leadsCRM: leads }),
    }),
    {
      name: 'divas-lingerie-storage',
    }
  )
);
