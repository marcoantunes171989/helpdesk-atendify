import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import { brl, dateBR } from "@/lib/format";
import { cn } from "@/lib/utils";
import { COMPANY_NAME } from "@/lib/constants";
import { 
  Plus, 
  Search, 
  MoreVertical,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Filter,
  X,
  Calendar,
  Package,
  User,
  Barcode,
  ShoppingBag,
  Info,
  Clock,
  Receipt,
  HandCoins
} from "lucide-react";
import { EmptyState, ErrorState } from "@/components/States";
import { Separator } from "@/components/ui/separator";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { HighlightedText } from "@/components/HighlightedText";
import {
  Collapsible,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Posse, Cliente, Produto } from "@/lib/types";
import { toast } from "sonner";
import { useDebounce } from "@/hooks/use-debounce";
import { Skeleton } from "@/components/ui/skeleton";
import { z } from "zod";

const sacoleiraSearchSchema = z.object({
  q: z.string().optional().default(""),
  status: z.string().optional().default("all"),
  from: z.string().optional().default(""),
  to: z.string().optional().default(""),
  page: z.number().optional().default(0),
});

type SacoleiraSearch = z.infer<typeof sacoleiraSearchSchema>;

export const Route = createFileRoute("/sacoleira")({
  validateSearch: (search) => sacoleiraSearchSchema.parse(search),
  head: () => ({
    meta: [
      { title: `Consignação — ${COMPANY_NAME}` },
      { name: "description", content: "Controle refinado de peças em posse das sacoleiras." },
    ],
  }),
  component: SacoleiraPage,
});

function SacoleiraPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate({ from: Route.fullPath });
  const searchParams = useSearch({ from: Route.fullPath });
  
  const [search, setSearch] = useState(searchParams.q || "");
  const debouncedSearch = useDebounce(search, 500);
  
  const [statusFilter, setStatusFilter] = useState<string>(searchParams.status || "all");
  const [startDate, setStartDate] = useState(searchParams.from || "");
  const [endDate, setEndDate] = useState(searchParams.to || "");
  const [showAdvanced, setShowAdvanced] = useState(!!(searchParams.from || searchParams.to));
  const [page, setPage] = useState(searchParams.page || 0);
  const pageSize = 15;

  // Sincronizar URL com estado local
  useEffect(() => {
    // Evitar navegação infinita se os valores já forem iguais
    if (
      searchParams.q === (search || "") &&
      searchParams.status === statusFilter &&
      searchParams.from === (startDate || "") &&
      searchParams.to === (endDate || "") &&
      searchParams.page === page
    ) return;

    navigate({
      search: {
        q: search || "",
        status: statusFilter,
        from: startDate || "",
        to: endDate || "",
        page: page,
      },
      replace: true,
    });
  }, [search, statusFilter, startDate, endDate, page, navigate, searchParams]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [detailsDialog, setDetailsDialog] = useState<{
    isOpen: boolean;
    item: any | null;
  }>({
    isOpen: false,
    item: null
  });
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    item: any | null;
    action: 'vendido' | 'devolvido' | null;
  }>({
    isOpen: false,
    item: null,
    action: null
  });
  
  const [newPosse, setNewPosse] = useState({
    cliente_id: "",
    produto_id: "",
    quantidade: 1,
    data_saida: new Date().toISOString().split('T')[0],
  });

  const { data: { data: items = [], count = 0 } = {}, isLoading, isFetching, error } = useQuery({
    queryKey: ["posses", debouncedSearch, statusFilter, startDate, endDate, page],
    queryFn: async ({ signal }) => {
      let query = supabase
        .from("tab_consignacao")
        .select(`
          *,
          tab_clientes (cli_nome),
          tab_produtos (pro_descricao, pro_codigo, pro_valor_venda),
          tab_vendas (ven_valor_total, ven_forma_pagamento, created_at, ven_desconto, id)
        `, { count: "exact" });

      if (debouncedSearch) {
        // query = query.or(`con_status.ilike.%${debouncedSearch}%`);
        // O Supabase postgrest não suporta buscas or em campos de join facilmente sem views.
        // Removido temporariamente para garantir o carregamento da tela.
      }

      if (statusFilter !== "all") {
        query = query.eq("con_status", statusFilter as "em_posse" | "vendido" | "devolvido");
      }

      if (startDate) {
        query = query.gte("con_data_saida", startDate);
      }

      if (endDate) {
        query = query.lte("con_data_saida", endDate);
      }

      const { data, error, count } = await query
        .order("con_data_saida", { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (error) throw error;

      const formattedData = data.map((item: any) => ({
        id: item.id,
        cliente_id: item.con_cliente_id,
        cliente_nome: item.tab_clientes?.cli_nome,
        produto_id: item.con_produto_id,
        produto_descricao: item.tab_produtos?.pro_descricao,
        produto_codigo: item.tab_produtos?.pro_codigo,
        produto_valor_venda: item.tab_produtos?.pro_valor_venda,
        quantidade: item.con_quantidade,
        data_saida: item.con_data_saida,
        status: item.con_status,
        venda: item.tab_vendas,
        updated_at: item.updated_at
      }));

      return { data: formattedData, count: count || 0 };
    },
  });

  const { data: clientes = [] } = useQuery({
    queryKey: ["clientes-sacoleira"],
    queryFn: async () => {
      const { data, error } = await supabase.from("tab_clientes").select("*").order("cli_nome");
      if (error) throw error;
      return data as Cliente[];
    },
  });

  const { data: produtos = [] } = useQuery({
    queryKey: ["produtos-sacoleira"],
    queryFn: async () => {
      const { data, error } = await supabase.from("tab_produtos").select("*").order("pro_descricao");
      if (error) throw error;
      return data as Produto[];
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "em_posse" | "vendido" | "devolvido" }) => {
      const { error } = await supabase
        .from("tab_consignacao")
        .update({ con_status: status })
        .eq("id", id);
      if (error) throw error;
      toast.success(`Consignação marcada como ${status === 'vendido' ? 'vendida' : 'devolvida'}`);
    },
    onSuccess: () => {
      // Invalida ambos os queries para garantir atualização total da lista e contadores
      queryClient.invalidateQueries({ queryKey: ["posses"] });
      queryClient.invalidateQueries({ queryKey: ["posses-counters"] });
      setConfirmDialog({ isOpen: false, item: null, action: null });
    },
  });

  const createPosseMutation = useMutation({
    mutationFn: async (posse: any) => {
      const { error } = await supabase
        .from("tab_consignacao")
        .insert([{
          con_cliente_id: posse.cliente_id,
          con_produto_id: posse.produto_id,
          con_quantidade: posse.quantidade,
          con_data_saida: posse.data_saida,
          con_status: 'em_posse'
        }]);
      if (error) throw error;
      toast.success("Consignação registrada com sucesso");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posses"] });
      setIsDialogOpen(false);
    }
  });

  const { data: counters = { em_posse: 0, vendido: 0, devolvido: 0 } } = useQuery({
    queryKey: ["posses-counters"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tab_consignacao")
        .select("con_status");
      
      if (error) throw error;
      
      return data.reduce((acc: any, curr: any) => {
        acc[curr.con_status] = (acc[curr.con_status] || 0) + 1;
        return acc;
      }, { em_posse: 0, vendido: 0, devolvido: 0 });
    }
  });

  const filteredItems = items;

  const handleCreatePosse = () => {
    if (!newPosse.cliente_id || !newPosse.produto_id || !newPosse.quantidade) {
      toast.error("Preencha todos os campos.");
      return;
    }
    
    const produto = produtos.find(p => p.id === newPosse.produto_id);
    if (produto && (produto.pro_estoque_atual || 0) < newPosse.quantidade) {
      toast.error(`Estoque insuficiente. Disponível: ${produto.pro_estoque_atual || 0}`);
      return;
    }

    createPosseMutation.mutate(newPosse);
  };

  return (
    <div className="space-y-8 pb-12 animate-in fade-in duration-700">
      {/* Header Section */}
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest">
            <HandCoins className="h-3 w-3 fill-current" /> Gestão de Estoque Externo
          </div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight text-slate-900 leading-none">
            Fluxo de <span className="text-primary italic">Consignação</span>
          </h1>
          <p className="text-muted-foreground text-sm font-medium">
            <span className="text-primary font-bold">Dica:</span> Controle as peças em posse das sacoleiras com precisão.
          </p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="h-11 px-6 rounded-2xl shadow-xl shadow-primary/20 bg-primary hover:scale-[1.02] active:scale-[0.98] transition-all font-black uppercase tracking-widest text-[10px]">
              <Plus className="mr-2 h-4 w-4" /> Novo Lançamento
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px] rounded-[2.5rem] p-0 overflow-hidden border-none shadow-2xl">
            <div className="bg-slate-900 text-white p-8 relative shrink-0">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full -mr-16 -mt-16 blur-3xl" />
              <DialogHeader>
                <div className="flex items-center gap-4 relative z-10">
                  <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center">
                    <HandCoins className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <DialogTitle className="text-xl font-black uppercase tracking-tight text-white leading-none mb-1">
                      Novo Lançamento
                    </DialogTitle>
                    <DialogDescription className="text-white/40 text-[10px] font-bold uppercase tracking-widest">
                      Registre a saída de peças
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>
            </div>
            
            <div className="p-8 space-y-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Cliente / Sacoleira</Label>
                  <Select onValueChange={(v) => setNewPosse({...newPosse, cliente_id: v})} value={newPosse.cliente_id}>
                    <SelectTrigger className="h-12 rounded-2xl bg-slate-50 border-none px-6 focus:ring-2 focus:ring-primary/20 font-bold text-slate-900">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl border-none shadow-2xl">
                      {clientes.map(c => (
                        <SelectItem key={c.id} value={c.id} className="rounded-xl font-bold py-3">{c.cli_nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Produto</Label>
                  <Select onValueChange={(v) => setNewPosse({...newPosse, produto_id: v})} value={newPosse.produto_id}>
                    <SelectTrigger className="h-12 rounded-2xl bg-slate-50 border-none px-6 focus:ring-2 focus:ring-primary/20 font-bold text-slate-900">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl border-none shadow-2xl max-h-[300px]">
                      {produtos.map(p => (
                        <SelectItem key={p.id} value={p.id} className="rounded-xl font-bold py-3">
                          {p.pro_descricao} {p.pro_codigo ? `(${p.pro_codigo})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Quantidade</Label>
                    <Input 
                      type="number" 
                      min="1" 
                      value={newPosse.quantidade} 
                      onChange={e => setNewPosse({...newPosse, quantidade: parseInt(e.target.value) || 1})}
                      className="h-12 rounded-2xl bg-slate-50 border-none px-6 focus:ring-2 focus:ring-primary/20 font-bold text-slate-900" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Data Saída</Label>
                    <Input 
                      type="date" 
                      value={newPosse.data_saida} 
                      onChange={e => setNewPosse({...newPosse, data_saida: e.target.value})}
                      className="h-12 rounded-2xl bg-slate-50 border-none px-6 focus:ring-2 focus:ring-primary/20 font-bold text-slate-900" 
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 bg-slate-50 border-t shrink-0">
              <Button 
                onClick={handleCreatePosse} 
                disabled={createPosseMutation.isPending} 
                className="w-full h-12 rounded-2xl bg-slate-900 text-white font-black uppercase tracking-widest text-xs shadow-xl shadow-slate-900/20 active:scale-95 transition-all"
              >
                {createPosseMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirmar Saída"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Indicadores de Status Section - Corrected */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="rounded-3xl border-none shadow-sm bg-amber-50/50 backdrop-blur-sm p-6 flex items-center gap-4 group hover:shadow-md transition-all">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
            <Clock className="h-7 w-7 text-amber-500" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-amber-600 leading-none mb-1.5">Em Posse</p>
            <p className="text-3xl font-black text-slate-900 leading-none">{counters.em_posse}</p>
          </div>
        </Card>
        
        <Card className="rounded-3xl border-none shadow-sm bg-emerald-50/50 backdrop-blur-sm p-6 flex items-center gap-4 group hover:shadow-md transition-all">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
            <CheckCircle2 className="h-7 w-7 text-emerald-500" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 leading-none mb-1.5">Vendidos</p>
            <p className="text-3xl font-black text-slate-900 leading-none">{counters.vendido}</p>
          </div>
        </Card>

        <Card className="rounded-3xl border-none shadow-sm bg-slate-50/50 backdrop-blur-sm p-6 flex items-center gap-4 group hover:shadow-md transition-all">
          <div className="w-14 h-14 rounded-2xl bg-slate-500/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
            <X className="h-7 w-7 text-slate-500" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-600 leading-none mb-1.5">Devolvidos</p>
            <p className="text-3xl font-black text-slate-900 leading-none">{counters.devolvido}</p>
          </div>
        </Card>
      </div>

      <div className="flex flex-col gap-4 bg-white/50 backdrop-blur-md p-6 rounded-[2rem] border border-border/40 shadow-xl">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-primary transition-colors" />
            <Input 
              placeholder="Buscar por cliente, produto ou código..." 
              className="pl-12 h-14 bg-white/80 border-none shadow-sm rounded-2xl text-base font-medium placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-primary/20" 
              value={search} 
              onChange={e => { setSearch(e.target.value); setPage(0); }} 
            />
            {isFetching && !isLoading && (
              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <div className="flex bg-white/80 p-1 rounded-2xl shadow-sm border border-border/20 min-w-max">
              <Button
                variant={statusFilter === 'all' ? 'default' : 'ghost'}
                size="sm"
                className={cn("h-11 rounded-xl px-4 text-[10px] font-black uppercase tracking-widest gap-2", statusFilter === 'all' ? "bg-slate-900 text-white shadow-md" : "text-slate-500")}
                onClick={() => { setStatusFilter("all"); setPage(0); }}
              >
                Todos <Badge variant="secondary" className="h-5 px-1.5 text-[9px] bg-slate-100">{count}</Badge>
              </Button>
              <Button
                variant={statusFilter === 'em_posse' ? 'default' : 'ghost'}
                size="sm"
                className={cn("h-11 rounded-xl px-4 text-[10px] font-black uppercase tracking-widest gap-2", statusFilter === 'em_posse' ? "bg-amber-500 text-white shadow-md" : "text-amber-600")}
                onClick={() => { setStatusFilter("em_posse"); setPage(0); }}
              >
                Em Posse
              </Button>
              <Button
                variant={statusFilter === 'vendido' ? 'default' : 'ghost'}
                size="sm"
                className={cn("h-11 rounded-xl px-4 text-[10px] font-black uppercase tracking-widest gap-2", statusFilter === 'vendido' ? "bg-emerald-600 text-white shadow-md" : "text-emerald-600")}
                onClick={() => { setStatusFilter("vendido"); setPage(0); }}
              >
                Vendido
              </Button>
              <Button
                variant={statusFilter === 'devolvido' ? 'default' : 'ghost'}
                size="sm"
                className={cn("h-11 rounded-xl px-4 text-[10px] font-black uppercase tracking-widest gap-2", statusFilter === 'devolvido' ? "bg-slate-600 text-white shadow-md" : "text-slate-600")}
                onClick={() => { setStatusFilter("devolvido"); setPage(0); }}
              >
                Devolvido
              </Button>
            </div>
            <Button 
              variant={showAdvanced ? "default" : "outline"} 
              size="icon" 
              className={cn("h-14 w-14 shrink-0 rounded-2xl border-none shadow-sm transition-all", showAdvanced ? "bg-primary text-primary-foreground" : "bg-white/80 text-slate-400")}
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              <Filter className="h-5 w-5" />
            </Button>
        </div>

        <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
          <CollapsibleContent className="pt-2 animate-in slide-in-from-top-2 duration-300">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/20 rounded-xl border border-border/20">
              <div className="space-y-2">
                <Label className="text-xs uppercase font-bold text-muted-foreground flex items-center gap-2">
                  <Calendar className="h-3 w-3" /> De (Data Saída)
                </Label>
                <Input 
                  type="date" 
                  value={startDate} 
                  onChange={e => { setStartDate(e.target.value); setPage(0); }}
                  className="h-9 bg-background/50 text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase font-bold text-muted-foreground flex items-center gap-2">
                  <Calendar className="h-3 w-3" /> Até (Data Saída)
                </Label>
                <Input 
                  type="date" 
                  value={endDate} 
                  onChange={e => { setEndDate(e.target.value); setPage(0); }}
                  className="h-9 bg-background/50 text-sm"
                />
              </div>
            </div>
            {(startDate || endDate) && (
              <div className="flex justify-end mt-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-xs gap-1 hover:text-destructive"
                  onClick={() => {
                    setStartDate("");
                    setEndDate("");
                    setPage(0);
                  }}
                >
                  <X className="h-3 w-3" /> Limpar Período
                </Button>
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>
      </div>

      <div className="overflow-hidden rounded-3xl border border-border/40 shadow-xl bg-card/50 backdrop-blur-sm">
        <div className="md:hidden space-y-4 p-4">
          {error ? (
            <ErrorState 
              title="Erro na Sacoleira"
              description="Ocorreu um problema ao carregar os itens consignados. Tente atualizar a página."
              onRetry={() => queryClient.invalidateQueries({ queryKey: ["posses"] })} 
            />
          ) : isLoading ? (
            [...Array(5)].map((_, i) => (
              <div key={i} className="h-40 w-full bg-muted/20 animate-pulse rounded-2xl" />
            ))
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 space-y-4 text-center">
              <div className="bg-muted/30 p-8 rounded-full">
                <Search className="h-12 w-12 text-muted-foreground/30" />
              </div>
              <div className="space-y-2">
                <p className="text-lg font-bold text-foreground">Nenhum registro encontrado</p>
                <p className="text-sm text-muted-foreground px-6">Tente ajustar seus filtros ou busca para encontrar o que precisa.</p>
              </div>
            </div>
          ) : (
            filteredItems.map((item: any) => (
              <Card 
                key={item.id} 
                className={cn(
                  "p-0 rounded-2xl border-border/40 shadow-md bg-card hover:shadow-lg transition-all active:scale-[0.98] overflow-hidden",
                  updateStatusMutation.isPending && updateStatusMutation.variables?.id === item.id && "opacity-60 pointer-events-none"
                )}
              >
                {/* Cabeçalho do Card - Mobile Optimized */}
                <div className="p-4 flex items-center justify-between border-b border-border/5 bg-muted/10">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                      {item.cliente_nome?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-foreground line-clamp-1">{item.cliente_nome}</h4>
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span className="text-[10px] font-medium">{dateBR(item.data_saida || "")}</span>
                      </div>
                    </div>
                  </div>
                  <Badge 
                    variant={item.status === 'em_posse' ? 'outline' : item.status === 'vendido' ? 'default' : 'secondary'}
                    className={cn(
                      "font-black text-[9px] uppercase tracking-tighter px-2 py-0.5 rounded-full border-none shadow-sm",
                      item.status === 'em_posse' && "bg-amber-100 text-amber-700",
                      item.status === 'vendido' && "bg-emerald-100 text-emerald-700",
                      item.status === 'devolvido' && "bg-slate-100 text-slate-600"
                    )}
                  >
                    {item.status === 'em_posse' ? 'Em posse' : item.status === 'vendido' ? 'Vendido' : 'Devolvido'}
                  </Badge>
                </div>

                {/* Conteúdo do Produto - Mobile Optimized */}
                <div className="p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-foreground leading-tight">{item.produto_descricao}</p>
                      <p className="text-[10px] font-mono text-muted-foreground uppercase">{item.produto_codigo || "—"}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Qtd</p>
                      <p className="text-sm font-black text-primary">{item.quantidade} <span className="text-[10px] font-medium">un</span></p>
                    </div>
                  </div>

                  {item.produto_valor_venda && (
                    <div className="flex justify-between items-center py-2 px-3 bg-muted/30 rounded-xl border border-border/10">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase">Valor Estimado</span>
                      <span className="text-sm font-bold text-emerald-600">{brl(item.produto_valor_venda * item.quantidade)}</span>
                    </div>
                  )}
                </div>

                {/* Ações do Card - Mobile Optimized */}
                <div className="p-3 bg-muted/5 flex items-center gap-2 border-t border-border/5">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-10 rounded-xl text-xs font-bold border-border/40 flex-1 bg-background shadow-sm"
                    onClick={() => setDetailsDialog({ isOpen: true, item })}
                  >
                    <Info className="h-3.5 w-3.5 mr-2" /> Detalhes
                  </Button>
                  
                  {item.status === 'em_posse' ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="default" size="sm" className="h-10 rounded-xl text-xs font-bold shadow-md shadow-primary/20 flex-1">
                          Gerenciar <MoreVertical className="h-3.5 w-3.5 ml-2" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="rounded-2xl w-[220px] p-2">
                        <DropdownMenuItem 
                          onClick={() => setConfirmDialog({ isOpen: true, item, action: 'vendido' })}
                          className="text-emerald-600 focus:text-emerald-600 focus:bg-emerald-50 gap-2 font-bold py-3 rounded-xl"
                        >
                          <CheckCircle2 className="h-4 w-4" /> Confirmar Venda
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => setConfirmDialog({ isOpen: true, item, action: 'devolvido' })}
                          className="text-slate-600 focus:bg-slate-50 gap-2 font-bold py-3 rounded-xl"
                        >
                          <X className="h-4 w-4" /> Registrar Devolução
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-10 rounded-xl text-xs font-bold flex-1 opacity-50 cursor-not-allowed"
                      disabled
                    >
                      Concluído
                    </Button>
                  )}
                </div>
              </Card>
            ))
          )}
        </div>

        <Table className="hidden md:table">
          <TableHeader>
            <TableRow className="hover:bg-transparent border-border/50">
              <TableHead className="py-4">Cliente</TableHead>
              <TableHead className="py-4">Produto</TableHead>
              <TableHead className="py-4">Qtd</TableHead>
              <TableHead className="py-4">Data</TableHead>
              <TableHead className="py-4">Status</TableHead>
              <TableHead className="text-right py-4">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {error ? (
              <TableRow>
                <TableCell colSpan={6} className="py-8">
                  <ErrorState 
                    title="Erro na Sacoleira"
                    description="Ocorreu um problema ao carregar os itens consignados. Tente atualizar a página."
                    onRetry={() => queryClient.invalidateQueries({ queryKey: ["posses"] })} 
                  />
                </TableCell>
              </TableRow>
            ) : isLoading ? (
              [...Array(pageSize)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={6} className="py-4">
                    <Skeleton className="h-10 w-full rounded-lg" />
                  </TableCell>
                </TableRow>
              ))
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-80 text-center">
                  <div className="flex flex-col items-center justify-center max-w-[400px] mx-auto space-y-4">
                    <div className="bg-muted/30 p-6 rounded-full">
                      <Search className="h-10 w-10 text-muted-foreground/40" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-base font-bold text-foreground">Nenhum resultado para os filtros</p>
                      <p className="text-sm text-muted-foreground px-4">
                        Ajuste sua busca ou limpe os filtros de status e período para ver outros registros.
                      </p>
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredItems.map((item: any) => {
              const clienteNome = item.cliente_nome || "—";
              const produtoDesc = item.produto_descricao || "—";
              return (
                <TableRow 
                  key={item.id} 
                  className={cn(
                    "border-border/30 hover:bg-primary/5 transition-colors group",
                    updateStatusMutation.isPending && updateStatusMutation.variables?.id === item.id && "opacity-60 pointer-events-none bg-primary/5"
                  )}
                >
                  <TableCell className="font-semibold py-4">
                    {clienteNome}
                  </TableCell>
                  <TableCell className="py-4">
                    <div className="flex flex-col gap-1">
                      <span className="font-medium">{produtoDesc}</span>
                      <span className="text-[10px] font-mono text-muted-foreground uppercase">
                        {item.produto_codigo || "—"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="py-4">
                    <Badge variant="secondary" className="bg-primary/5 text-primary border-primary/10">
                      {item.quantidade} un
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground py-4 text-sm">{dateBR(item.data_saida || "")}</TableCell>
                  <TableCell className="py-4">
                    <Badge 
                      variant={item.status === 'em_posse' ? 'outline' : item.status === 'vendido' ? 'default' : 'secondary'}
                      className={cn(
                        "font-bold text-[10px] uppercase tracking-wide px-2.5 py-1 rounded-md border-none shadow-sm flex items-center gap-1.5",
                        item.status === 'em_posse' && "bg-amber-100 text-amber-700 hover:bg-amber-200",
                        item.status === 'vendido' && "bg-emerald-100 text-emerald-700 hover:bg-emerald-200",
                        item.status === 'devolvido' && "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      )}
                    >
                      <div className={cn(
                        "h-1.5 w-1.5 rounded-full",
                        item.status === 'em_posse' && "bg-amber-500 animate-pulse",
                        item.status === 'vendido' && "bg-emerald-500",
                        item.status === 'devolvido' && "bg-slate-400"
                      )} />
                      {item.status === 'em_posse' ? 'Em posse' : item.status === 'vendido' ? 'Vendido' : 'Devolvido'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right py-4">
                    {item.status === 'em_posse' ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                            disabled={updateStatusMutation.isPending}
                          >
                            {updateStatusMutation.isPending && updateStatusMutation.variables?.id === item.id ? (
                              <Loader2 className="h-4 w-4 animate-spin text-primary" />
                            ) : (
                              <MoreVertical className="h-4 w-4" />
                            )}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="rounded-xl">
                          <DropdownMenuItem 
                            onClick={() => setConfirmDialog({ isOpen: true, item, action: 'vendido' })}
                            className="text-success focus:text-success gap-2"
                          >
                            <CheckCircle2 className="h-4 w-4" /> Confirmar Venda
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => setConfirmDialog({ isOpen: true, item, action: 'devolvido' })}
                            className="text-muted-foreground gap-2"
                          >
                            <X className="h-4 w-4" /> Registrar Devolução
                          </DropdownMenuItem>
                          <Separator className="my-1" />
                          <DropdownMenuItem 
                            onClick={() => setDetailsDialog({ isOpen: true, item })}
                            className="gap-2"
                          >
                            <Info className="h-4 w-4" /> Ver Detalhes
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : (
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => setDetailsDialog({ isOpen: true, item })}
                      >
                        <Info className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
        <div className="p-4 bg-muted/5 border-t flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground order-2 sm:order-1 font-medium">
            Total de registros: <span className="font-bold text-foreground">{count}</span>
          </p>
          <div className="flex items-center gap-4 order-1 sm:order-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="rounded-xl px-4 h-9"
              disabled={page === 0 || isLoading}
              onClick={() => setPage((p: number) => p - 1)}
            >
              Anterior
            </Button>
            <div className="flex items-center gap-2 bg-background/50 px-3 py-1 rounded-lg border border-border/40">
              <span className="text-xs font-bold text-muted-foreground">Pág.</span>
              <span className="text-sm font-black text-primary">{page + 1}</span>
              <span className="text-xs text-muted-foreground">/ {Math.max(1, Math.ceil(count / pageSize))}</span>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              className="rounded-xl px-4 h-9"
              disabled={(page + 1) * pageSize >= count || isLoading}
              onClick={() => setPage((p: number) => p + 1)}
            >
              Próxima
            </Button>
          </div>
        </div>
      </div>
      <Dialog open={confirmDialog.isOpen} onOpenChange={(open) => !open && setConfirmDialog({ ...confirmDialog, isOpen: false })}>
        <DialogContent className="sm:max-w-[400px] rounded-3xl border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              {confirmDialog.action === 'vendido' ? (
                <><ShoppingBag className="h-5 w-5 text-success" /> Confirmar Venda</>
              ) : (
                <><X className="h-5 w-5 text-muted-foreground" /> Confirmar Devolução</>
              )}
            </DialogTitle>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            <p className="text-sm text-muted-foreground">
              Você está prestes a {confirmDialog.action === 'vendido' ? 'converter em venda' : 'marcar como devolvido'} o seguinte item em consignação:
            </p>
            
            <div className="bg-muted/30 p-4 rounded-2xl border border-border/20 space-y-3">
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Cliente / Sacoleira</span>
                <span className="font-semibold text-sm">{confirmDialog.item?.cliente_nome}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Produto</span>
                <span className="font-semibold text-sm">{confirmDialog.item?.produto_descricao}</span>
                <span className="text-[10px] font-mono text-muted-foreground">{confirmDialog.item?.produto_codigo}</span>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Quantidade</span>
                  <Badge variant="secondary" className="w-fit">{confirmDialog.item?.quantidade} unidades</Badge>
                </div>
                {confirmDialog.action === 'vendido' && confirmDialog.item?.produto_valor_venda && (
                  <div className="flex flex-col gap-0.5 text-right">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Valor Total</span>
                    <span className="font-black text-primary text-lg">{brl(confirmDialog.item.produto_valor_venda * confirmDialog.item.quantidade)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="bg-muted/10 p-4 -mx-6 -mb-6 rounded-b-3xl flex flex-row gap-3">
            <Button 
              variant="ghost" 
              className="flex-1 h-12 rounded-xl font-bold"
              onClick={() => setConfirmDialog({ isOpen: false, item: null, action: null })}
              disabled={updateStatusMutation.isPending}
            >
              Cancelar
            </Button>
            <Button 
              className={cn(
                "flex-[1.5] h-12 rounded-xl font-bold shadow-lg",
                confirmDialog.action === 'vendido' ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200" : "bg-primary shadow-primary/20"
              )}
              onClick={() => {
                if (!confirmDialog.item || !confirmDialog.action) return;
                
                if (confirmDialog.action === 'vendido') {
                  navigate({ to: "/vendas", search: { consignacao_id: confirmDialog.item.id } as any });
                  setConfirmDialog({ isOpen: false, item: null, action: null });
                } else {
                  updateStatusMutation.mutate({ id: confirmDialog.item.id, status: 'devolvido' });
                }
              }}
              disabled={updateStatusMutation.isPending}
            >
              {updateStatusMutation.isPending ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : confirmDialog.action === 'vendido' ? (
                "Ir para Pagamento"
              ) : (
                "Confirmar Devolução"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={detailsDialog.isOpen} onOpenChange={(open) => !open && setDetailsDialog({ ...detailsDialog, isOpen: false })}>
        <DialogContent className="sm:max-w-[500px] rounded-3xl border-none shadow-2xl overflow-hidden p-0">
          <div className="bg-primary/5 p-6 border-b">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                <Info className="h-5 w-5 text-primary" /> Detalhes da Consignação
              </DialogTitle>
            </DialogHeader>
          </div>
          
          <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Cliente</span>
                <p className="font-semibold text-sm">{detailsDialog.item?.cliente_nome}</p>
              </div>
              <div className="space-y-1 text-right">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Status Atual</span>
                <div>
                  <Badge 
                    variant="outline"
                    className={cn(
                      "font-bold text-[9px] uppercase h-5 px-2",
                      detailsDialog.item?.status === 'em_posse' && "bg-amber-100 text-amber-700 border-none",
                      detailsDialog.item?.status === 'vendido' && "bg-emerald-100 text-emerald-700 border-none",
                      detailsDialog.item?.status === 'devolvido' && "bg-slate-100 text-slate-600 border-none"
                    )}
                  >
                    {detailsDialog.item?.status === 'em_posse' ? 'Em posse' : detailsDialog.item?.status === 'vendido' ? 'Vendido' : 'Devolvido'}
                  </Badge>
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <Package className="h-3 w-3" /> Produto & Quantidade
              </span>
              <div className="bg-muted/30 p-4 rounded-2xl border border-border/20">
                <p className="font-bold text-sm">{detailsDialog.item?.produto_descricao}</p>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-xs font-mono text-muted-foreground">{detailsDialog.item?.produto_codigo}</span>
                  <Badge variant="secondary" className="font-black">{detailsDialog.item?.quantidade} UN</Badge>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <Clock className="h-3 w-3" /> Histórico de Ações
              </span>
              <div className="space-y-4 relative before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-muted">
                <div className="relative pl-7 space-y-1">
                  <div className="absolute left-0 top-1 w-4 h-4 rounded-full bg-primary border-4 border-white shadow-sm" />
                  <div className="flex justify-between">
                    <span className="text-[11px] font-bold">Registro Inicial</span>
                    <span className="text-[10px] text-muted-foreground">{dateBR(detailsDialog.item?.data_saida || "")}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">O item foi entregue em consignação.</p>
                </div>

                {detailsDialog.item?.status !== 'em_posse' && (
                  <div className="relative pl-7 space-y-1">
                    <div className="absolute left-0 top-1 w-4 h-4 rounded-full bg-emerald-500 border-4 border-white shadow-sm" />
                    <div className="flex justify-between">
                      <span className="text-[11px] font-bold">
                        {detailsDialog.item?.status === 'vendido' ? 'Venda Confirmada' : 'Devolução Registrada'}
                      </span>
                      <span className="text-[10px] text-muted-foreground">{dateBR(detailsDialog.item?.updated_at || detailsDialog.item?.data_saida)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Ação executada via sistema para finalizar a consignação.
                    </p>
                  </div>
                )}
              </div>
            {detailsDialog.item?.status === 'vendido' && detailsDialog.item?.venda && (
              <div className="space-y-3">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <Receipt className="h-3 w-3" /> Detalhes do Pagamento
                </span>
                <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] font-bold text-emerald-800">Valor Pago</span>
                    <span className="text-sm font-black text-emerald-900">{brl(detailsDialog.item.venda.ven_valor_total)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] font-bold text-emerald-800">Forma de Pagamento</span>
                    <span className="text-[10px] font-black uppercase text-emerald-900 tracking-wider bg-emerald-200/50 px-2 py-0.5 rounded-lg">
                      {detailsDialog.item.venda.ven_forma_pagamento}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-emerald-200">
                    <span className="text-[10px] font-bold text-emerald-700">Data da Venda</span>
                    <span className="text-[10px] font-mono text-emerald-800">
                      {new Date(detailsDialog.item.venda.created_at).toLocaleString('pt-BR')}
                    </span>
                  </div>
                  {detailsDialog.item.venda.id && (
                    <div className="text-[9px] text-emerald-600/60 font-mono text-center pt-1">
                      Ref: {detailsDialog.item.venda.id.split('-')[0]}...
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          </div>

          <DialogFooter className="bg-muted/10 p-4 rounded-b-3xl">
            <Button 
              className="w-full h-11 rounded-xl font-bold" 
              variant="outline"
              onClick={() => setDetailsDialog({ isOpen: false, item: null })}
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </div>
  );
}
