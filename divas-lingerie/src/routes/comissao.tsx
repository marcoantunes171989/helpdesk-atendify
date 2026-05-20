import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Percent, 
  Calculator, 
  TrendingUp, 
  Target, 
  Award, 
  ChevronRight,
  Info,
  DollarSign,
  ArrowUpRight
} from "lucide-react";
import { useState, useMemo } from "react";
import { brl } from "@/lib/format";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/comissao")({
  component: ComissaoPage,
});

function ComissaoPage() {
  const [valorVenda, setValorVenda] = useState<string>("");

  const parsedValor = useMemo(() => {
    const numericValue = valorVenda.replace(/\D/g, "");
    return numericValue ? parseInt(numericValue) / 100 : 0;
  }, [valorVenda]);

  const handleValorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "");
    setValorVenda(value);
  };

  const faixas = [
    { label: "Bronze", limite: 1200.97, porcentagem: 35, color: "amber" },
    { label: "Prata", limite: 2401.94, porcentagem: 40, color: "slate" },
    { label: "Ouro", limite: 3002.42, porcentagem: 45, color: "yellow" },
  ];

  const calculoComissao = useMemo(() => {
    const v = parsedValor;
    let comissao = 0;
    let faixaAtual = faixas[0];
    let proximaFaixa = null;

    if (v <= faixas[0].limite) {
      comissao = v * (faixas[0].porcentagem / 100);
      faixaAtual = faixas[0];
      proximaFaixa = faixas[1];
    } else if (v <= faixas[1].limite) {
      comissao = v * (faixas[1].porcentagem / 100);
      faixaAtual = faixas[1];
      proximaFaixa = faixas[2];
    } else {
      comissao = v * (faixas[2].porcentagem / 100);
      faixaAtual = faixas[2];
      proximaFaixa = null;
    }

    const progressoParaProxima = proximaFaixa 
      ? Math.min(100, (v / proximaFaixa.limite) * 100)
      : 100;

    return { total: comissao, faixa: faixaAtual, proxima: proximaFaixa, progresso: progressoParaProxima };
  }, [parsedValor]);

  return (
    <div className="space-y-8 pb-12 animate-in fade-in duration-700">
      <div className="flex flex-col gap-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest w-fit">
          <Calculator className="h-3 w-3 fill-current" /> Simulador de Ganhos
        </div>
        <h1 className="text-3xl md:text-4xl font-black tracking-tight text-slate-900 leading-none">
          Calculadora de <span className="text-primary italic">Comissão</span>
        </h1>
        <p className="text-muted-foreground text-sm font-medium">
          Descubra quanto você vai lucrar com base no seu volume de vendas.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Painel de Entrada */}
        <Card className="lg:col-span-4 rounded-[2.5rem] border-none shadow-2xl shadow-slate-200/50 overflow-hidden bg-white">
          <div className="bg-slate-900 p-8 text-white relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full -mr-16 -mt-16 blur-3xl" />
            <div className="relative z-10 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-black uppercase tracking-tight leading-none">Vendas Totais</h3>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">Valor bruto vendido</p>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="relative">
                  <span className="absolute left-6 top-1/2 -translate-y-1/2 text-2xl font-black text-white/20 italic">R$</span>
                  <Input
                    id="valor"
                    type="text"
                    placeholder="0,00"
                    className="h-20 bg-white/10 border-none rounded-[1.5rem] pl-16 text-3xl font-black text-white placeholder:text-white/10 focus-visible:ring-2 focus-visible:ring-primary/50 transition-all"
                    value={valorVenda ? (parseInt(valorVenda) / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 }) : ""}
                    onChange={handleValorChange}
                  />
                </div>
              </div>
            </div>
          </div>

          <CardContent className="p-8 space-y-8">
            <div className="space-y-6">
              <div className="p-6 rounded-[2rem] bg-slate-50 border border-slate-100 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                  <Award className="h-12 w-12 text-primary" />
                </div>
                <div className="relative z-10">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Seu Lucro Estimado</p>
                  <p className="text-4xl font-black text-slate-900 tracking-tight">{brl(calculoComissao.total)}</p>
                  <div className="flex items-center gap-2 mt-4">
                    <Badge className="bg-primary text-white font-black text-[10px] uppercase tracking-widest rounded-full px-3 py-1 border-none">
                      {calculoComissao.faixa.porcentagem}% OFF
                    </Badge>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nível {calculoComissao.faixa.label}</span>
                  </div>
                </div>
              </div>

              {calculoComissao.proxima && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest">
                    <span className="text-slate-400">Progresso para {calculoComissao.proxima.label}</span>
                    <span className="text-primary">{Math.round(calculoComissao.progresso)}%</span>
                  </div>
                  <Progress value={calculoComissao.progresso} className="h-3 rounded-full bg-slate-100" />
                  <p className="text-[10px] font-bold text-slate-400 text-center uppercase tracking-widest italic">
                    Faltam <span className="text-slate-900">{brl(calculoComissao.proxima.limite - parsedValor)}</span> para atingir <span className="text-primary">{calculoComissao.proxima.porcentagem}%</span>
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Painel de Faixas */}
        <div className="lg:col-span-8 grid gap-4 md:grid-cols-3">
          {faixas.map((faixa, index) => {
            const isAtiva = calculoComissao.faixa.label === faixa.label && parsedValor > 0;
            const isBronze = faixa.color === "amber";
            const isPrata = faixa.color === "slate";
            const isOuro = faixa.color === "yellow";

            return (
              <Card 
                key={faixa.label} 
                className={cn(
                  "relative rounded-[2rem] border-none overflow-hidden transition-all duration-500 group",
                  isAtiva 
                    ? "bg-slate-900 text-white scale-[1.02] shadow-2xl shadow-primary/20 ring-4 ring-primary/20" 
                    : "bg-white shadow-xl shadow-slate-200/40 hover:scale-[1.01]"
                )}
              >
                {isAtiva && (
                  <div className="absolute top-6 right-6">
                    <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center animate-pulse">
                      <Target className="h-5 w-5 text-white" />
                    </div>
                  </div>
                )}
                
                <CardHeader className="p-8 pb-4">
                  <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform",
                    isAtiva ? "bg-white/10" : 
                    isBronze ? "bg-amber-50 text-amber-600" :
                    isPrata ? "bg-slate-50 text-slate-600" :
                    "bg-yellow-50 text-yellow-600"
                  )}>
                    <Percent className="h-6 w-6 font-black" />
                  </div>
                  <CardTitle className="text-2xl font-black uppercase tracking-tight leading-none mb-1">
                    {faixa.label}
                  </CardTitle>
                  <CardDescription className={cn(
                    "text-[10px] font-black uppercase tracking-widest",
                    isAtiva ? "text-white/40" : "text-slate-400"
                  )}>
                    {index === 2 ? "Meta Máxima" : `Até ${brl(faixa.limite)}`}
                  </CardDescription>
                </CardHeader>

                <CardContent className="p-8 pt-4 space-y-6">
                  <div className="flex flex-col">
                    <span className="text-5xl font-black italic tracking-tighter leading-none">{faixa.porcentagem}%</span>
                    <span className={cn(
                      "text-[10px] font-bold uppercase tracking-widest mt-2",
                      isAtiva ? "text-primary" : "text-slate-400"
                    )}>
                      Comissão Bruta
                    </span>
                  </div>

                  <div className={cn(
                    "pt-6 border-t border-dashed",
                    isAtiva ? "border-white/10" : "border-slate-100"
                  )}>
                    <p className={cn(
                      "text-[9px] font-black uppercase tracking-widest mb-3",
                      isAtiva ? "text-white/40" : "text-slate-400"
                    )}>Simulação do Nível</p>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold">{brl(faixa.limite)}</span>
                      <ArrowUpRight className={cn("h-4 w-4", isAtiva ? "text-primary" : "text-slate-200")} />
                      <span className={cn("text-sm font-black", isAtiva ? "text-white" : "text-slate-900")}>
                        {brl(faixa.limite * (faixa.porcentagem / 100))}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {/* Card Informativo Inferior */}
          <Card className="md:col-span-3 rounded-[2.5rem] border-none shadow-xl shadow-slate-200/40 bg-white overflow-hidden p-8">
            <div className="flex flex-col md:flex-row gap-8 items-center">
              <div className="w-16 h-16 rounded-3xl bg-primary/10 flex items-center justify-center shrink-0">
                <Info className="h-8 w-8 text-primary" />
              </div>
              <div className="space-y-4 flex-1">
                <div>
                  <h4 className="text-lg font-black uppercase tracking-tight leading-none mb-1">Regras de Bonificação</h4>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Entenda como potencializar seus ganhos</p>
                </div>
                <div className="grid md:grid-cols-3 gap-6 text-[11px] font-bold text-slate-600">
                  <div className="flex gap-3">
                    <div className="h-5 w-5 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px] shrink-0">1</div>
                    <p>A comissão é calculada sobre o <span className="text-slate-900">valor total bruto</span> das vendas realizadas no período.</p>
                  </div>
                  <div className="flex gap-3">
                    <div className="h-5 w-5 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px] shrink-0">2</div>
                    <p>Ao atingir o limite de uma faixa, o novo percentual é aplicado <span className="text-slate-900">sobre o valor total</span>.</p>
                  </div>
                  <div className="flex gap-3">
                    <div className="h-5 w-5 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px] shrink-0">3</div>
                    <p>O pagamento das comissões ocorre conforme o <span className="text-slate-900">fechamento do acerto</span> com a sacoleira.</p>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

