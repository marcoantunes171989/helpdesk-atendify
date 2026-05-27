# FinanceControl — Prompt Completo para Claude Code

> Cole este prompt diretamente no Claude Code para gerar o projeto completo.

---

## COMO USAR

```bash
# 1. Instale o Claude Code (requer Node.js 18+)
npm install -g @anthropic-ai/claude-code

# 2. Acesse a pasta onde quer criar o projeto
cd ~/projetos

# 3. Inicie o Claude Code
claude

# 4. Cole o prompt abaixo
```

---

## PROMPT — COLE NO CLAUDE CODE

```
Crie um projeto React completo chamado "finance-control" com sistema de controle
financeiro empresarial. Siga TODAS as etapas abaixo na ordem exata.

════════════════════════════════════════════════════════════
ETAPA 1 — CRIAR PROJETO BASE
════════════════════════════════════════════════════════════

Execute:
  npx create-react-app finance-control --template typescript
  cd finance-control

Instale as dependências:
  npm install \
    react-router-dom@6 \
    @tanstack/react-query@5 \
    zustand@4 \
    react-hook-form@7 \
    zod@3 \
    @hookform/resolvers@3 \
    recharts@2 \
    date-fns@3 \
    react-dropzone@14 \
    lucide-react@0.383.0 \
    clsx \
    tailwind-merge \
    @radix-ui/react-dialog \
    @radix-ui/react-select \
    @radix-ui/react-tabs \
    @radix-ui/react-toast \
    @radix-ui/react-dropdown-menu \
    @radix-ui/react-badge \
    @radix-ui/react-avatar \
    @radix-ui/react-progress \
    @radix-ui/react-separator \
    @radix-ui/react-popover \
    @radix-ui/react-label

Instale Tailwind CSS:
  npm install -D tailwindcss postcss autoprefixer
  npx tailwindcss init -p

════════════════════════════════════════════════════════════
ETAPA 2 — CONFIGURAÇÕES BASE
════════════════════════════════════════════════════════════

Crie/substitua o arquivo tailwind.config.js:

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#E1F5EE',
          100: '#9FE1CB',
          200: '#5DCAA5',
          300: '#2BB887',
          400: '#1D9E75',
          500: '#178A63',
          600: '#0F6E56',
          700: '#0A5541',
          800: '#085041',
          900: '#04342C',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
};

Substitua src/index.css pelo conteúdo:

@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --radius: 0.5rem;
  }
  * { @apply border-border; }
  body { @apply bg-slate-50 text-slate-900 antialiased; }
}

@layer components {
  .card { @apply bg-white rounded-xl border border-slate-200 shadow-sm; }
  .btn { @apply inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed; }
  .btn-primary { @apply btn bg-brand-400 text-white hover:bg-brand-500 active:scale-95; }
  .btn-secondary { @apply btn bg-slate-100 text-slate-700 hover:bg-slate-200 active:scale-95; }
  .btn-danger { @apply btn bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 active:scale-95; }
  .btn-ghost { @apply btn text-slate-600 hover:bg-slate-100 active:scale-95; }
  .input { @apply w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white outline-none focus:ring-2 focus:ring-brand-400/30 focus:border-brand-400 transition-all placeholder:text-slate-400; }
  .label { @apply block text-xs font-medium text-slate-600 mb-1.5; }
  .badge { @apply inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium; }
  .badge-green  { @apply badge bg-emerald-50  text-emerald-700 border border-emerald-200; }
  .badge-red    { @apply badge bg-red-50      text-red-700     border border-red-200; }
  .badge-amber  { @apply badge bg-amber-50    text-amber-700   border border-amber-200; }
  .badge-blue   { @apply badge bg-blue-50     text-blue-700    border border-blue-200; }
  .badge-gray   { @apply badge bg-slate-100   text-slate-600   border border-slate-200; }
  .badge-purple { @apply badge bg-purple-50   text-purple-700  border border-purple-200; }
}

════════════════════════════════════════════════════════════
ETAPA 3 — ESTRUTURA DE ARQUIVOS
════════════════════════════════════════════════════════════

Crie a seguinte estrutura de diretórios dentro de src/:

src/
├── components/
│   ├── ui/
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Select.tsx
│   │   ├── Modal.tsx
│   │   ├── Badge.tsx
│   │   ├── Toast.tsx
│   │   ├── Table.tsx
│   │   ├── Card.tsx
│   │   ├── DropZone.tsx
│   │   └── Spinner.tsx
│   ├── layout/
│   │   ├── AppLayout.tsx
│   │   ├── Sidebar.tsx
│   │   └── Topbar.tsx
│   └── shared/
│       ├── KpiCard.tsx
│       ├── FluxoBarChart.tsx
│       ├── CategoriaDonut.tsx
│       ├── LancamentoRow.tsx
│       └── StatusBadge.tsx
├── pages/
│   ├── Dashboard.tsx
│   ├── Lancamentos.tsx
│   ├── ContasPagar.tsx
│   ├── ContasReceber.tsx
│   ├── Agendamento.tsx
│   ├── Empresas.tsx
│   ├── Categorias.tsx
│   └── Relatorios.tsx
├── store/
│   ├── useFinanceStore.ts
│   ├── useEmpresaStore.ts
│   └── useCategoriaStore.ts
├── types/
│   └── index.ts
├── utils/
│   ├── format.ts
│   ├── calculos.ts
│   └── validators.ts
├── hooks/
│   ├── useLancamentos.ts
│   ├── useEmpresas.ts
│   └── useCategorias.ts
├── data/
│   └── seed.ts
├── App.tsx
├── Router.tsx
└── main.tsx  (ou index.tsx)

════════════════════════════════════════════════════════════
ETAPA 4 — TIPOS (src/types/index.ts)
════════════════════════════════════════════════════════════

Crie src/types/index.ts com EXATAMENTE este conteúdo:

export type TipoLancamento = 'credito' | 'debito';
export type StatusLancamento = 'pendente' | 'pago' | 'recebido' | 'vencido' | 'cancelado';
export type TipoRecorrencia = 'avista' | 'fixo' | 'parcelas';
export type Recorrencia = 'mensal' | 'bimestral' | 'trimestral' | 'semestral' | 'anual';

export interface Empresa {
  id: string;
  razaoSocial: string;
  nomeFantasia: string;
  cnpj: string;
  telefone: string;
  email: string;
  cidade: string;
  estado: string;
  cor: string;
  ativo: boolean;
  createdAt: string;
}

export interface Categoria {
  id: string;
  nome: string;
  tipo: TipoLancamento;
  cor: string;
  icone: string;
  ativo: boolean;
}

export interface Anexo {
  id: string;
  nome: string;
  tipo: 'boleto' | 'comprovante' | 'nf' | 'outro';
  url: string;
  tamanho: number;
  createdAt: string;
}

export interface Parcela {
  numero: number;
  valor: number;
  vencimento: string;
  status: StatusLancamento;
  pago_em?: string;
}

export interface Lancamento {
  id: string;
  tipo: TipoLancamento;
  descricao: string;
  empresaId: string;
  empresa?: Empresa;
  categoriaId: string;
  categoria?: Categoria;
  valor: number;
  valorTotal: number;
  dataEmissao: string;
  dataVencimento: string;
  dataPagamento?: string;
  status: StatusLancamento;
  tipoRecorrencia: TipoRecorrencia;
  recorrencia?: Recorrencia;
  numeroParcelas?: number;
  parcelaAtual?: number;
  parcelas?: Parcela[];
  diaVencimento?: number;
  anexos: Anexo[];
  observacoes?: string;
  competencia: string; // YYYY-MM
  createdAt: string;
  updatedAt: string;
}

export interface FiltroLancamento {
  empresaId?: string;
  categoriaId?: string;
  status?: StatusLancamento;
  tipo?: TipoLancamento;
  competencia?: string;
  busca?: string;
}

export interface DashboardKpis {
  receitasMes: number;
  despesasMes: number;
  saldoLiquido: number;
  totalVencer7dias: number;
  totalVencer30dias: number;
  titulosPendentes: number;
}

export interface FluxoMensal {
  mes: string;
  mesAbrev: string;
  receitas: number;
  despesas: number;
  saldo: number;
}

export interface CategoriaTotais {
  categoriaId: string;
  nome: string;
  valor: number;
  percentual: number;
  cor: string;
}

════════════════════════════════════════════════════════════
ETAPA 5 — STORE PRINCIPAL (src/store/useFinanceStore.ts)
════════════════════════════════════════════════════════════

Crie src/store/useFinanceStore.ts usando Zustand com persistência em localStorage:

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Lancamento, FiltroLancamento, DashboardKpis, FluxoMensal } from '../types';
import { seedLancamentos } from '../data/seed';
import { format, isAfter, isBefore, addDays, parseISO } from 'date-fns';

interface FinanceState {
  lancamentos: Lancamento[];
  filtros: FiltroLancamento;
  // Actions
  addLancamento: (l: Omit<Lancamento, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateLancamento: (id: string, dados: Partial<Lancamento>) => void;
  deleteLancamento: (id: string) => void;
  baixarLancamento: (id: string, dataPagamento: string) => void;
  setFiltros: (f: Partial<FiltroLancamento>) => void;
  // Computed
  getLancamentosFiltrados: () => Lancamento[];
  getKpis: () => DashboardKpis;
  getFluxoMensal: (ano: number) => FluxoMensal[];
  getLancamentosPagar: () => Lancamento[];
  getLancamentosReceber: () => Lancamento[];
}

export const useFinanceStore = create<FinanceState>()(
  persist(
    (set, get) => ({
      lancamentos: seedLancamentos,
      filtros: {},

      addLancamento: (dados) => {
        const now = new Date().toISOString();
        const novoLancamento: Lancamento = {
          ...dados,
          id: crypto.randomUUID(),
          createdAt: now,
          updatedAt: now,
        };

        // Se for parcelado, gera todas as parcelas como lançamentos filhos
        if (dados.tipoRecorrencia === 'parcelas' && dados.numeroParcelas) {
          const parcelas: Lancamento[] = [];
          for (let i = 0; i < dados.numeroParcelas; i++) {
            const vencParcela = new Date(dados.dataVencimento);
            vencParcela.setMonth(vencParcela.getMonth() + i);
            parcelas.push({
              ...novoLancamento,
              id: crypto.randomUUID(),
              valor: dados.valor,
              valorTotal: dados.valorTotal,
              parcelaAtual: i + 1,
              dataVencimento: format(vencParcela, 'yyyy-MM-dd'),
              competencia: format(vencParcela, 'yyyy-MM'),
              descricao: `${dados.descricao} (${i + 1}/${dados.numeroParcelas})`,
            });
          }
          set((s) => ({ lancamentos: [...s.lancamentos, ...parcelas] }));
          return;
        }

        set((s) => ({ lancamentos: [...s.lancamentos, novoLancamento] }));
      },

      updateLancamento: (id, dados) =>
        set((s) => ({
          lancamentos: s.lancamentos.map((l) =>
            l.id === id ? { ...l, ...dados, updatedAt: new Date().toISOString() } : l
          ),
        })),

      deleteLancamento: (id) =>
        set((s) => ({ lancamentos: s.lancamentos.filter((l) => l.id !== id) })),

      baixarLancamento: (id, dataPagamento) =>
        set((s) => ({
          lancamentos: s.lancamentos.map((l) =>
            l.id === id
              ? {
                  ...l,
                  status: l.tipo === 'credito' ? 'recebido' : 'pago',
                  dataPagamento,
                  updatedAt: new Date().toISOString(),
                }
              : l
          ),
        })),

      setFiltros: (f) => set((s) => ({ filtros: { ...s.filtros, ...f } })),

      getLancamentosFiltrados: () => {
        const { lancamentos, filtros } = get();
        return lancamentos.filter((l) => {
          if (filtros.empresaId && l.empresaId !== filtros.empresaId) return false;
          if (filtros.categoriaId && l.categoriaId !== filtros.categoriaId) return false;
          if (filtros.status && l.status !== filtros.status) return false;
          if (filtros.tipo && l.tipo !== filtros.tipo) return false;
          if (filtros.competencia && l.competencia !== filtros.competencia) return false;
          if (filtros.busca) {
            const b = filtros.busca.toLowerCase();
            if (!l.descricao.toLowerCase().includes(b)) return false;
          }
          return true;
        });
      },

      getKpis: () => {
        const { lancamentos } = get();
        const hoje = new Date();
        const competencia = format(hoje, 'yyyy-MM');
        const daqui7 = addDays(hoje, 7);
        const daqui30 = addDays(hoje, 30);

        const doMes = lancamentos.filter((l) => l.competencia === competencia);
        const receitasMes = doMes
          .filter((l) => l.tipo === 'credito' && (l.status === 'recebido' || l.status === 'pendente'))
          .reduce((acc, l) => acc + l.valor, 0);
        const despesasMes = doMes
          .filter((l) => l.tipo === 'debito' && (l.status === 'pago' || l.status === 'pendente'))
          .reduce((acc, l) => acc + l.valor, 0);

        const pendentes = lancamentos.filter((l) => l.status === 'pendente' || l.status === 'vencido');
        const totalVencer7dias = pendentes
          .filter((l) => {
            const v = parseISO(l.dataVencimento);
            return isAfter(v, hoje) && isBefore(v, daqui7);
          })
          .reduce((acc, l) => acc + l.valor, 0);
        const totalVencer30dias = pendentes
          .filter((l) => {
            const v = parseISO(l.dataVencimento);
            return isAfter(v, hoje) && isBefore(v, daqui30);
          })
          .reduce((acc, l) => acc + l.valor, 0);

        return {
          receitasMes,
          despesasMes,
          saldoLiquido: receitasMes - despesasMes,
          totalVencer7dias,
          totalVencer30dias,
          titulosPendentes: pendentes.length,
        };
      },

      getFluxoMensal: (ano) => {
        const { lancamentos } = get();
        const meses = Array.from({ length: 12 }, (_, i) => {
          const mes = format(new Date(ano, i, 1), 'yyyy-MM');
          const mesAbrev = format(new Date(ano, i, 1), 'MMM');
          const doMes = lancamentos.filter((l) => l.competencia === mes);
          const receitas = doMes
            .filter((l) => l.tipo === 'credito')
            .reduce((acc, l) => acc + l.valor, 0);
          const despesas = doMes
            .filter((l) => l.tipo === 'debito')
            .reduce((acc, l) => acc + l.valor, 0);
          return { mes, mesAbrev, receitas, despesas, saldo: receitas - despesas };
        });
        return meses;
      },

      getLancamentosPagar: () =>
        get().lancamentos.filter((l) => l.tipo === 'debito'),

      getLancamentosReceber: () =>
        get().lancamentos.filter((l) => l.tipo === 'credito'),
    }),
    { name: 'finance-store' }
  )
);

════════════════════════════════════════════════════════════
ETAPA 6 — STORE DE EMPRESAS (src/store/useEmpresaStore.ts)
════════════════════════════════════════════════════════════

Crie src/store/useEmpresaStore.ts:

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Empresa } from '../types';

const empresasSeed: Empresa[] = [
  { id: '1', razaoSocial: 'TechSol Ltda', nomeFantasia: 'TechSol', cnpj: '12.345.678/0001-90', telefone: '(11) 98765-4321', email: 'contato@techsol.com.br', cidade: 'São Paulo', estado: 'SP', cor: '#1D9E75', ativo: true, createdAt: '2024-01-01' },
  { id: '2', razaoSocial: 'Mercado Bom Ltda', nomeFantasia: 'Mercado Bom', cnpj: '98.765.432/0001-01', telefone: '(11) 91234-5678', email: 'financeiro@mercadobom.com.br', cidade: 'Campinas', estado: 'SP', cor: '#378ADD', ativo: true, createdAt: '2024-01-01' },
  { id: '3', razaoSocial: 'Construtora ABC S/A', nomeFantasia: 'ABC Construções', cnpj: '11.222.333/0001-44', telefone: '(11) 94567-8901', email: 'abc@construtora.com.br', cidade: 'São Paulo', estado: 'SP', cor: '#BA7517', ativo: true, createdAt: '2024-01-01' },
];

interface EmpresaState {
  empresas: Empresa[];
  addEmpresa: (e: Omit<Empresa, 'id' | 'createdAt'>) => void;
  updateEmpresa: (id: string, dados: Partial<Empresa>) => void;
  deleteEmpresa: (id: string) => void;
}

export const useEmpresaStore = create<EmpresaState>()(
  persist(
    (set) => ({
      empresas: empresasSeed,
      addEmpresa: (dados) =>
        set((s) => ({
          empresas: [...s.empresas, { ...dados, id: crypto.randomUUID(), createdAt: new Date().toISOString() }],
        })),
      updateEmpresa: (id, dados) =>
        set((s) => ({ empresas: s.empresas.map((e) => (e.id === id ? { ...e, ...dados } : e)) })),
      deleteEmpresa: (id) =>
        set((s) => ({ empresas: s.empresas.filter((e) => e.id !== id) })),
    }),
    { name: 'empresa-store' }
  )
);

════════════════════════════════════════════════════════════
ETAPA 7 — STORE DE CATEGORIAS (src/store/useCategoriaStore.ts)
════════════════════════════════════════════════════════════

Crie src/store/useCategoriaStore.ts:

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Categoria } from '../types';

const categoriasSeed: Categoria[] = [
  { id: 'c1', nome: 'Aluguel',        tipo: 'debito',  cor: '#E24B4A', icone: 'building-2',    ativo: true },
  { id: 'c2', nome: 'Energia',        tipo: 'debito',  cor: '#BA7517', icone: 'bolt',          ativo: true },
  { id: 'c3', nome: 'Internet',       tipo: 'debito',  cor: '#7F77DD', icone: 'wifi',          ativo: true },
  { id: 'c4', nome: 'Pessoal',        tipo: 'debito',  cor: '#D4537E', icone: 'users',         ativo: true },
  { id: 'c5', nome: 'Fornecedor',     tipo: 'debito',  cor: '#888780', icone: 'truck',         ativo: true },
  { id: 'c6', nome: 'Impostos',       tipo: 'debito',  cor: '#E24B4A', icone: 'receipt-2',     ativo: true },
  { id: 'c7', nome: 'Manutenção',     tipo: 'debito',  cor: '#BA7517', icone: 'tool',          ativo: true },
  { id: 'c8', nome: 'Marketing',      tipo: 'debito',  cor: '#7F77DD', icone: 'speakerphone',  ativo: true },
  { id: 'c9', nome: 'Serviços',       tipo: 'credito', cor: '#1D9E75', icone: 'briefcase',     ativo: true },
  { id: 'c10',nome: 'Vendas',         tipo: 'credito', cor: '#1D9E75', icone: 'shopping-cart', ativo: true },
  { id: 'c11',nome: 'Comissões',      tipo: 'credito', cor: '#378ADD', icone: 'coin',          ativo: true },
  { id: 'c12',nome: 'Outros',         tipo: 'credito', cor: '#888780', icone: 'dots-circle',   ativo: true },
];

interface CategoriaState {
  categorias: Categoria[];
  addCategoria: (c: Omit<Categoria, 'id'>) => void;
  updateCategoria: (id: string, dados: Partial<Categoria>) => void;
  deleteCategoria: (id: string) => void;
}

export const useCategoriaStore = create<CategoriaState>()(
  persist(
    (set) => ({
      categorias: categoriasSeed,
      addCategoria: (dados) =>
        set((s) => ({ categorias: [...s.categorias, { ...dados, id: crypto.randomUUID() }] })),
      updateCategoria: (id, dados) =>
        set((s) => ({ categorias: s.categorias.map((c) => (c.id === id ? { ...c, ...dados } : c)) })),
      deleteCategoria: (id) =>
        set((s) => ({ categorias: s.categorias.filter((c) => c.id !== id) })),
    }),
    { name: 'categoria-store' }
  )
);

════════════════════════════════════════════════════════════
ETAPA 8 — DADOS SEED (src/data/seed.ts)
════════════════════════════════════════════════════════════

Crie src/data/seed.ts com 15-20 lançamentos de exemplo cobrindo:
- Créditos e débitos
- Status variados: pago, recebido, pendente, vencido
- Lançamentos parcelados (3-12 parcelas)
- Contas fixas mensais
- Competências nos últimos 6 meses
- Diferentes empresas (IDs: '1', '2', '3') e categorias (IDs: 'c1' a 'c12')
- Campos obrigatórios: id, tipo, descricao, empresaId, categoriaId, valor,
  valorTotal, dataEmissao, dataVencimento, status, tipoRecorrencia,
  anexos: [], competencia (formato 'yyyy-MM'), createdAt, updatedAt

════════════════════════════════════════════════════════════
ETAPA 9 — UTILITÁRIOS (src/utils/)
════════════════════════════════════════════════════════════

Crie src/utils/format.ts:

import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const fmtMoeda = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export const fmtData = (d: string) =>
  format(parseISO(d), 'dd/MM/yyyy', { locale: ptBR });

export const fmtDataHora = (d: string) =>
  format(parseISO(d), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });

export const fmtMesAno = (competencia: string) => {
  const [ano, mes] = competencia.split('-');
  return format(new Date(Number(ano), Number(mes) - 1, 1), 'MMMM yyyy', { locale: ptBR });
};

export const fmtPercentual = (v: number) => `${v.toFixed(1)}%`;

export const competenciaAtual = () =>
  format(new Date(), 'yyyy-MM');

Crie src/utils/calculos.ts com funções:
- calcularParcelasValor(valorTotal: number, nParcelas: number): number — valor total / parcelas
- calcularTotalParcelado(valorParcela: number, nParcelas: number): number — valor × parcelas
- calcularSaldo(receitas: number, despesas: number): number
- calcularPercentual(valor: number, total: number): number
- isVencido(dataVencimento: string): boolean — compara com hoje
- diasParaVencer(dataVencimento: string): number

Crie src/utils/validators.ts com schemas Zod:

import { z } from 'zod';

export const lancamentoSchema = z.object({
  tipo: z.enum(['credito', 'debito']),
  descricao: z.string().min(3, 'Mínimo 3 caracteres').max(200),
  empresaId: z.string().min(1, 'Selecione uma empresa'),
  categoriaId: z.string().min(1, 'Selecione uma categoria'),
  valor: z.number({ invalid_type_error: 'Informe o valor' }).positive('Valor deve ser positivo'),
  dataEmissao: z.string().min(1, 'Informe a data de emissão'),
  dataVencimento: z.string().min(1, 'Informe o vencimento'),
  tipoRecorrencia: z.enum(['avista', 'fixo', 'parcelas']),
  numeroParcelas: z.number().int().min(2).max(120).optional(),
  recorrencia: z.enum(['mensal','bimestral','trimestral','semestral','anual']).optional(),
  diaVencimento: z.number().int().min(1).max(31).optional(),
  observacoes: z.string().optional(),
});

export type LancamentoFormData = z.infer<typeof lancamentoSchema>;

export const empresaSchema = z.object({
  razaoSocial: z.string().min(3),
  nomeFantasia: z.string().min(2),
  cnpj: z.string().regex(/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/, 'CNPJ inválido'),
  telefone: z.string().min(10),
  email: z.string().email('E-mail inválido'),
  cidade: z.string().min(2),
  estado: z.string().length(2, 'Use a sigla do estado'),
  cor: z.string(),
});

════════════════════════════════════════════════════════════
ETAPA 10 — COMPONENTES UI (src/components/ui/)
════════════════════════════════════════════════════════════

Crie cada componente com as seguintes especificações:

── Button.tsx ──────────────────────────────────────────────
Props: variant ('primary'|'secondary'|'danger'|'ghost'), size ('sm'|'md'|'lg'),
loading (boolean), icon (React.ReactNode), children, + HTMLButtonElement props.
Usar clsx para classes condicionais. Mostrar Spinner quando loading=true.

── Input.tsx ────────────────────────────────────────────────
Props: label, error, hint, leftIcon, rightIcon, + HTMLInputElement props.
Usar forwardRef. Mostrar borda vermelha e mensagem de erro abaixo quando error.

── Select.tsx ───────────────────────────────────────────────
Props: label, error, options (array de {value, label}), placeholder, + HTMLSelectElement props.
Usar forwardRef.

── Modal.tsx ────────────────────────────────────────────────
Props: open, onClose, title, children, footer, size ('sm'|'md'|'lg'|'xl').
Usar @radix-ui/react-dialog. Overlay com backdrop-blur-sm.
Animação de entrada/saída com transition.

── Badge.tsx ────────────────────────────────────────────────
Props: variant ('green'|'red'|'amber'|'blue'|'gray'|'purple'), children, dot (boolean).
O dot mostra um círculo colorido antes do texto.

── Table.tsx ────────────────────────────────────────────────
Props genérica com columns (array de {key, header, render?, width?, align?})
e data (array de qualquer objeto).
Thead com sticky top. Hover nas linhas. Estado vazio com ícone e mensagem.
Suporte a coluna de ações no final.

── DropZone.tsx ─────────────────────────────────────────────
Props: onFilesAccepted (files: File[]) => void, accept, maxSize, label, hint.
Usar react-dropzone. Visual de arrastar com borda dashed, ícone Upload, lista
de arquivos aceitos abaixo com nome, tamanho e botão remover.

── Spinner.tsx ──────────────────────────────────────────────
SVG animado com border-t-brand-400, tamanhos sm/md/lg.

── Card.tsx ─────────────────────────────────────────────────
Props: title, subtitle, action (ReactNode), children, padding ('none'|'sm'|'md'|'lg'), className.

── Toast.tsx ────────────────────────────────────────────────
Hook useToast e componente Toaster usando @radix-ui/react-toast.
Suporte a variantes: success, error, warning, info.

════════════════════════════════════════════════════════════
ETAPA 11 — COMPONENTES DE LAYOUT (src/components/layout/)
════════════════════════════════════════════════════════════

── AppLayout.tsx ────────────────────────────────────────────
Layout principal: sidebar fixa à esquerda (240px) + área de conteúdo com scroll.
Topbar no topo da área de conteúdo.
Renderizar <Outlet /> do react-router-dom no conteúdo.
Incluir <Toaster /> do Toast.tsx.

── Sidebar.tsx ──────────────────────────────────────────────
Logo no topo (ícone + "FinanceControl").
Navegação com grupos:
  PRINCIPAL: Dashboard, Lançamentos
  FINANCEIRO: Contas a Pagar (badge com contagem de vencidos), Contas a Receber, Agendamento
  CADASTROS: Empresas, Categorias, Relatórios
Highlight da rota ativa com NavLink do react-router-dom.
Seletor de empresa ativa no rodapé da sidebar.
Ícones da biblioteca lucide-react para cada item.

── Topbar.tsx ───────────────────────────────────────────────
Título da página atual (via useLocation + mapa de rotas→títulos).
Filtro de competência (mês/ano) com seletor.
Botão "Novo lançamento" que navega para /lancamentos.
Avatar do usuário com dropdown.

════════════════════════════════════════════════════════════
ETAPA 12 — COMPONENTES COMPARTILHADOS (src/components/shared/)
════════════════════════════════════════════════════════════

── KpiCard.tsx ──────────────────────────────────────────────
Props: title, value (number), prefix ('R$'|'%'|''), format ('moeda'|'numero'|'percentual'),
icon (ReactNode), trend ({value: number, label: string} opcional), colorVariant.
Card com fundo branco, borda colorida à esquerda, ícone colorido, valor em 24px/600,
variação percentual com seta para cima/baixo.

── FluxoBarChart.tsx ────────────────────────────────────────
Gráfico de barras agrupadas usando Recharts (BarChart).
Dados: FluxoMensal[]. Barras: Receitas (verde) e Despesas (vermelho).
Tooltip customizado com valores formatados em BRL.
Legenda embaixo. Eixo Y formatado em milhar (ex: "42K").
ResponsiveContainer com height={240}.

── CategoriaDonut.tsx ───────────────────────────────────────
Gráfico de rosca usando Recharts (PieChart + Pie com innerRadius).
Dados: CategoriaTotais[]. Centro com valor total.
Legenda à direita com cor, nome e percentual.
ResponsiveContainer com height={180}.

── LancamentoRow.tsx ────────────────────────────────────────
Linha de lançamento para listas: ícone tipo (↑/↓ colorido), descrição,
empresa, categoria em badge, valor colorido, data, status badge, ações.
Props: lancamento, onEdit, onDelete, onBaixar, onVerAnexos.

── StatusBadge.tsx ──────────────────────────────────────────
Mapa status → variant do Badge:
  pago/recebido → green, pendente → amber, vencido → red, cancelado → gray.

════════════════════════════════════════════════════════════
ETAPA 13 — PÁGINAS (src/pages/)
════════════════════════════════════════════════════════════

── Dashboard.tsx ────────────────────────────────────────────
Seção 1: Grid 4 colunas com KpiCards:
  - Receitas do mês (verde, ícone TrendingUp)
  - Despesas do mês (vermelho, ícone TrendingDown)
  - Saldo líquido (azul, ícone Scale)
  - A vencer em 7 dias (âmbar, ícone Clock)

Seção 2: Grid 2 colunas:
  - FluxoBarChart (últimos 6 meses) — coluna larga
  - CategoriaDonut (despesas por categoria) — coluna estreita

Seção 3: Grid 2 colunas:
  - Últimos 10 lançamentos (LancamentoRow)
  - Próximos 5 vencimentos (LancamentoRow filtrado por status pendente/vencido)

Todos os dados vêm de useFinanceStore + useEmpresaStore + useCategoriaStore.
Enriquecer lançamentos com objetos empresa e categoria antes de exibir.

── Lancamentos.tsx ──────────────────────────────────────────
Dividido em 2 colunas: formulário (esquerda) + lista recente (direita).

FORMULÁRIO (react-hook-form + zod):
  1. Tipo toggle: Crédito | Débito (botões grandes com cor)
  2. Empresa (Select com empresas ativas)
  3. Categoria (Select filtrado pelo tipo selecionado)
  4. Descrição (Input texto)
  5. Valor (Input number com máscara monetária)
  6. Data emissão + Data vencimento (date inputs em grid 2 cols)
  7. Tipo recorrência (cards clicáveis: À vista | Conta fixa | Parcelado)
     - Se "Parcelado": mostrar nº parcelas + seletor "Valor total dividido" / "Valor mensal único"
       + preview calculado em tempo real
     - Se "Conta fixa": mostrar Recorrência (select) + Dia vencimento (input)
  8. Seção Anexos: dois DropZones lado a lado (Boleto/NF e Comprovante)
     com lista de arquivos anexados abaixo
  9. Observações (textarea)
  10. Botões: Limpar | Salvar lançamento

Validação com Zod. Ao salvar, chamar store.addLancamento() e exibir toast de sucesso.

LISTA RECENTE: últimos 8 lançamentos em LancamentoRow.
Resumo do mês embaixo: progresso de créditos / débitos / saldo.

── ContasPagar.tsx ──────────────────────────────────────────
Barra de filtros: busca, status (select), categoria (select), competência (select).
4 KPI cards mini: Total | Pago | Pendente | Vencido.
Tabela completa com colunas:
  Descrição | Empresa | Categoria | Emissão | Vencimento | Valor | Parcela | Situação | Ações
Ações por linha: Editar (Modal) | Anexos | Baixar (Modal confirmar data pagamento) | Excluir.
Totais no rodapé da tabela.
Modal de baixa: campo data pagamento + confirmação.
Modal de edição: mesmo formulário de lançamento preenchido.
Modal de anexos: lista de arquivos com download e novo upload.

── ContasReceber.tsx ────────────────────────────────────────
Mesma estrutura de ContasPagar, filtrado por tipo 'credito'.
Ações adaptadas (Baixar como "Marcar como recebido").

── Agendamento.tsx ──────────────────────────────────────────
Grid: calendário (esquerda) + painel lateral (direita).

CALENDÁRIO:
  - Cabeçalho com mês/ano + botões anterior/próximo
  - Dias da semana + células do mês
  - Cada célula mostra mini-badges coloridos dos lançamentos (máx 3, "+N" se mais)
  - Célula de hoje destacada com borda brand-400
  - Click em célula abre popup com lançamentos do dia

PAINEL LATERAL:
  - Resumo do mês: total a receber / total a pagar / saldo
  - Lista de contas fixas (tipoRecorrencia === 'fixo') com indicador de recorrência
  - Próximas 10 contas ordenadas por vencimento

── Empresas.tsx ─────────────────────────────────────────────
Grid de cards de empresa (3 por linha):
  - Avatar colorido com iniciais
  - Nome, CNPJ, cidade/estado
  - Indicadores: total lançamentos, valor em aberto
  - Botões: Editar | Ativar/Desativar

Botão "+ Nova empresa" abre Modal com formulário (react-hook-form + empresaSchema).
Click no card seleciona empresa e mostra detalhes no painel lateral:
  - Dados completos editáveis
  - Histórico dos últimos lançamentos (mini tabela)
  - KPIs: receitas/despesas/saldo da empresa

── Categorias.tsx ───────────────────────────────────────────
Duas colunas: Despesas | Receitas.
Grid de cards de categoria com:
  - Círculo colorido com ícone
  - Nome
  - Total de lançamentos vinculados
  - Valor total no mês
  - Botões: Editar | Excluir

Modal de criação/edição com: nome, tipo, cor (color picker), ícone (select de opções).
Botão "+ Nova categoria" no topo de cada coluna.

── Relatorios.tsx ───────────────────────────────────────────
Filtros: período (competência ou intervalo), empresa, categoria.

Seção 1 — KPIs: Receita | Despesa | Lucro | Margem %.
Seção 2 — DRE Simplificado: tabela com receita bruta, deduções, CPV,
  despesas operacionais, despesas pessoal, impostos, resultado líquido.
Seção 3 — Gráfico de barras: evolução mensal (12 meses).
Seção 4 — Ranking de categorias: barras horizontais com valor e %.
Seção 5 — Tabela de lançamentos completa (exportável).
Botão "Exportar CSV": gera e faz download de arquivo CSV com todos os lançamentos filtrados.

════════════════════════════════════════════════════════════
ETAPA 14 — ROTEAMENTO (src/Router.tsx)
════════════════════════════════════════════════════════════

Crie src/Router.tsx com react-router-dom v6:

import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import Dashboard from './pages/Dashboard';
import Lancamentos from './pages/Lancamentos';
import ContasPagar from './pages/ContasPagar';
import ContasReceber from './pages/ContasReceber';
import Agendamento from './pages/Agendamento';
import Empresas from './pages/Empresas';
import Categorias from './pages/Categorias';
import Relatorios from './pages/Relatorios';

const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: 'dashboard',  element: <Dashboard /> },
      { path: 'lancamentos', element: <Lancamentos /> },
      { path: 'pagar',      element: <ContasPagar /> },
      { path: 'receber',    element: <ContasReceber /> },
      { path: 'agendamento', element: <Agendamento /> },
      { path: 'empresas',   element: <Empresas /> },
      { path: 'categorias', element: <Categorias /> },
      { path: 'relatorios', element: <Relatorios /> },
    ],
  },
]);

export default function Router() {
  return <RouterProvider router={router} />;
}

════════════════════════════════════════════════════════════
ETAPA 15 — APP ENTRY POINT
════════════════════════════════════════════════════════════

Substitua src/App.tsx:

import Router from './Router';
export default function App() { return <Router />; }

Garanta que src/index.tsx (ou main.tsx) importe './index.css' antes de renderizar.

════════════════════════════════════════════════════════════
ETAPA 16 — FUNCIONALIDADES EXTRAS
════════════════════════════════════════════════════════════

Implemente as seguintes funcionalidades extras em cada lugar adequado:

1. MÁSCARA MONETÁRIA: Crie um hook useMaskMoeda que formata input em tempo real
   para o padrão BRL (ex: 1234 → "R$ 12,34"), sem bibliotecas externas.

2. EXPORTAR CSV: Na página Relatórios, botão que gera CSV dos lançamentos filtrados
   com cabeçalhos: ID, Tipo, Descricao, Empresa, Categoria, Valor, Vencimento, Status.

3. INDICADOR DE VENCIDO: Job via useEffect no AppLayout que roda ao iniciar e
   atualiza automaticamente o status de 'pendente' para 'vencido' quando
   dataVencimento < hoje e status === 'pendente'.

4. BADGE DE NOTIFICAÇÃO: Contagem de títulos vencidos na sidebar ao lado dos
   itens "Contas a Pagar" e "Contas a Receber".

5. LOADING STATES: Skeleton loaders nos cards do Dashboard enquanto dados carregam.

6. TEMA RESPONSIVO: O layout deve funcionar em telas de 1024px+. Em telas menores,
   sidebar colapsável com botão hamburger no Topbar.

════════════════════════════════════════════════════════════
ETAPA 17 — VERIFICAÇÃO FINAL
════════════════════════════════════════════════════════════

Após criar todos os arquivos:

1. Execute: npm run build
   Corrija TODOS os erros de TypeScript e build antes de prosseguir.

2. Execute: npm start
   Verifique que o app abre em http://localhost:3000 sem erros no console.

3. Teste os fluxos:
   ✓ Criar um lançamento de crédito à vista
   ✓ Criar um lançamento de débito parcelado em 6x (verificar se gerou 6 registros)
   ✓ Criar uma conta fixa mensal
   ✓ Dar baixa em um título em Contas a Pagar
   ✓ Verificar se o Dashboard atualiza os KPIs
   ✓ Exportar CSV na página Relatórios
   ✓ Cadastrar nova empresa
   ✓ Navegar pelo calendário em Agendamento

4. Execute: npm run build
   O build de produção deve ser concluído sem erros nem warnings críticos.

Se algum teste falhar, corrija o código correspondente e repita.

════════════════════════════════════════════════════════════
FIM DO PROMPT
════════════════════════════════════════════════════════════
```

