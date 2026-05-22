import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  ShieldCheck, 
  Loader2, 
  Eye, 
  Calendar, 
  User, 
  Database, 
  Info, 
  Search, 
  History,
  Activity,
  ArrowRight,
  Filter,
  CheckCircle2,
  XCircle,
  AlertCircle
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/auditoria")({
  component: AuditoriaPage,
});

type LogAuditoria = {
  id: string;
  tabela_nome: string;
  registro_id: string;
  operacao: string;
  usuario_id: string | null;
  dados_antigos: any;
  dados_novos: any;
  criado_em: string | null;
};

function AuditoriaPage() {
  const [logs, setLogs] = useState<LogAuditoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<LogAuditoria | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const pageSize = 20;

  const fetchLogs = async (isNewSearch = false, targetPage?: number) => {
    try {
      setLoading(true);
      const currentPage = targetPage !== undefined ? targetPage : (isNewSearch ? 0 : page);
      
      let query = supabase
        .from("tab_auditoria")
        .select("*")
        .order("criado_em", { ascending: false });

      if (searchTerm) {
        query = query.or(`tabela_nome.ilike.%${searchTerm}%,operacao.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query
        .range(currentPage * pageSize, (currentPage + 1) * pageSize - 1);

      if (error) throw error;
      
      setLogs(data || []);
      if (isNewSearch) {
        setPage(0);
      }
      
      setHasMore((data || []).length === pageSize);
    } catch (error: any) {
      toast.error("Erro ao carregar logs: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(true);
  }, [searchTerm]);

  const openLogDetails = (log: LogAuditoria) => {
    setSelectedLog(log);
    setIsDialogOpen(true);
  };

  const getBadgeColor = (operacao: string) => {
    switch (operacao) {
      case "INSERT": return "bg-emerald-50 text-emerald-700 border-emerald-100";
      case "UPDATE": return "bg-blue-50 text-blue-700 border-blue-100";
      case "DELETE": return "bg-rose-50 text-red-700 border-rose-100";
      default: return "bg-slate-50 text-slate-700 border-slate-100";
    }
  };

  const getOpIcon = (operacao: string) => {
    switch (operacao) {
      case "INSERT": return <CheckCircle2 className="h-3 w-3" />;
      case "UPDATE": return <Activity className="h-3 w-3" />;
      case "DELETE": return <XCircle className="h-3 w-3" />;
      default: return <Info className="h-3 w-3" />;
    }
  };

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <PageHeader
          title="Auditoria de Dados"
          description="Rastreabilidade completa de todas as alterações realizadas no banco de dados."
        />
        
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Filtrar tabela ou operação..." 
            className="pl-10 h-11 bg-card/50 border-none shadow-inner rounded-xl"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <Card className="rounded-[2rem] border-none shadow-xl bg-card/50 backdrop-blur-sm overflow-hidden">
        <div className="bg-primary/5 px-6 py-3 border-b border-primary/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-primary" />
            <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Log de Eventos Recentes</span>
          </div>
          <p className="text-[10px] text-muted-foreground font-bold">
            Mostrando {logs.length} registros
          </p>
        </div>
        
        <div className="overflow-hidden">
          <div className="md:hidden space-y-4 p-4">
            {loading && logs.length === 0 ? (
              [...Array(5)].map((_, i) => (
                <div key={i} className="h-32 w-full bg-muted/20 animate-pulse rounded-2xl" />
              ))
            ) : logs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="bg-muted/30 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search className="h-6 w-6 text-muted-foreground/40" />
                </div>
                <p className="text-sm font-black text-slate-900 uppercase tracking-tight">Nenhum registro</p>
              </div>
            ) : (
              logs.map((log) => (
                <Card 
                  key={log.id} 
                  className="p-4 rounded-2xl border-border/40 shadow-sm bg-card active:scale-[0.98] transition-all overflow-hidden"
                  onClick={() => openLogDetails(log)}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-slate-900">
                        {log.criado_em ? format(new Date(log.criado_em), "dd/MM/yy HH:mm", { locale: ptBR }) : "-"}
                      </span>
                      <Badge 
                        variant="outline"
                        className={cn(
                          "w-fit mt-1 font-black text-[8px] uppercase tracking-tighter px-2 py-0.5 rounded-full border-none shadow-sm gap-1",
                          getBadgeColor(log.operacao)
                        )}
                      >
                        {getOpIcon(log.operacao)}
                        {log.operacao}
                      </Badge>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div className="flex items-center gap-3 bg-muted/30 p-2.5 rounded-xl border border-border/5">
                    <div className="w-8 h-8 rounded-lg bg-background flex items-center justify-center text-slate-500 shrink-0">
                      <Database className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-black text-slate-900 truncate uppercase">{log.tabela_nome.replace("tab_", "")}</p>
                      <p className="text-[9px] font-mono text-muted-foreground truncate">ID: {log.registro_id.split("-")[0]}...</p>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>

          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow className="hover:bg-transparent border-border/10">
                  <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-500 pl-6">Data/Hora</TableHead>
                  <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-500">Recurso Afetado</TableHead>
                  <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-500">Operação</TableHead>
                  <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-500">Responsável</TableHead>
                  <TableHead className="text-right font-black text-[10px] uppercase tracking-widest text-slate-500 pr-6">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-40 text-center">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary opacity-40" />
                      <p className="text-xs font-bold text-muted-foreground mt-4 uppercase tracking-widest">Carregando auditoria...</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log) => (
                    <TableRow key={log.id} className="hover:bg-primary/[0.02] transition-colors border-border/10">
                      <TableCell className="pl-6">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-sm font-bold text-slate-900">
                            {log.criado_em ? format(new Date(log.criado_em), "dd/MM/yyyy", { locale: ptBR }) : "-"}
                          </span>
                          <span className="text-[10px] font-medium text-muted-foreground">
                            {log.criado_em ? format(new Date(log.criado_em), "HH:mm:ss", { locale: ptBR }) : "-"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500">
                            <Database className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-sm font-black text-slate-900 leading-none mb-1">{log.tabela_nome.replace("tab_", "").toUpperCase()}</p>
                            <p className="text-[10px] font-mono text-muted-foreground">ID: {log.registro_id.split("-")[0]}...</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline"
                          className={cn(
                            "font-black text-[9px] uppercase tracking-tighter px-2 py-0.5 rounded-full border-none shadow-sm gap-1.5",
                            getBadgeColor(log.operacao)
                          )}
                        >
                          {getOpIcon(log.operacao)}
                          {log.operacao}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="h-3 w-3 text-primary" />
                          </div>
                          <span className="text-xs font-bold text-slate-600 truncate max-w-[150px]">
                            {log.usuario_id?.split("-")[0] || "Sistema/API"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 rounded-xl hover:bg-primary/10 hover:text-primary transition-all"
                          onClick={() => openLogDetails(log)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
        
        <div className="p-4 border-t border-border/10 bg-muted/5 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
            Página {page + 1}
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 md:flex-initial h-10 rounded-xl font-black uppercase tracking-widest text-[10px]"
              onClick={() => {
                const newPage = Math.max(0, page - 1);
                setPage(newPage);
                fetchLogs(false, newPage);
              }}
              disabled={loading || page === 0}
            >
              Anterior
            </Button>
            <Button
              variant="default"
              size="sm"
              className="flex-1 md:flex-initial h-10 rounded-xl font-black uppercase tracking-widest text-[10px] bg-primary text-primary-foreground hover:opacity-90"
              onClick={() => {
                const newPage = page + 1;
                setPage(newPage);
                fetchLogs(false, newPage);
              }}
              disabled={loading || !hasMore}
            >
              {loading ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : "Próxima"}
            </Button>
          </div>
        </div>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[90vw] md:max-w-[900px] p-0 rounded-2xl md:rounded-[2.5rem] overflow-hidden border-none shadow-2xl max-h-[92vh] flex flex-col">
          <div className="bg-slate-900 text-white p-5 md:p-6 shrink-0">
            <DialogHeader>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3 md:gap-4">
                  <div className="w-10 h-10 md:w-12 md:h-12 bg-white/10 rounded-xl md:rounded-2xl flex items-center justify-center shrink-0">
                    <ShieldCheck className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <DialogTitle className="text-lg md:text-xl font-black uppercase tracking-tight text-white leading-none mb-1 truncate">
                      Inspecionar Registro
                    </DialogTitle>
                    <DialogDescription className="text-white/40 text-[9px] md:text-[10px] font-bold uppercase tracking-widest truncate">
                      UUID: {selectedLog?.id}
                    </DialogDescription>
                  </div>
                </div>
                {selectedLog && (
                  <Badge className={cn("font-black text-[10px] uppercase tracking-widest h-7 px-4 rounded-xl border-none w-fit", getBadgeColor(selectedLog.operacao))}>
                    {selectedLog.operacao}
                  </Badge>
                )}
              </div>
            </DialogHeader>
          </div>

          <ScrollArea className="flex-1">
            {selectedLog && (
              <div className="p-4 md:p-8 space-y-6 md:space-y-8">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                  <div className="space-y-1">
                    <p className="text-[9px] md:text-[10px] uppercase font-black text-muted-foreground tracking-widest flex items-center gap-1.5">
                      <Calendar className="h-3 w-3 text-primary" /> Data
                    </p>
                    <p className="text-xs md:text-sm font-black text-slate-900">
                      {selectedLog.criado_em ? format(new Date(selectedLog.criado_em), "dd/MM/yyyy", { locale: ptBR }) : "-"}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[9px] md:text-[10px] uppercase font-black text-muted-foreground tracking-widest flex items-center gap-1.5">
                      <Activity className="h-3 w-3 text-primary" /> Horário
                    </p>
                    <p className="text-xs md:text-sm font-black text-slate-900">
                      {selectedLog.criado_em ? format(new Date(selectedLog.criado_em), "HH:mm:ss", { locale: ptBR }) : "-"}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[9px] md:text-[10px] uppercase font-black text-muted-foreground tracking-widest flex items-center gap-1.5">
                      <Database className="h-3 w-3 text-primary" /> Tabela
                    </p>
                    <p className="text-xs md:text-sm font-black text-slate-900 uppercase truncate">
                      {selectedLog.tabela_nome.replace("tab_", "")}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[9px] md:text-[10px] uppercase font-black text-muted-foreground tracking-widest flex items-center gap-1.5">
                      <User className="h-3 w-3 text-primary" /> Responsável
                    </p>
                    <p className="text-xs md:text-sm font-black text-slate-900 truncate" title={selectedLog.usuario_id || "N/A"}>
                      {selectedLog.usuario_id ? selectedLog.usuario_id.split("-")[0] : "SISTEMA"}
                    </p>
                  </div>
                </div>

                <Separator className="bg-border/40" />

                <div className="space-y-6">
                  <div className="flex items-center gap-2">
                    <History className="h-4 w-4 text-primary" />
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Comparativo de Dados</h4>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Lista formatada de campos */}
                    <div className="col-span-full bg-slate-50 rounded-2xl border border-slate-100 p-6">
                      <div className="grid grid-cols-1 gap-y-4">
                        {Object.keys({ ...selectedLog.dados_antigos, ...selectedLog.dados_novos }).filter(k => !['id', 'created_at', 'updated_at'].includes(k)).map(key => {
                          const oldVal = selectedLog.dados_antigos?.[key];
                          const newVal = selectedLog.dados_novos?.[key];
                          const changed = JSON.stringify(oldVal) !== JSON.stringify(newVal);
                          
                          if (!changed && selectedLog.operacao === 'UPDATE') return null;

                          return (
                            <div key={key} className="grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-4 items-center">
                              <div className="md:col-span-3">
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block truncate" title={key}>
                                  {key.replace(/^usu_|^tab_/, '')}
                                </span>
                              </div>
                              <div className="md:col-span-9 flex flex-col md:flex-row items-start md:items-center gap-2 md:gap-4">
                                {selectedLog.operacao !== 'INSERT' && (
                                  <div className="flex-1 w-full p-2.5 rounded-xl bg-red-50/50 border border-red-100/50 text-xs font-medium text-red-600 line-through truncate opacity-60">
                                    {oldVal !== undefined ? (typeof oldVal === 'object' ? JSON.stringify(oldVal) : String(oldVal)) : '-'}
                                  </div>
                                )}
                                {selectedLog.operacao === 'UPDATE' && <ArrowRight className="h-3 w-3 text-slate-300 shrink-0 hidden md:block" />}
                                {selectedLog.operacao !== 'DELETE' && (
                                  <div className={cn(
                                    "flex-1 w-full p-2.5 rounded-xl border text-xs font-bold truncate",
                                    changed ? "bg-emerald-50 border-emerald-100 text-emerald-700 shadow-sm shadow-emerald-500/5" : "bg-slate-100/50 border-slate-200 text-slate-600"
                                  )}>
                                    {newVal !== undefined ? (typeof newVal === 'object' ? JSON.stringify(newVal) : String(newVal)) : '-'}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-2">JSON Original (Anterior)</p>
                      <div className="bg-slate-950 p-6 rounded-[2rem] border border-slate-800 shadow-2xl relative overflow-hidden">
                        <pre className="text-[10px] text-slate-300 font-mono leading-relaxed max-h-[300px] overflow-auto">
                          {selectedLog.dados_antigos ? JSON.stringify(selectedLog.dados_antigos, null, 2) : "// Sem dados"}
                        </pre>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-2">JSON Atual (Novo)</p>
                      <div className="bg-slate-950 p-6 rounded-[2rem] border border-slate-800 shadow-2xl relative overflow-hidden">
                        <pre className="text-[10px] text-slate-300 font-mono leading-relaxed max-h-[300px] overflow-auto">
                          {selectedLog.dados_novos ? JSON.stringify(selectedLog.dados_novos, null, 2) : "// Sem dados"}
                        </pre>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100 flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-xs font-black text-amber-900 uppercase tracking-tight">Nota de Segurança</p>
                    <p className="text-[11px] text-amber-700 font-medium leading-relaxed">
                      Esta auditoria é registrada automaticamente por triggers de banco de dados. Alterações em tabelas de auditoria são restritas para garantir a integridade do histórico.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </ScrollArea>

          <DialogFooter className="bg-muted/10 p-6 border-t shrink-0">
            <Button 
              type="button" 
              onClick={() => setIsDialogOpen(false)}
              className="w-full h-12 rounded-2xl font-black uppercase tracking-widest text-xs bg-slate-900 text-white shadow-xl shadow-slate-900/20 active:scale-95 transition-all"
            >
              Concluir Inspeção
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
