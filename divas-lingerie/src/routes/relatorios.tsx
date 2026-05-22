import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { brl, dateBR } from "@/lib/format";
import { COMPANY_NAME } from "@/lib/constants";
import { SafejsPDF } from "@/lib/pdf-utils";
import "jspdf-autotable";
import { 
  BarChart3, 
  Calendar, 
  Download, 
  Filter,
  TrendingUp,
  DollarSign,
  Package,
  History,
  Loader2,
  Table as TableIcon,
  Search,
  ChevronDown,
  ChevronUp,
  CreditCard,
  Banknote,
  QrCode,
  PieChart,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react";
import { ChartSkeleton } from "@/components/ChartSkeleton";
import { EmptyState, ErrorState } from "@/components/States";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ChartTooltip,
  Legend,
  LineChart,
  Line,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

import { cn } from "@/lib/utils";

export const Route = createFileRoute("/relatorios")({
  head: () => ({
    meta: [
      { title: `Relatórios — ${COMPANY_NAME}` },
      { name: "description", content: "Análise detalhada de vendas e lucratividade." },
    ],
  }),
  component: RelatoriosPage,
});

function RelatoriosPage() {
  const queryClient = useQueryClient();
  const [periodo, setPeriodo] = useState("7d");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"graficos" | "vendas">("graficos");
  const [expandedVenda, setExpandedVenda] = useState<string | null>(null);
  const [buscaVenda, setBuscaVenda] = useState("");
  const [page, setPage] = useState(0);
  const [allVendas, setAllVendas] = useState<any[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const pageSize = 10;

  const { data: resumoVendas = [], isLoading: loadingResumo, error: errorResumo } = useQuery({
    queryKey: ["relatorio-vendas-resumo", periodo, startDate, endDate],
    queryFn: async ({ signal }) => {
      let query = supabase.from("view_resumo_vendas_diario").select("*");
      
      if (periodo === "7d") {
        const last7 = new Date();
        last7.setDate(last7.getDate() - 7);
        query = query.gte("data_referencia", last7.toISOString().split('T')[0]);
      } else if (periodo === "30d") {
        const last30 = new Date();
        last30.setDate(last30.getDate() - 30);
        query = query.gte("data_referencia", last30.toISOString().split('T')[0]);
      } else if (periodo === "custom" && startDate && endDate) {
        query = query.gte("data_referencia", startDate).lte("data_referencia", endDate);
      }

      const { data, error } = await query.order("data_referencia", { ascending: true }).abortSignal(signal);
      if (error) throw error;
      return data;
    },
  });
  const { data: resumoAnterior = [] } = useQuery({
    queryKey: ["relatorio-vendas-resumo-anterior", periodo, startDate, endDate],
    queryFn: async () => {
      let start: string, end: string;
      
      if (periodo === "7d") {
        const d1 = new Date(); d1.setDate(d1.getDate() - 14);
        const d2 = new Date(); d2.setDate(d2.getDate() - 7);
        start = d1.toISOString().split('T')[0];
        end = d2.toISOString().split('T')[0];
      } else if (periodo === "30d") {
        const d1 = new Date(); d1.setDate(d1.getDate() - 60);
        const d2 = new Date(); d2.setDate(d2.getDate() - 30);
        start = d1.toISOString().split('T')[0];
        end = d2.toISOString().split('T')[0];
      } else if (periodo === "custom" && startDate && endDate) {
        const s = new Date(startDate);
        const e = new Date(endDate);
        const diff = e.getTime() - s.getTime();
        const s2 = new Date(s.getTime() - diff - 86400000);
        const e2 = new Date(s.getTime() - 86400000);
        start = s2.toISOString().split('T')[0];
        end = e2.toISOString().split('T')[0];
      } else {
        return [];
      }

      const { data, error } = await supabase
        .from("view_resumo_vendas_diario")
        .select("*")
        .gte("data_referencia", start)
        .lte("data_referencia", end);
      
      if (error) throw error;
      return data;
    },
  });

  const { data: topProdutos = [], isLoading: loadingProdutos } = useQuery({
    queryKey: ["relatorio-top-produtos"],
    queryFn: async ({ signal }) => {
      const { data, error } = await supabase.from("view_top_produtos").select("*").limit(5).abortSignal(signal);
      if (error) throw error;
      return data;
    },
  });

  const { data: newVendas = [], isLoading: loadingVendas, isFetching: fetchingVendas } = useQuery({
    queryKey: ["relatorio-vendas-detalhado", periodo, startDate, endDate, page],
    queryFn: async ({ signal }) => {
      let query = supabase
        .from("tab_vendas")
        .select("*, tab_clientes!ven_cliente_id(cli_nome), tab_itens_venda!itv_venda_id(*, tab_produtos(pro_descricao))")
        .order("created_at", { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);
      
      if (periodo === "7d") {
        const last7 = new Date();
        last7.setDate(last7.getDate() - 7);
        query = query.gte("created_at", last7.toISOString());
      } else if (periodo === "30d") {
        const last30 = new Date();
        last30.setDate(last30.getDate() - 30);
        query = query.gte("created_at", last30.toISOString());
      } else if (periodo === "custom" && startDate && endDate) {
        query = query.gte("created_at", `${startDate}T00:00:00`).lte("created_at", `${endDate}T23:59:59`);
      }

      const { data, error } = await query.abortSignal(signal);
      if (error) throw error;
      return data;
    },
  });

  // Reset e acumular vendas para scroll infinito
  useEffect(() => {
    setAllVendas([]);
    setPage(0);
    setHasMore(true);
  }, [periodo, startDate, endDate]);

  useEffect(() => {
    if (newVendas.length > 0) {
      setAllVendas(prev => {
        // Evitar duplicatas por ID se o query disparar repetido
        const existingIds = new Set(prev.map(v => v.id));
        const filtered = newVendas.filter(v => !existingIds.has(v.id));
        return [...prev, ...filtered];
      });
      if (newVendas.length < pageSize) setHasMore(false);
    } else if (!loadingVendas) {
      setHasMore(false);
    }
  }, [newVendas, loadingVendas]);

  const filteredVendas = useMemo(() => {
    if (!buscaVenda) return allVendas;
    const term = buscaVenda.toLowerCase();
    return allVendas.filter(v => 
      v.id.toLowerCase().includes(term) || 
      v.tab_clientes?.cli_nome?.toLowerCase().includes(term) ||
      v.ven_forma_pagamento?.toLowerCase().includes(term)
    );
  }, [allVendas, buscaVenda]);

  const stats = useMemo(() => {
    const totalVendas = resumoVendas.reduce((s, v) => s + Number(v.volume_vendas || 0), 0);
    const totalLucro = resumoVendas.reduce((s, v) => s + Number(v.lucro_total || 0), 0);
    const totalItens = resumoVendas.reduce((s, v) => s + Number(v.total_vendas || 0), 0);
    const margemMedia = totalVendas > 0 ? (totalLucro / totalVendas) * 100 : 0;
    const mediaVenda = totalItens > 0 ? totalVendas / totalItens : 0;

    const anteriorVendas = resumoAnterior.reduce((s, v) => s + Number(v.volume_vendas || 0), 0);
    const anteriorLucro = resumoAnterior.reduce((s, v) => s + Number(v.lucro_total || 0), 0);
    const anteriorItens = resumoAnterior.reduce((s, v) => s + Number(v.total_vendas || 0), 0);
    const anteriorTicket = anteriorItens > 0 ? anteriorVendas / anteriorItens : 0;

    const calcVar = (atual: number, anterior: number) => {
      if (anterior === 0) return atual > 0 ? 100 : 0;
      return ((atual - anterior) / anterior) * 100;
    };

    return { 
      totalVendas, totalLucro, totalItens, margemMedia, ticketMedio: mediaVenda,
      variacaoVendas: calcVar(totalVendas, anteriorVendas),
      variacaoLucro: calcVar(totalLucro, anteriorLucro),
      variacaoItens: calcVar(totalItens, anteriorItens),
      variacaoTicket: calcVar(mediaVenda, anteriorTicket)
    };
  }, [resumoVendas, resumoAnterior]);

  const chartData = useMemo(() => {
    return resumoVendas.map(v => {
      const dataFormatada = v.data_referencia ? dateBR(v.data_referencia) : "";
      const partes = dataFormatada.split('/');
      return {
        data: partes.length >= 2 ? `${partes[0]}/${partes[1]}` : "—",
        vendas: Number(v.volume_vendas || 0),
        lucro: Number(v.lucro_total || 0),
      };
    });
  }, [resumoVendas]);

  const exportPDF = async () => {
    setIsExporting(true);
    try {
      // Pequeno delay para mostrar o loading se o processamento for muito rápido
      await new Promise(resolve => setTimeout(resolve, 800));
      const doc = new SafejsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      
      doc.setFontSize(22);
      doc.setTextColor(219, 39, 119);
      doc.text(COMPANY_NAME, pageWidth / 2, 20, { align: "center" });
      
      doc.setFontSize(16);
      doc.setTextColor(51, 51, 51);
      doc.text("Relatório de Desempenho", pageWidth / 2, 30, { align: "center" });
      
      doc.setFontSize(10);
      doc.setTextColor(102, 102, 102);
      const periodLabel = periodo === '7d' ? 'Últimos 7 dias' : periodo === '30d' ? 'Últimos 30 dias' : `De ${dateBR(startDate)} até ${dateBR(endDate)}`;
      doc.text(`Período: ${periodLabel}`, pageWidth / 2, 38, { align: "center" });
      
      doc.setDrawColor(240, 240, 240);
      doc.setFillColor(250, 250, 250);
      doc.roundedRect(15, 45, 180, 25, 3, 3, "FD");
      
      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      doc.text("Total de Vendas", 25, 55);
      doc.text("Lucro Líquido", 85, 55);
      doc.text("Pedidos", 155, 55);
      
      doc.setFontSize(14);
      doc.text(brl(stats.totalVendas), 25, 63);
      doc.text(brl(stats.totalLucro), 85, 63);
      doc.text(stats.totalItens.toString(), 155, 63);

      const tableData = resumoVendas.map(v => [
        dateBR(v.data_referencia || ""),
        (v.total_vendas ?? 0).toString(),
        brl(v.volume_vendas || 0),
        brl(v.lucro_total || 0)
      ]);

      (doc as any).autoTable({
        startY: 80,
        head: [["Data", "Qtd Pedidos", "Total Vendido", "Lucro"]],
        body: tableData,
        theme: 'striped',
        headStyles: { fillStyle: 'F', fillColor: [219, 39, 119], textColor: [255, 255, 255] },
        styles: { fontSize: 9 }
      });

      doc.save(`relatorio_${periodo}_${new Date().getTime()}.pdf`);
      toast.success("Relatório PDF gerado com sucesso!");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao gerar PDF.");
    } finally {
      setIsExporting(false);
    }
  };

  const exportCSV = async () => {
    setIsExporting(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 600));
      const headers = ["Data", "Qtd Pedidos", "Volume Vendas", "Lucro Total"];
      const rows = resumoVendas.map(v => [
        v.data_referencia,
        v.total_vendas,
        v.volume_vendas,
        v.lucro_total
      ]);
      
      const csvContent = [
        headers.join(","),
        ...rows.map(e => e.join(","))
      ].join("\n");
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `relatorio_${periodo}_${new Date().getTime()}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("CSV exportado com sucesso!");
    } catch (error) {
      toast.error("Erro ao exportar CSV.");
    } finally {
      setIsExporting(false);
    }
  };

  const isLoading = loadingResumo || loadingProdutos;

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <PageHeader 
          title="Relatórios de Desempenho" 
          description="Acompanhe o crescimento e a lucratividade do seu negócio."
        />
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
          <div className="bg-muted p-1 rounded-2xl flex items-center shadow-inner">
            <Button 
              variant={activeTab === "graficos" ? "secondary" : "ghost"} 
              size="sm" 
              onClick={() => setActiveTab("graficos")}
              className={cn(
                "flex-1 sm:flex-none h-9 rounded-xl text-[10px] font-black uppercase tracking-wider",
                activeTab === "graficos" && "bg-white shadow-sm"
              )}
            >
              <BarChart3 className="mr-2 h-3.5 w-3.5 text-primary" />
              Análise Visual
            </Button>
            <Button 
              variant={activeTab === "vendas" ? "secondary" : "ghost"} 
              size="sm" 
              onClick={() => setActiveTab("vendas")}
              className={cn(
                "flex-1 sm:flex-none h-9 rounded-xl text-[10px] font-black uppercase tracking-wider",
                activeTab === "vendas" && "bg-white shadow-sm"
              )}
            >
              <TableIcon className="mr-2 h-3.5 w-3.5 text-primary" />
              Extrato PDV
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={exportCSV} 
              className="flex-1 sm:flex-none rounded-2xl h-11 sm:h-10 text-[10px] font-black uppercase tracking-widest border-none bg-card shadow-sm hover:bg-slate-50"
              disabled={isExporting || isLoading}
            >
              {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
              Exportar CSV
            </Button>
            <Button 
              onClick={exportPDF} 
              className="flex-1 sm:flex-none rounded-2xl h-11 sm:h-10 shadow-lg shadow-primary/20 text-[10px] font-black uppercase tracking-widest"
              disabled={isExporting || isLoading}
            >
              {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
              Relatório PDF
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <Card className="overflow-hidden border-none shadow-sm bg-card/50 backdrop-blur-sm rounded-3xl">
          <div className="bg-primary/5 px-6 py-3 border-b border-primary/10 flex items-center justify-between">
            <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Painel de Controle Gerencial</span>
            <p className="text-[10px] text-muted-foreground font-bold">
              {isLoading ? <Skeleton className="h-4 w-32" /> : <>{resumoVendas.length} dias processados</>}
            </p>
          </div>
          <CardHeader className="pb-6 px-6 pt-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-primary/60" />
                <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-700">Filtros de Análise</CardTitle>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Select value={periodo} onValueChange={setPeriodo}>
                  <SelectTrigger className="w-[180px] h-11 rounded-2xl border-none bg-background/50 shadow-inner">
                    <SelectValue placeholder="Selecionar período" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-none shadow-2xl">
                    <SelectItem value="7d">Últimos 7 dias</SelectItem>
                    <SelectItem value="30d">Últimos 30 dias</SelectItem>
                    <SelectItem value="custom">Personalizado</SelectItem>
                  </SelectContent>
                </Select>
                {periodo === "custom" && (
                  <div className="flex items-center gap-2 animate-in slide-in-from-right-2 duration-300">
                    <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-auto h-11 rounded-2xl border-none bg-background/50 shadow-inner text-xs font-bold" />
                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Até</span>
                    <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-auto h-11 rounded-2xl border-none bg-background/50 shadow-inner text-xs font-bold" />
                  </div>
                )}
              </div>
            </div>
          </CardHeader>
        </Card>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-primary/5 border-none shadow-sm rounded-3xl overflow-hidden">
          <CardHeader className="p-5 flex flex-row items-center justify-between space-y-0">
            <CardDescription className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
              <DollarSign className="h-3 w-3" /> Faturamento
            </CardDescription>
            <TrendingUp className="h-4 w-4 text-primary/40" />
          </CardHeader>
          <CardContent className="px-5 pb-5 pt-0">
            <div className="flex items-baseline gap-2">
              {isLoading ? <Skeleton className="h-8 w-24" /> : <CardTitle className="text-2xl font-black text-primary">{brl(stats.totalVendas)}</CardTitle>}
              <Badge variant="outline" className={cn("text-[10px] font-bold p-0 border-none flex items-center gap-0.5", stats.variacaoVendas >= 0 ? "text-emerald-600" : "text-rose-600")}>
                {stats.variacaoVendas >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                {Math.abs(stats.variacaoVendas).toFixed(1)}%
              </Badge>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1 font-medium">Total vendido no período</p>
          </CardContent>
        </Card>

        <Card className="bg-emerald-50/50 border-none shadow-sm rounded-3xl overflow-hidden">
          <CardHeader className="p-5 flex flex-row items-center justify-between space-y-0">
            <CardDescription className="text-[10px] font-black uppercase tracking-widest text-emerald-700 flex items-center gap-2">
              <TrendingUp className="h-3 w-3" /> Lucro Estimado
            </CardDescription>
            <div className="h-4 w-4 rounded-full bg-emerald-100 flex items-center justify-center">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-5 pt-0">
            <div className="flex items-baseline gap-2">
              {isLoading ? <Skeleton className="h-8 w-24" /> : <CardTitle className="text-2xl font-black text-emerald-700">{brl(stats.totalLucro)}</CardTitle>}
              <Badge variant="outline" className={cn("text-[10px] font-bold p-0 border-none flex items-center gap-0.5", stats.variacaoLucro >= 0 ? "text-emerald-600" : "text-rose-600")}>
                {stats.variacaoLucro >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                {Math.abs(stats.variacaoLucro).toFixed(1)}%
              </Badge>
            </div>
            <p className="text-[10px] text-emerald-600/60 mt-1 font-medium">Margem de {stats.margemMedia.toFixed(1)}%</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-50 border-none shadow-sm rounded-3xl overflow-hidden">
          <CardHeader className="p-5 flex flex-row items-center justify-between space-y-0">
            <CardDescription className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
              <Package className="h-3 w-3" /> Pedidos
            </CardDescription>
          </CardHeader>
          <CardContent className="px-5 pb-5 pt-0">
            <div className="flex items-baseline gap-2">
              {isLoading ? <Skeleton className="h-8 w-16" /> : <CardTitle className="text-2xl font-black text-slate-900">{stats.totalItens}</CardTitle>}
              <Badge variant="outline" className={cn("text-[10px] font-bold p-0 border-none flex items-center gap-0.5", stats.variacaoItens >= 0 ? "text-emerald-600" : "text-rose-600")}>
                {stats.variacaoItens >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                {Math.abs(stats.variacaoItens).toFixed(1)}%
              </Badge>
            </div>
            <p className="text-[10px] text-slate-500/60 mt-1 font-medium">Vendas realizadas</p>
          </CardContent>
        </Card>

        <Card className="bg-blue-50/50 border-none shadow-sm rounded-3xl overflow-hidden">
          <CardHeader className="p-5 flex flex-row items-center justify-between space-y-0">
            <CardDescription className="text-[10px] font-black uppercase tracking-widest text-blue-700 flex items-center gap-2">
              <History className="h-3 w-3" /> Ticket Médio
            </CardDescription>
          </CardHeader>
          <CardContent className="px-5 pb-5 pt-0">
            <div className="flex items-baseline gap-2">
              {isLoading ? <Skeleton className="h-8 w-24" /> : <CardTitle className="text-2xl font-black text-blue-700">{brl(stats.ticketMedio)}</CardTitle>}
              <Badge variant="outline" className={cn("text-[10px] font-bold p-0 border-none flex items-center gap-0.5", stats.variacaoTicket >= 0 ? "text-emerald-600" : "text-rose-600")}>
                {stats.variacaoTicket >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                {Math.abs(stats.variacaoTicket).toFixed(1)}%
              </Badge>
            </div>
            <p className="text-[10px] text-blue-600/60 mt-1 font-medium">Média por venda</p>
          </CardContent>
        </Card>
      </div>

      {activeTab === "graficos" ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="border-none shadow-xl bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" /> Tendência de Vendas vs Lucro
              </CardTitle>
              <CardDescription>Evolução financeira no período selecionado</CardDescription>
            </CardHeader>
            <CardContent className="h-[400px]">
              {errorResumo ? (
                <ErrorState 
                  title="Erro nos relatórios"
                  description="Não foi possível processar os dados financeiros deste período."
                  onRetry={() => queryClient.invalidateQueries({ queryKey: ["relatorio-vendas-resumo"] })} 
                />
              ) : isLoading ? (
                <ChartSkeleton height={400} />
              ) : chartData.length === 0 ? (
                <div className="h-full flex items-center justify-center">
                  <EmptyState 
                    title="Sem movimentação"
                    description="Não houve vendas ou lucros registrados no período selecionado."
                    icon={History}
                    action={periodo !== "7d" ? {
                      label: "Ver últimos 7 dias",
                      onClick: () => {
                        setPeriodo("7d");
                        setStartDate("");
                        setEndDate("");
                      }
                    } : undefined}
                  />
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                    <XAxis dataKey="data" axisLine={false} tickLine={false} />
                    <YAxis axisLine={false} tickLine={false} tickFormatter={(v) => `R$${v}`} />
                    <ChartTooltip 
                      formatter={(v) => [brl(Number(v)), ""]}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="vendas" stroke="rgb(219, 39, 119)" strokeWidth={3} dot={{r: 4, fill: 'rgb(219, 39, 119)'}} activeDot={{r: 6}} name="Vendas" />
                    <Line type="monotone" dataKey="lucro" stroke="rgb(22, 163, 74)" strokeWidth={3} dot={{r: 4, fill: 'rgb(22, 163, 74)'}} activeDot={{r: 6}} name="Lucro" />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card className="border-none shadow-xl bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="h-5 w-5 text-primary" /> Distribuição por Produto
              </CardTitle>
              <CardDescription>Participação no faturamento total</CardDescription>
            </CardHeader>
            <CardContent className="h-[400px]">
              {isLoading ? (
                <ChartSkeleton height={400} showLegend={false} />
              ) : topProdutos.length === 0 ? (
                <div className="h-full flex items-center justify-center italic text-muted-foreground text-sm">
                  Dados insuficientes
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topProdutos} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.3} />
                    <XAxis type="number" hide />
                    <YAxis dataKey="descricao" type="category" width={150} axisLine={false} tickLine={false} className="text-[10px] font-bold" />
                    <ChartTooltip 
                      cursor={{fill: 'rgba(219, 39, 119, 0.05)'}}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      formatter={(v) => [brl(Number(v)), "Receita"]}
                    />
                    <Bar dataKey="receita_total" fill="rgb(219, 39, 119)" radius={[0, 4, 4, 0]} name="Receita" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary/40" />
              <Input 
                placeholder="Buscar ID, Cliente, Forma..." 
                className="pl-9 h-11 rounded-2xl bg-card border-none shadow-sm text-xs font-medium"
                value={buscaVenda}
                onChange={(e) => setBuscaVenda(e.target.value)}
              />
            </div>
            <div className="px-4 py-2.5 bg-primary/5 rounded-2xl flex items-center justify-between sm:justify-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-primary">Total</span>
              <span className="text-sm font-black text-slate-900">{filteredVendas.length}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {loadingVendas ? (
              <div className="col-span-full h-32 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary/40" />
              </div>
            ) : filteredVendas.length === 0 ? (
              <div className="col-span-full h-32 flex items-center justify-center text-muted-foreground italic text-xs">
                Nenhuma venda encontrada.
              </div>
            ) : (
              filteredVendas.map((venda: any) => (
                <Card 
                  key={venda.id} 
                  className="rounded-3xl border-none shadow-sm hover:shadow-md transition-all cursor-pointer overflow-hidden">
                  <div className="p-5">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[10px] font-black uppercase text-muted-foreground">#{venda.id.split("-")[0]}</span>
                        <h3 className="font-black text-slate-900">{venda.tab_clientes?.cli_nome || "Consumidor Final"}</h3>
                        <span className="text-[10px] text-muted-foreground">{new Date(venda.created_at).toLocaleString('pt-BR')}</span>
                      </div>
                      <div className="text-right">
                        <span className="block text-[10px] font-black uppercase text-muted-foreground">Total</span>
                        <span className="text-lg font-black text-primary">{brl(venda.ven_valor_total)}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 pt-4 border-t border-dashed">
                      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-600 bg-slate-100 px-3 py-1.5 rounded-full">
                        {venda.ven_forma_pagamento === 'dinheiro' && <Banknote className="h-3 w-3" />}
                        {venda.ven_forma_pagamento?.includes('cartao') && <CreditCard className="h-3 w-3" />}
                        {venda.ven_forma_pagamento === 'pix' && <QrCode className="h-3 w-3" />}
                        {venda.ven_forma_pagamento}
                      </div>
                      {venda.ven_desconto > 0 && (
                        <div className="text-[10px] font-bold uppercase tracking-wider text-rose-600 bg-rose-50 px-3 py-1.5 rounded-full">
                          Desc: {brl(venda.ven_desconto)}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="bg-primary/[0.02] p-5 border-t border-primary/10">
                     <p className="text-[10px] font-black uppercase text-muted-foreground mb-3">Itens do Pedido</p>
                     <div className="space-y-2">
                        {venda.tab_itens_venda?.map((item: any) => (
                           <div key={item.id} className="flex justify-between items-center text-[11px]">
                              <span className={item.itv_status === 'cancelado' ? 'line-through text-muted-foreground' : 'font-medium'}>
                                {item.itv_quantidade}x {item.tab_produtos?.pro_descricao || "Produto removido"}
                              </span>
                              <span className="font-bold">{brl(item.itv_valor_total)}</span>
                           </div>
                        ))}
                     </div>
                  </div>
                </Card>
              ))
            )}
          </div>

          {hasMore && !buscaVenda && (
            <Button 
              variant="ghost" 
              className="w-full h-12 rounded-2xl text-primary font-black uppercase tracking-widest text-[10px] hover:bg-primary/5"
              onClick={() => setPage(p => p + 1)}
              disabled={fetchingVendas}
            >
              {fetchingVendas ? <Loader2 className="h-4 w-4 animate-spin" /> : "Carregar mais registros"}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
