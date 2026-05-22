import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { SafejsPDF } from "@/lib/pdf-utils";
import { COMPANY_NAME } from "@/lib/constants";
import { toast } from "sonner";
import "jspdf-autotable";
import { 
  DollarSign, 
  TrendingUp, 
  Receipt, 
  Package, 
  ChevronRight,
  MoreHorizontal,
  Calculator,
  Calendar as CalendarIcon,
  Filter,
  Download,
  Loader2,
  FileText,
  Target,
  Zap,
  ShoppingBag,
  ArrowRight,
  Plus
} from "lucide-react";
import { EmptyState } from "@/components/States";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ChartTooltip,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis as RechartsXAxis,
  YAxis as RechartsYAxis
} from "recharts";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { StatCard } from "@/components/StatCard";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  TooltipProvider,
  Tooltip as UITooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { brl } from "@/lib/format";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import type { Produto } from "@/lib/types";
import { cn } from "@/lib/utils";
import { format, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChartSkeleton } from "@/components/ChartSkeleton";
const DICAS_DASHBOARD = [
  "Revise seu estoque de peças íntimas básicas; elas são as que mais giram!",
  "Lingeries vermelhas costumam ter pico de vendas próximo a datas comemorativas.",
  "Mantenha seu CRM atualizado para avisar as clientes sobre novas coleções.",
  "O atendimento personalizado é o seu maior diferencial competitivo.",
  "Sempre confira a margem de lucro ao aplicar descontos em promoções.",
  "Analise os horários de maior movimento para otimizar sua escala.",
  "Produtos com baixa rotatividade podem precisar de uma promoção relâmpago."
];

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: `Dashboard — ${COMPANY_NAME}` },
      { name: "description", content: "Visão geral estratégica do desempenho do seu negócio." },
    ],
  }),
  component: Dashboard,
});
function Dashboard() {
  const dicaAleatoria = useMemo(() => {
    return DICAS_DASHBOARD[Math.floor(Math.random() * DICAS_DASHBOARD.length)];
  }, []);
  const [isExporting, setIsExporting] = useState<"pdf" | "csv" | null>(null);
  const [periodo, setPeriodo] = useState("7d");
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: subDays(new Date(), 7),
    to: new Date(),
  });

  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [isDayDetailsOpen, setIsDayDetailsOpen] = useState(false);

  const filterDates = useMemo(() => {
    let from: string | undefined;
    let to: string | undefined;

    if (periodo === "7d") {
      from = subDays(new Date(), 7).toISOString().split('T')[0];
    } else if (periodo === "30d") {
      from = subDays(new Date(), 30).toISOString().split('T')[0];
    } else if (periodo === "custom" && dateRange.from && dateRange.to) {
      from = dateRange.from.toISOString().split('T')[0];
      to = dateRange.to.toISOString().split('T')[0];
    }

    return { from, to };
  }, [periodo, dateRange]);

  const { data: dayVendas = [], isLoading: loadingDayVendas } = useQuery({
    queryKey: ["vendas-detalhe-dia", selectedDay],
    enabled: !!selectedDay,
    queryFn: async ({ signal }) => {
      const { data, error } = await supabase
        .from("tab_vendas")
        .select("*, tab_clientes(cli_nome), tab_itens_venda(*)")
        .gte('created_at', `${selectedDay}T00:00:00`)
        .lte('created_at', `${selectedDay}T23:59:59`)
        .order('created_at', { ascending: false })
        .abortSignal(signal);
      
      if (error) throw error;
      return data || [];
    },
  });

  const { data: resumoData, isLoading: loadingResumen } = useQuery({
    queryKey: ["resumo-vendas-dashboard-comparativo", filterDates, periodo],
    queryFn: async ({ signal }) => {
      let queryCurrent = supabase.from("view_resumo_vendas_diario").select("*");
      if (filterDates.from) queryCurrent = queryCurrent.gte("data_referencia", filterDates.from);
      if (filterDates.to) queryCurrent = queryCurrent.lte("data_referencia", filterDates.to);
      const { data: currentData, error: currentError } = await queryCurrent.order("data_referencia", { ascending: true }).abortSignal(signal);
      if (currentError) throw currentError;

      let previousData: any[] = [];
      if (periodo !== "custom" && filterDates.from) {
        const days = periodo === "7d" ? 7 : 30;
        const currentFrom = new Date(filterDates.from);
        const prevTo = subDays(currentFrom, 1).toISOString().split('T')[0];
        const prevFrom = subDays(currentFrom, days).toISOString().split('T')[0];

        const { data: pData, error: pError } = await supabase
          .from("view_resumo_vendas_diario")
          .select("*")
          .gte("data_referencia", prevFrom)
          .lte("data_referencia", prevTo)
          .abortSignal(signal);
        
        if (!pError) previousData = pData || [];
      }

      const { data: payData, error: payError } = await supabase
        .from("view_formas_pagamento_stats")
        .select("*")
        .abortSignal(signal);
      
      const paymentsData = payError ? [] : payData || [];

      return { current: currentData || [], previous: previousData, payments: paymentsData };
    },
  });

  const { current = [], previous = [], payments = [] } = resumoData || {};

  const { data: topProdutosDB = [], isLoading: loadingTopProd } = useQuery({
    queryKey: ["top-produtos-dashboard"],
    queryFn: async ({ signal }) => {
      const { data, error } = await supabase.from("view_top_produtos").select("*").limit(5).abortSignal(signal);
      if (error) throw error;
      return data;
    },
  });

  const { data: vendas = [], isLoading: loadingVendas } = useQuery({
    queryKey: ["vendas-dashboard"],
    queryFn: async ({ signal }) => {
      const { data, error } = await supabase.from("tab_vendas").select("*, tab_clientes(cli_nome), tab_itens_venda(*)").order('created_at', { ascending: false }).limit(5).abortSignal(signal);
      if (error) throw error;
      return data as any[];
    },
  });

  const totals = useMemo(() => {
    const totalVendas = current.reduce((s: number, v: any) => s + Number(v.volume_vendas || 0), 0);
    const lucroTotal = current.reduce((s: number, v: any) => s + Number(v.lucro_total || 0), 0);
    const totalCount = current.reduce((s: number, v: any) => s + Number(v.total_vendas || 0), 0);
    const ticket = totalCount ? totalVendas / totalCount : 0;

    const prevVendas = previous.reduce((s: number, v: any) => s + Number(v.volume_vendas || 0), 0);
    const prevLucro = previous.reduce((s: number, v: any) => s + Number(v.lucro_total || 0), 0);

    const calcVariation = (now: number, then: number) => {
      if (then === 0) return now > 0 ? 100 : 0;
      return ((now - then) / then) * 100;
    };

    const varVendas = calcVariation(totalVendas, prevVendas);
    const varLucro = calcVariation(lucroTotal, prevLucro);

    return { 
      totalVendas, 
      lucroTotal, 
      ticket, 
      variationVendas: varVendas,
      trendVendas: varVendas >= 0 ? "up" : "down" as any,
      variationLucro: varLucro,
      trendLucro: varLucro >= 0 ? "up" : "down" as any,
      hasComparison: previous.length > 0 && (prevVendas > 0 || prevLucro > 0)
    };
  }, [current, previous]);

  const chartData = useMemo(() => {
    return current.map((v: any) => {
      let formattedDate = '—';
      if (v.data_referencia) {
        try {
          const d = new Date(v.data_referencia + 'T00:00:00');
          if (!isNaN(d.getTime())) {
            formattedDate = format(d, 'dd/MM', { locale: ptBR });
          }
        } catch (e) {
          console.error("Error formatting date:", e);
        }
      }
      
      return {
        name: formattedDate,
        fullDate: v.data_referencia,
        vendas: Number(v.volume_vendas || 0),
        lucro: Number(v.lucro_total || 0)
      };
    });
  }, [current]);

  const paymentChartData = useMemo(() => {
    return (payments || []).map(p => ({
      name: p.forma_pagamento?.toUpperCase() || 'OUTROS',
      value: Number(p.volume_financeiro || 0)
    }));
  }, [payments]);

  const COLORS = ['#EC4899', '#8B5CF6', '#3B82F6', '#10B981', '#F59E0B'];

  const safeFormat = (date: Date | string | null | undefined, formatStr: string, options?: any) => {
    if (!date) return '—';
    try {
      const d = typeof date === 'string' ? new Date(date.includes('T') ? date : date + 'T12:00:00') : date;
      if (isNaN(d.getTime())) return '—';
      return format(d, formatStr, options);
    } catch (e) {
      return '—';
    }
  };

  const isLoading = loadingResumen || loadingTopProd || loadingVendas;

  return (
    <div className="space-y-8 pb-12 animate-in fade-in duration-1000">
      {/* Header Section */}
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest">
            <Zap className="h-3 w-3 fill-current" /> Visão Estratégica
          </div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight text-slate-900 leading-none">
            Dashboard <span className="text-primary italic">Executivo</span>
          </h1>
          <p className="text-muted-foreground text-sm font-medium">
            <span className="text-primary font-bold">Dica:</span> {dicaAleatoria}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-card/50 backdrop-blur-sm border border-border/40 rounded-2xl p-1.5 shadow-sm">
            <Select value={periodo} onValueChange={setPeriodo}>
              <SelectTrigger className="w-[140px] border-none shadow-none h-9 text-xs font-bold uppercase tracking-tight focus:ring-0">
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl border-none shadow-2xl">
                <SelectItem value="7d" className="rounded-xl font-bold text-xs uppercase">Últimos 7 dias</SelectItem>
                <SelectItem value="30d" className="rounded-xl font-bold text-xs uppercase">Últimos 30 dias</SelectItem>
                <SelectItem value="custom" className="rounded-xl font-bold text-xs uppercase">Personalizado</SelectItem>
              </SelectContent>
            </Select>

            {periodo === "custom" && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-9 px-4 rounded-xl text-xs font-bold border-l border-border/40">
                    <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                    {dateRange.from ? safeFormat(dateRange.from, "dd/MM") : "Início"} - {dateRange.to ? safeFormat(dateRange.to, "dd/MM") : "Fim"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 rounded-3xl overflow-hidden shadow-2xl border-none">
                  <Calendar
                    initialFocus
                    mode="range"
                    selected={dateRange}
                    onSelect={(range: any) => setDateRange(range || { from: undefined, to: undefined })}
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
            )}
          </div>

          <Button size="sm" className="h-11 px-6 rounded-2xl shadow-xl shadow-primary/20 bg-primary hover:scale-[1.02] active:scale-[0.98] transition-all font-black uppercase tracking-widest text-[10px]" asChild>
            <Link to="/vendas">
              <Plus className="mr-2 h-4 w-4" /> Nova Operação
            </Link>
          </Button>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Volume de Vendas"
          value={brl(totals.totalVendas)}
          icon={DollarSign}
          hint={totals.hasComparison ? `${Math.abs(totals.variationVendas).toFixed(1)}% vs anterior` : undefined}
          trend={totals.hasComparison ? totals.trendVendas : undefined}
          accent="primary"
        />
        <StatCard
          title="Lucratividade"
          value={brl(totals.lucroTotal)}
          icon={TrendingUp}
          hint={totals.hasComparison ? `${Math.abs(totals.variationLucro).toFixed(1)}% vs anterior` : undefined}
          trend={totals.hasComparison ? totals.trendLucro : undefined}
          accent="success"
        />
        <StatCard
          title="Ticket Médio"
          value={brl(totals.ticket)}
          icon={Target}
          accent="warning"
        />
        <StatCard
          title="Giro de Estoque"
          value={current.reduce((s, v) => s + Number(v.total_vendas || 0), 0).toString()}
          icon={Package}
          accent="muted"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Sales Evolution Chart */}
        <Card className="lg:col-span-2 rounded-[2.5rem] border-none shadow-xl bg-card/50 backdrop-blur-sm overflow-hidden">
          <CardHeader className="p-8 pb-0 flex flex-row items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" /> Evolução de Vendas
              </CardTitle>
              <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Performance financeira diária</CardDescription>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                <span className="text-[10px] font-black uppercase tracking-tight text-slate-400">Vendas</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="text-[10px] font-black uppercase tracking-tight text-slate-400">Lucro</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-8 h-[400px]">
            {isLoading ? <ChartSkeleton /> : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart 
                  data={chartData} 
                  margin={{ top: 20, right: 0, left: 0, bottom: 0 }}
                  onClick={(data: any) => {
                    if (data && data.activePayload && data.activePayload[0]) {
                      const payload = data.activePayload[0].payload;
                      if (payload.fullDate) {
                        setSelectedDay(payload.fullDate);
                        setIsDayDetailsOpen(true);
                      }
                    }
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  <defs>
                    <linearGradient id="colorVendas" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorLucro" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.03)" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fontWeight: 800, fill: '#94a3b8' }}
                    dy={15}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fontWeight: 800, fill: '#94a3b8' }}
                    tickFormatter={(value) => `R$ ${value}`}
                  />
                  <ChartTooltip 
                    contentStyle={{ borderRadius: '1.5rem', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '1rem' }}
                    labelStyle={{ fontWeight: 900, marginBottom: '0.5rem', fontSize: '12px' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="vendas" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={4}
                    fillOpacity={1} 
                    fill="url(#colorVendas)" 
                  />
                  <Area 
                    type="monotone" 
                    dataKey="lucro" 
                    stroke="#10B981" 
                    strokeWidth={4}
                    fillOpacity={1} 
                    fill="url(#colorLucro)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Payment Methods Distribution */}
        <Card className="rounded-[2.5rem] border-none shadow-xl bg-card/50 backdrop-blur-sm overflow-hidden flex flex-col">
          <CardHeader className="p-8 pb-0">
            <CardTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
              <Calculator className="h-5 w-5 text-primary" /> Distribuição de Receita
            </CardTitle>
            <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Formas de pagamento preferidas</CardDescription>
          </CardHeader>
          <CardContent className="p-8 flex-1 flex flex-col justify-center">
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={paymentChartData}
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={8}
                    dataKey="value"
                  >
                    {paymentChartData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <ChartTooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-y-4 mt-6">
              {paymentChartData.map((item: any, index: number) => (
                <div key={item.name} className="flex items-center gap-2.5">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                  <div className="flex flex-col">
                    <span className="text-[9px] font-black uppercase tracking-tight text-slate-400">{item.name}</span>
                    <span className="text-xs font-black text-slate-900">{brl(item.value)}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Transactions */}
        <Card className="rounded-[2.5rem] border-none shadow-xl bg-card/50 backdrop-blur-sm overflow-hidden">
          <CardHeader className="p-8 pb-4 flex flex-row items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
                <Receipt className="h-5 w-5 text-primary" /> Vendas Recentes
              </CardTitle>
              <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Últimas operações processadas</CardDescription>
            </div>
            <Button variant="ghost" size="sm" className="rounded-xl text-[10px] font-black uppercase tracking-widest" asChild>
              <Link to="/relatorios">Ver Todas <ArrowRight className="ml-2 h-3 w-3" /></Link>
            </Button>
          </CardHeader>
          <CardContent className="p-8 pt-0">
            <div className="space-y-4">
              {isLoading ? [...Array(4)].map((_, i) => <div key={i} className="h-16 rounded-2xl bg-muted/20 animate-pulse" />) : 
                vendas.map((v) => (
                  <div key={v.id} className="flex items-center justify-between p-4 rounded-2xl bg-background/50 border border-border/10 hover:border-primary/20 hover:bg-primary/[0.02] transition-all group">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                        <ShoppingBag className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-black text-slate-900 leading-tight truncate max-w-[120px] sm:max-w-none">
                          {v.tab_clientes?.cli_nome || "Venda Direta"}
                        </p>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight">
                          {safeFormat(v.created_at, "dd/MM 'às' HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-slate-900">{brl(v.ven_valor_total)}</p>
                      <Badge variant="outline" className="text-[8px] font-black uppercase px-2 py-0 border-none bg-emerald-50 text-emerald-600">Concluída</Badge>
                    </div>
                  </div>
                ))
              }
            </div>
          </CardContent>
        </Card>

      {/* Day Details Modal */}
      <Dialog open={isDayDetailsOpen} onOpenChange={setIsDayDetailsOpen}>
        <DialogContent className="max-w-3xl rounded-[2.5rem] p-0 overflow-hidden border-none shadow-2xl max-h-[90vh] flex flex-col">
          <div className="bg-slate-900 text-white p-8 relative shrink-0">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full -mr-16 -mt-16 blur-3xl" />
            <DialogHeader>
              <div className="flex items-center gap-4 relative z-10">
                <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center">
                  <CalendarIcon className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-black uppercase tracking-tight text-white leading-none mb-1">
                    Detalhamento Diário
                  </DialogTitle>
                  <DialogDescription className="text-white/40 text-[10px] font-bold uppercase tracking-widest">
                    {selectedDay ? safeFormat(selectedDay + 'T00:00:00', "EEEE, dd 'de' MMMM", { locale: ptBR }) : ''}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
          </div>

          <div className="p-8 overflow-y-auto flex-1">
            {loadingDayVendas ? (
              <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="h-10 w-10 animate-spin text-primary/40" />
                <p className="mt-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Buscando transações...</p>
              </div>
            ) : dayVendas.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-sm font-bold text-muted-foreground">Nenhuma venda registrada neste dia.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-6">
                  <Receipt className="h-4 w-4 text-primary" />
                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Transações do Período</h4>
                </div>
                
                <div className="grid gap-4">
                  {dayVendas.map((v: any) => (
                    <div key={v.id} className="flex items-center justify-between p-5 rounded-[2rem] bg-slate-50 border border-slate-100 hover:border-primary/20 transition-all group">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-white shadow-sm flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                          <ShoppingBag className="h-6 w-6" />
                        </div>
                        <div>
                          <p className="text-sm font-black text-slate-900 leading-tight">
                            {v.tab_clientes?.cli_nome || "Venda Direta"}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-[8px] font-black uppercase px-2 py-0 border-none bg-slate-200 text-slate-600">
                              {safeFormat(v.created_at, "HH:mm")}
                            </Badge>
                            <span className="text-[10px] font-bold text-muted-foreground">
                              {v.tab_itens_venda?.length || 0} itens
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-black text-slate-900 leading-none mb-1">{brl(v.ven_valor_total)}</p>
                        <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-tight">Venda Concluída</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <div className="p-6 bg-slate-50 border-t shrink-0">
            <Button 
              onClick={() => setIsDayDetailsOpen(false)}
              className="w-full h-12 rounded-2xl bg-slate-900 text-white font-black uppercase tracking-widest text-xs shadow-xl shadow-slate-900/20 active:scale-95 transition-all"
            >
              Fechar Detalhes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

        {/* Top Products */}
        <Card className="rounded-[2.5rem] border-none shadow-xl bg-card/50 backdrop-blur-sm overflow-hidden">
          <CardHeader className="p-8 pb-4 flex flex-row items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" /> Top Produtos
              </CardTitle>
              <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Os mais vendidos da temporada</CardDescription>
            </div>
            <Button variant="ghost" size="sm" className="rounded-xl text-[10px] font-black uppercase tracking-widest" asChild>
              <Link to="/produtos">Gestão <ArrowRight className="ml-2 h-3 w-3" /></Link>
            </Button>
          </CardHeader>
          <CardContent className="p-8 pt-0">
            <div className="space-y-4">
              {isLoading ? [...Array(4)].map((_, i) => <div key={i} className="h-16 rounded-2xl bg-muted/20 animate-pulse" />) : 
                topProdutosDB.map((p, index) => (
                  <div key={p.produto_id} className="flex items-center justify-between p-4 rounded-2xl bg-background/50 border border-border/10 hover:border-primary/20 transition-all">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 font-black text-xs">
                        #{index + 1}
                      </div>
                      <div>
                        <p className="text-sm font-black text-slate-900 leading-tight truncate max-w-[150px]">{p.descricao}</p>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight">{(p.total_vendido || 0)} unidades vendidas</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-primary">{brl(p.receita_total || 0)}</p>
                      <div className="h-1.5 w-24 bg-slate-100 rounded-full mt-2 overflow-hidden">
                        <div 
                          className="h-full bg-primary rounded-full" 
                          style={{ width: `${Math.min(((p.total_vendido || 0) / (topProdutosDB[0]?.total_vendido || 1)) * 100, 100)}%` }} 
                        />
                      </div>
                    </div>
                  </div>
                ))
              }
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