---

## REQUISITOS DO AMBIENTE

| Requisito | Versão mínima |
|-----------|---------------|
| Node.js | 18.x |
| npm | 9.x |
| Claude Code | última versão |

## ESTRUTURA FINAL DO PROJETO

```
finance-control/
├── public/
├── src/
│   ├── components/
│   │   ├── layout/       ← Sidebar, Topbar, AppLayout
│   │   ├── shared/       ← KpiCard, Charts, LancamentoRow
│   │   └── ui/           ← Button, Input, Modal, Table, ...
│   ├── data/seed.ts      ← Dados de exemplo
│   ├── hooks/            ← Hooks customizados
│   ├── pages/            ← 8 páginas completas
│   ├── store/            ← Zustand (finance, empresa, categoria)
│   ├── types/index.ts    ← Todos os tipos TypeScript
│   ├── utils/            ← format, calculos, validators
│   ├── App.tsx
│   └── Router.tsx
├── tailwind.config.js
├── tsconfig.json
└── package.json
```

## TECNOLOGIAS UTILIZADAS

| Biblioteca | Finalidade |
|-----------|-----------|
| React 18 + TypeScript | Framework base |
| React Router DOM 6 | Roteamento SPA |
| Zustand 4 + persist | State management + localStorage |
| React Hook Form 7 | Formulários performáticos |
| Zod 3 | Validação com tipos |
| Recharts 2 | Gráficos (barras, rosca) |
| Tailwind CSS 3 | Estilização utility-first |
| Radix UI | Componentes acessíveis (Modal, Select, Toast...) |
| date-fns 3 | Manipulação de datas em pt-BR |
| react-dropzone | Upload de arquivos com drag & drop |
| lucide-react | Ícones SVG |
