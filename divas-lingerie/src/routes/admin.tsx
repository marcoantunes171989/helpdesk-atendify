import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Database, RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/admin")({
  component: AdminPage,
});

function AdminPage() {
  const { data: testData, isLoading, error, refetch } = useQuery({
    queryKey: ["test-connection"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tab_teste_conexao")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="px-2 py-0.5 border-primary/30 bg-primary/5 text-primary font-bold uppercase tracking-wider text-[10px]">
            Sistema
          </Badge>
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Painel Admin</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20">
              <Database className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-3xl font-black uppercase tracking-tight text-foreground sm:text-4xl">
                Validação de Conexão
              </h1>
              <p className="text-sm font-medium text-muted-foreground">
                Verifique em tempo real a conexão com seu banco Supabase externo.
              </p>
            </div>
          </div>
          <button 
            onClick={() => refetch()} 
            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
            title="Atualizar dados"
          >
            <RefreshCw className={`h-5 w-5 text-slate-500 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <Card className="border-slate-200 shadow-xl rounded-[2rem] overflow-hidden">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-8">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
                Tabela: tab_teste_conexao
              </CardTitle>
              <CardDescription className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Dados extraídos diretamente do projeto gknvynbcmrtyjyyzhyov
              </CardDescription>
            </div>
            {error ? (
              <Badge variant="destructive" className="flex items-center gap-1">
                <AlertCircle className="h-3 w-3" /> Erro de Conexão
              </Badge>
            ) : (
              <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none flex items-center gap-1 font-bold">
                <CheckCircle2 className="h-3 w-3" /> Conexão Ativa
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50/30">
              <TableRow>
                <TableHead className="font-black uppercase tracking-widest text-[10px] py-4 px-8">ID</TableHead>
                <TableHead className="font-black uppercase tracking-widest text-[10px] py-4">Nome</TableHead>
                <TableHead className="font-black uppercase tracking-widest text-[10px] py-4">Descrição</TableHead>
                <TableHead className="font-black uppercase tracking-widest text-[10px] py-4 px-8 text-right">Criado em</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-32 text-center">
                    <RefreshCw className="h-8 w-8 animate-spin mx-auto text-primary/30" />
                  </TableCell>
                </TableRow>
              ) : testData?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-32 text-center text-muted-foreground italic">
                    Nenhum dado encontrado na tabela de teste.
                  </TableCell>
                </TableRow>
              ) : (
                testData?.map((item) => (
                  <TableRow key={item.id} className="hover:bg-slate-50/50 transition-colors">
                    <TableCell className="font-mono text-[10px] text-slate-400 py-4 px-8">
                      {item.id.split('-')[0]}...
                    </TableCell>
                    <TableCell className="font-bold text-slate-700">{item.nome}</TableCell>
                    <TableCell className="text-slate-500 font-medium">{item.descricao}</TableCell>
                    <TableCell className="text-right py-4 px-8 text-[11px] font-bold text-slate-400 uppercase tracking-tighter">
                      {format(new Date(item.created_at), "dd MMM yyyy, HH:mm", { locale: ptBR })}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-slate-100 bg-emerald-50/30">
          <CardContent className="p-6 flex items-start gap-4">
            <div className="h-10 w-10 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
              <CheckCircle2 className="h-6 w-6 text-emerald-600" />
            </div>
            <div>
              <h4 className="font-black uppercase tracking-tight text-emerald-900">Status da Integração</h4>
              <p className="text-sm text-emerald-700/80 leading-relaxed mt-1">
                Se os dados acima estão visíveis, significa que o Lovable está lendo corretamente do seu banco Supabase externo (ID: gknvynbcmrtyjyyzhyov).
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-100 bg-slate-50/50">
          <CardContent className="p-6 flex items-start gap-4">
            <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
              <Database className="h-6 w-6 text-slate-600" />
            </div>
            <div>
              <h4 className="font-black uppercase tracking-tight text-slate-900">Banco de Produção</h4>
              <p className="text-sm text-slate-600 leading-relaxed mt-1">
                Toda nova tabela ou registro criado a partir de agora será salvo automaticamente neste mesmo ambiente.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
