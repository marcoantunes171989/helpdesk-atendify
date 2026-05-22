import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Users,
  TrendingUp,
  ShoppingBag,
  Eye,
  Receipt,
  AlertCircle,
  Filter,
  Target,
  UserPlus,
  ArrowRight,
  User
} from "lucide-react";
import { brl } from "@/lib/format";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useDebounce } from "@/hooks/use-debounce";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/crm")({
  component: CRMPage,
});

function CRMPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounce(searchTerm, 500);
  const [selectedVenda, setSelectedVenda] = useState<any>(null);
  
  const { data: crmData = [], isLoading: isLoadingCRM, error: crmError } = useQuery({
    queryKey: ["crm-analytics"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("view_crm_analytics")
        .select("*");
      if (error) throw error;
      return data;
    },
  });

  const { data: vendasConcluidas = [], isLoading: isLoadingVendas, error: vendasError } = useQuery({
    queryKey: ["vendas-concluidas-crm"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tab_vendas")
        .select("*, tab_clientes!fk_vendas_cliente(cli_nome), tab_itens_venda!fk_itens_venda(*, tab_produtos!fk_itens_produto(pro_descricao))")
        .eq("ven_status", "concluida")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const filteredClientes = useMemo(() => {
    return crmData.filter(c => 
      c.cli_nome?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      c.cli_cidade?.toLowerCase().includes(debouncedSearch.toLowerCase())
    ).sort((a, b) => (b.total_gasto || 0) - (a.total_gasto || 0));
  }, [crmData, debouncedSearch]);

  const totalFaturamento = useMemo(() => vendasConcluidas.reduce((acc, v) => acc + (Number(v.ven_valor_total) || 0), 0), [vendasConcluidas]);
  const totalVendasCount = useMemo(() => vendasConcluidas.length, [vendasConcluidas]);
  const ticketMedioGeral = useMemo(() => {
    return totalVendasCount > 0 ? totalFaturamento / totalVendasCount : 0;
  }, [totalFaturamento, totalVendasCount]);

  const maisVendidos = useMemo(() => {
    const produtosMap = new Map<string, { descricao: string; quantidade: number; valor: number }>();
    vendasConcluidas.forEach(venda => {
      venda.tab_itens_venda?.forEach((item: any) => {
        const desc = item.tab_produtos?.pro_descricao || "Desconhecido";
        const totalQtd = (produtosMap.get(desc)?.quantidade || 0) + (item.itv_quantidade || 0);
        const totalVal = (produtosMap.get(desc)?.valor || 0) + (Number(item.itv_valor_total) || 0);
        produtosMap.set(desc, { descricao: desc, quantidade: totalQtd, valor: totalVal });
      });
    });
    return Array.from(produtosMap.values()).sort((a, b) => b.quantidade - a.quantidade).slice(0, 5);
  }, [vendasConcluidas]);

  if (crmError || vendasError) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center space-y-4 min-h-[400px]">
        <AlertCircle className="w-12 h-12 text-red-500" />
        <h2 className="text-xl font-bold">Erro ao carregar dados</h2>
        <Button variant="outline" onClick={() => window.location.reload()}>Tentar novamente</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border shadow-sm">
        <PageHeader
          title="CRM Intelligence"
          description="Gestão de performance e análise de clientes."
        />
        <div className="flex gap-2">
          <Button variant="outline" className="rounded-2xl h-11 px-6 border-slate-200">
            <Filter className="w-4 h-4 mr-2" /> Filtros
          </Button>
          <Button className="rounded-2xl bg-slate-900 hover:bg-slate-800 h-11 px-6 shadow-lg shadow-slate-900/10 transition-all hover:scale-[1.02]">
            <UserPlus className="w-4 h-4 mr-2" /> Novo Lead
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: "Clientes Ativos", value: crmData.length, icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
          { title: "Faturamento", value: brl(totalFaturamento), icon: TrendingUp, color: "text-green-600", bg: "bg-green-50" },
          { title: "Ticket Médio", value: brl(ticketMedioGeral), icon: Target, color: "text-purple-600", bg: "bg-purple-50" },
          { title: "Vendas Concluídas", value: totalVendasCount, icon: ShoppingBag, color: "text-orange-600", bg: "bg-orange-50" },
        ].map((stat, i) => (
          <Card key={i} className="rounded-3xl border-none shadow-sm bg-white overflow-hidden p-6 hover:shadow-md transition-all group">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-2xl ${stat.bg} ${stat.color} group-hover:scale-110 transition-transform`}>
                <stat.icon className="h-5 w-5" />
              </div>
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{stat.title}</p>
                <p className="text-xl font-black text-slate-900">
                  {isLoadingCRM || isLoadingVendas ? <Skeleton className="h-7 w-20" /> : stat.value}
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="vendas" className="space-y-6">
        <div className="flex justify-center">
          <TabsList className="bg-slate-100 p-1 rounded-2xl h-12 w-full max-w-md">
            <TabsTrigger value="vendas" className="rounded-xl flex-1 font-bold uppercase text-[10px] tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-sm">Vendas</TabsTrigger>
            <TabsTrigger value="produtos" className="rounded-xl flex-1 font-bold uppercase text-[10px] tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-sm">Produtos</TabsTrigger>
            <TabsTrigger value="clientes" className="rounded-xl flex-1 font-bold uppercase text-[10px] tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-sm">Clientes</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="vendas">
          <Card className="rounded-3xl border-none shadow-sm overflow-hidden bg-white">
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow className="border-none hover:bg-transparent">
                  <TableHead className="font-bold text-slate-500 h-12 pl-6">CLIENTE</TableHead>
                  <TableHead className="font-bold text-slate-500 h-12">DATA</TableHead>
                  <TableHead className="text-right font-bold text-slate-500 h-12">VALOR</TableHead>
                  <TableHead className="text-right font-bold text-slate-500 h-12 pr-6">AÇÕES</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingVendas ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i} className="border-slate-50">
                      <TableCell colSpan={4}><Skeleton className="h-10 w-full rounded-xl" /></TableCell>
                    </TableRow>
                  ))
                ) : vendasConcluidas.slice(0, 10).map((venda: any) => (
                  <TableRow key={venda.id} className="hover:bg-slate-50/50 transition-colors border-slate-50 group">
                    <TableCell className="py-4 pl-6">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-slate-900 group-hover:text-white transition-all">
                          <User className="w-4 h-4" />
                        </div>
                        <span className="font-bold text-slate-700">{venda.tab_clientes?.cli_nome || "CONSUMIDOR"}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-500 font-medium">
                      {new Date(venda.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right font-black text-slate-900">
                      {brl(venda.ven_valor_total)}
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-9 w-9 rounded-xl text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-all"
                        onClick={() => setSelectedVenda(venda)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="produtos">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {maisVendidos.map((prod, i) => (
              <Card key={i} className="p-6 rounded-3xl border-none shadow-sm bg-white hover:shadow-md transition-all group">
                <div className="flex justify-between items-start mb-4">
                  <Badge variant="outline" className="border-slate-100 text-slate-400 font-bold rounded-lg">TOP {i + 1}</Badge>
                  <p className="font-black text-slate-900">{brl(prod.valor)}</p>
                </div>
                <h4 className="font-bold text-slate-800 mb-1 group-hover:text-slate-900">{prod.descricao}</h4>
                <p className="text-sm text-slate-400 font-medium">{prod.quantidade} unidades vendidas</p>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="clientes">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredClientes.slice(0, 9).map((c, i) => (
              <Card key={c.cliente_id} className="p-6 rounded-3xl border-none shadow-sm bg-white hover:shadow-md transition-all group">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-slate-900 group-hover:text-white transition-all">
                    <User className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-black text-slate-800 leading-none mb-1">{c.cli_nome}</h4>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{c.cli_cidade || "Cidade não informada"}</p>
                  </div>
                </div>
                <div className="flex justify-between items-end pt-4 border-t border-slate-50">
                  <div className="space-y-0.5">
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Total Gasto</p>
                    <p className="font-black text-slate-900">{brl(c.total_gasto || 0)}</p>
                  </div>
                  <Badge className="bg-slate-100 text-slate-600 border-none rounded-lg">{c.vendas_count} pedidos</Badge>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={!!selectedVenda} onOpenChange={() => setSelectedVenda(null)}>
        <DialogContent className="sm:max-w-[500px] p-0 rounded-[2rem] overflow-hidden border-none shadow-2xl">
          <DialogHeader className="p-8 pb-4">
            <div className="w-14 h-14 bg-slate-900 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-slate-900/20">
              <Receipt className="h-7 w-7 text-white" />
            </div>
            <DialogTitle className="text-2xl font-black text-slate-900">Detalhes da Venda</DialogTitle>
            <DialogDescription className="font-medium text-slate-500">
              Referência: #{selectedVenda?.id.split("-")[0].toUpperCase()}
            </DialogDescription>
          </DialogHeader>

          {selectedVenda && (
            <div className="p-8 pt-0 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-2xl">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Cliente</p>
                  <p className="font-bold text-slate-900 truncate">{selectedVenda.tab_clientes?.cli_nome || "CONSUMIDOR"}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-2xl">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Data</p>
                  <p className="font-bold text-slate-900">{new Date(selectedVenda.created_at).toLocaleDateString()}</p>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Itens</p>
                <ScrollArea className="max-h-[200px] rounded-2xl border border-slate-50 bg-slate-50/50 p-2">
                  <div className="space-y-1">
                    {selectedVenda.tab_itens_venda?.map((item: any) => (
                      <div key={item.id} className="p-3 bg-white rounded-xl flex justify-between items-center shadow-sm">
                        <div className="min-w-0 flex-1 mr-4">
                          <p className="font-bold text-xs text-slate-700 truncate uppercase">{item.tab_produtos?.pro_descricao}</p>
                          <p className="text-[10px] text-slate-400 font-medium">{item.itv_quantidade}x {brl(item.itv_valor_unitario)}</p>
                        </div>
                        <p className="font-black text-xs text-slate-900">{brl(item.itv_valor_total)}</p>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              <div className="p-6 bg-slate-900 rounded-3xl text-white flex justify-between items-center shadow-lg shadow-slate-900/20 transition-all hover:scale-[1.01]">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Valor Total</p>
                  <p className="text-3xl font-black">{brl(selectedVenda.ven_valor_total)}</p>
                </div>
                <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
                  <Receipt className="w-6 h-6 text-white" />
                </div>
              </div>

              <Button 
                variant="outline" 
                className="w-full h-12 rounded-2xl border-slate-200 font-bold"
                onClick={() => setSelectedVenda(null)}
              >
                Fechar Detalhes
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
