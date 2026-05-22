import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { COMPANY_NAME } from "@/lib/constants";
import { 
  UserPlus, 
  Search, 
  MoreVertical, 
  UserCircle,
  Filter,
  Shield,
  Mail,
  UserCheck,
  Calendar,
  Settings2,
  Trash2,
  Pencil,
  Loader2,
  AlertCircle
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import type { Perfil as Usuario } from "@/lib/types";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/usuarios")({
  head: () => ({
    meta: [
      { title: `Usuários — ${COMPANY_NAME}` },
      { name: "description", content: "Gestão de usuários do sistema." },
    ],
  }),
  component: UsuariosPage,
});

function UsuariosPage() {
  const queryClient = useQueryClient();
  const [busca, setBusca] = useState("");
  const [page, setPage] = useState(0);
  const pageSize = 12;
  const [open, setOpen] = useState(false);
  const [editingUsuario, setEditingUsuario] = useState<Usuario | null>(null);

  const { data: cargos = [] } = useQuery({
    queryKey: ["tab_cargos"],
    queryFn: async () => {
      const { data, error } = await supabase.from("tab_cargos").select("*").order("nome");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: { items = [], count = 0 } = {}, isLoading, isFetching } = useQuery({
    queryKey: ["tab_usuarios", busca, page],
    queryFn: async () => {
      let query = supabase.from("tab_usuarios").select("*, tab_cargos(nome)", { count: 'exact' }).order("usu_nome");
      if (busca) {
        query = query.ilike("usu_nome", `%${busca}%`);
      }
      
      const { data, error, count } = await query.range(page * pageSize, (page + 1) * pageSize - 1);
      
      if (error) throw error;
      return { items: data as Usuario[], count: count || 0 };
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (u: any) => {
      if (u.id) {
        const { error } = await supabase.from("tab_usuarios").update(u).eq("id", u.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("tab_usuarios").insert([u]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tab_usuarios"] });
      setOpen(false);
      setEditingUsuario(null);
      toast.success("Usuário salvo com sucesso!");
    },
    onError: (error: any) => {
      toast.error("Erro ao salvar usuário: " + error.message);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tab_usuarios").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tab_usuarios"] });
      toast.success("Usuário removido!");
    },
    onError: (error: any) => {
      toast.error("Erro ao remover usuário: " + error.message);
    }
  });

  const getCargoColor = (cargo: string | null) => {
    if (!cargo) return "bg-slate-100 text-slate-600 border-slate-200";
    const c = cargo.toLowerCase();
    if (c.includes("admin") || c.includes("gerente")) return "bg-primary/10 text-primary border-primary/20";
    if (c.includes("vendedor") || c.includes("comercial")) return "bg-emerald-50 text-emerald-700 border-emerald-100";
    return "bg-blue-50 text-blue-700 border-blue-100";
  };

  return (
    <div className="space-y-8 pb-12 animate-in fade-in duration-700">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <PageHeader
          title="Gestão de Usuários"
          description="Controle de acessos, cargos e permissões da equipe."
        />
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button 
              className="rounded-2xl h-12 px-6 shadow-xl shadow-primary/20 bg-primary hover:scale-[1.02] active:scale-[0.98] transition-all" 
              onClick={() => setEditingUsuario(null)}
            >
              <UserPlus className="mr-2 h-5 w-5" /> 
              <span className="font-bold">Novo Usuário</span>
            </Button>
          </DialogTrigger>
          <UsuarioDialog 
            usuario={editingUsuario} 
            cargos={cargos}
            onSave={(u) => saveMutation.mutate(u)} 
            loading={saveMutation.isPending}
          />
        </Dialog>
      </div>

      <div className="flex flex-col md:flex-row gap-4 bg-card/30 backdrop-blur-sm p-4 rounded-[2rem] border border-border/40 shadow-xl overflow-hidden relative">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-3xl" />
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/60" />
          <Input 
            value={busca} 
            onChange={(e) => { setBusca(e.target.value); setPage(0); }} 
            placeholder="Pesquisar por nome ou e-mail..." 
            className="pl-12 h-12 bg-background/50 border-none shadow-inner rounded-2xl text-sm font-medium"
          />
          {isFetching && !isLoading && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2">
              <Loader2 className="h-5 w-5 animate-spin text-primary/40" />
            </div>
          )}
        </div>
        <div className="flex items-center gap-3 px-2">
          <Badge variant="outline" className="h-10 px-4 rounded-xl border-dashed border-primary/30 text-primary font-bold bg-primary/5">
            {count} Usuários Registrados
          </Badge>
          {busca && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setBusca("")}
              className="h-10 rounded-xl text-xs font-bold uppercase tracking-tight text-muted-foreground"
            >
              Limpar Filtro
            </Button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-48 rounded-[2rem] bg-muted/20 animate-pulse border border-border/10" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {items.length === 0 ? (
              <div className="col-span-full py-32 flex flex-col items-center justify-center text-center">
                <div className="w-20 h-20 rounded-full bg-muted/30 flex items-center justify-center mb-6">
                  <UserCircle className="h-10 w-10 text-muted-foreground/30" />
                </div>
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Nenhum usuário encontrado</h3>
                <p className="text-muted-foreground text-sm max-w-xs mt-2 font-medium">
                  Não existem registros que coincidam com sua busca ou nenhum usuário foi cadastrado ainda.
                </p>
                <Button variant="link" className="mt-4 font-bold text-primary" onClick={() => setBusca("")}>
                  Ver todos os usuários
                </Button>
              </div>
            ) : items.map((u) => (
              <Card 
                key={u.id} 
                className="group relative overflow-hidden rounded-[2rem] border-none shadow-lg hover:shadow-2xl transition-all duration-500 bg-card/50 backdrop-blur-sm"
              >
                <div className={cn(
                  "absolute top-0 left-0 w-2 h-full transition-all duration-500 group-hover:w-3",
                  u.usu_cargo?.toLowerCase().includes("admin") ? "bg-primary" : "bg-emerald-500"
                )} />
                
                <CardContent className="p-8">
                  <div className="flex justify-between items-start mb-6">
                    <div className="relative">
                      <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-primary group-hover:scale-110 transition-transform duration-500">
                        <UserCircle className="h-10 w-10" />
                      </div>
                      <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-background border-2 border-primary/20 flex items-center justify-center">
                        <UserCheck className="h-3 w-3 text-emerald-500" />
                      </div>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="rounded-xl h-10 w-10 bg-muted/20 hover:bg-muted/40"><MoreVertical className="h-5 w-5" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="rounded-2xl p-2 min-w-[160px] shadow-2xl border-none">
                        <DropdownMenuItem 
                          onClick={() => { setEditingUsuario(u); setOpen(true); }}
                          className="rounded-xl gap-3 py-2.5 font-bold text-xs uppercase tracking-tight cursor-pointer"
                        >
                          <Pencil className="h-4 w-4 text-primary" /> Editar Perfil
                        </DropdownMenuItem>
                        <DropdownMenuItem className="rounded-xl gap-3 py-2.5 font-bold text-xs uppercase tracking-tight cursor-pointer">
                          <Shield className="h-4 w-4 text-blue-500" /> Permissões
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="my-2 bg-muted/40" />
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <DropdownMenuItem 
                              onSelect={(e) => e.preventDefault()}
                              className="rounded-xl gap-3 py-2.5 font-bold text-xs uppercase tracking-tight text-destructive focus:text-destructive cursor-pointer"
                            >
                              <Trash2 className="h-4 w-4" /> Excluir Registro
                            </DropdownMenuItem>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="rounded-[2rem]">
                            <AlertDialogHeader>
                              <AlertDialogTitle>Tem certeza absoluta?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta ação não pode ser desfeita. Isso excluirá permanentemente o usuário <strong>{u.usu_nome}</strong> e removerá seus dados de nossos servidores.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="rounded-xl font-bold uppercase tracking-tight text-xs">Cancelar</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => deleteMutation.mutate(u.id)}
                                className="rounded-xl bg-destructive hover:bg-destructive/90 font-bold uppercase tracking-tight text-xs"
                              >
                                Sim, excluir usuário
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-black text-slate-900 leading-tight group-hover:text-primary transition-colors">{u.usu_nome}</h3>
                      <div className="flex items-center gap-2 mt-1.5 text-muted-foreground">
                        <Mail className="h-3 w-3" />
                        <p className="text-[11px] font-bold truncate tracking-tight">{u.usu_email}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-2">
                      <Badge 
                        variant="outline" 
                        className={cn(
                          "font-black text-[9px] uppercase tracking-[0.1em] px-3 py-1 rounded-full border shadow-sm",
                          getCargoColor((u as any).tab_cargos?.nome)
                        )}
                      >
                        {(u as any).tab_cargos?.nome || "Sem cargo"}
                      </Badge>
                      <Badge variant="outline" className="bg-slate-50 text-slate-500 border-slate-200 font-bold text-[9px] uppercase tracking-tighter px-3 py-1 rounded-full">
                        <Calendar className="h-2.5 w-2.5 mr-1" /> Ativo
                      </Badge>
                    </div>
                  </div>
                </CardContent>

                <div className="px-8 pb-6 pt-0 flex items-center justify-between text-[10px] text-muted-foreground/60 font-medium">
                  <span className="flex items-center gap-1">
                    <Shield className="h-3 w-3" /> Nível de Acesso
                  </span>
                  <span className="font-bold text-slate-400">ID: {u.id.split("-")[0]}...</span>
                </div>
              </Card>
            ))}
          </div>

          {count > pageSize && (
            <div className="flex flex-col md:flex-row items-center justify-center gap-6 mt-12 bg-card/30 p-4 rounded-3xl border border-border/20 shadow-lg">
              <Button 
                variant="outline" 
                size="lg" 
                disabled={page === 0 || isLoading} 
                onClick={() => setPage(p => p - 1)}
                className="rounded-2xl px-6 h-12 font-black text-xs uppercase tracking-widest hover:bg-primary hover:text-white transition-all w-full md:w-auto"
              >
                Anterior
              </Button>
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Página</span>
                <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white font-black text-sm shadow-lg shadow-primary/20">
                  {page + 1}
                </div>
                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">de {Math.ceil(count / pageSize)}</span>
              </div>
              <Button 
                variant="outline" 
                size="lg" 
                disabled={(page + 1) * pageSize >= count || isLoading} 
                onClick={() => setPage(p => p + 1)}
                className="rounded-2xl px-6 h-12 font-black text-xs uppercase tracking-widest hover:bg-primary hover:text-white transition-all w-full md:w-auto"
              >
                Próxima
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function UsuarioDialog({ usuario, cargos, onSave, loading }: { usuario: Usuario | null; cargos: any[]; onSave: (u: any) => void; loading?: boolean; }) {
  const [form, setForm] = useState({
    id: usuario?.id,
    usu_nome: usuario?.usu_nome || "",
    usu_email: usuario?.usu_email || "",
    usu_cargo_id: usuario?.usu_cargo_id || "",
  });

  const handleSubmit = () => {
    if (!form.usu_nome.trim()) return toast.error("Nome é obrigatório");
    if (form.usu_nome.trim().length < 3) return toast.error("Nome deve ter pelo menos 3 caracteres");
    if (!form.usu_email.trim()) return toast.error("E-mail é obrigatório");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.usu_email)) return toast.error("E-mail inválido");
    if (!form.usu_cargo_id) return toast.error("Cargo é obrigatório");
    onSave(form);
  };

  return (
    <DialogContent className="rounded-[2.5rem] p-0 overflow-hidden border-none shadow-2xl max-w-lg">
      <div className="bg-slate-900 text-white p-8 relative">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full -mr-16 -mt-16 blur-3xl" />
        <DialogHeader>
          <div className="flex items-center gap-4 relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center">
              <UserCircle className="h-6 w-6 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-xl font-black uppercase tracking-tight text-white leading-none mb-1">
                {usuario ? "Editar Usuário" : "Cadastrar Usuário"}
              </DialogTitle>
              <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest">Preencha as credenciais de acesso</p>
            </div>
          </div>
        </DialogHeader>
      </div>
      
      <div className="p-8 space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Nome Completo</Label>
            <div className="relative">
              <UserCircle className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
              <Input 
                value={form.usu_nome} 
                onChange={e => setForm({...form, usu_nome: e.target.value})} 
                className="h-12 pl-11 rounded-2xl bg-muted/30 border-none shadow-inner font-medium text-sm" 
                placeholder="Ex: João da Silva"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">E-mail Corporativo</Label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
              <Input 
                value={form.usu_email} 
                onChange={e => setForm({...form, usu_email: e.target.value})} 
                className="h-12 pl-11 rounded-2xl bg-muted/30 border-none shadow-inner font-medium text-sm" 
                placeholder="joao@empresa.com"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Cargo / Função</Label>
            <Select value={form.usu_cargo_id || ""} onValueChange={(v) => setForm({...form, usu_cargo_id: v})}>
              <SelectTrigger className="h-12 rounded-2xl bg-muted/30 border-none shadow-inner text-sm font-medium">
                <SelectValue placeholder="Selecione o cargo" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl border-none shadow-2xl p-2">
                {cargos.length > 0 ? cargos.map(c => (
                  <SelectItem key={c.id} value={c.id} className="rounded-xl py-2.5 font-bold text-xs uppercase tracking-tight cursor-pointer">
                    {c.nome}
                  </SelectItem>
                )) : (
                  <div className="p-4 text-center">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase italic">Carregando cargos...</p>
                  </div>
                )}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
          <p className="text-[10px] text-amber-700 font-bold leading-relaxed uppercase tracking-tight">
            A senha inicial será enviada para o e-mail cadastrado ou deverá ser definida no primeiro login.
          </p>
        </div>
      </div>

      <DialogFooter className="bg-muted/10 p-6 flex-row gap-4">
        <Button 
          disabled={loading}
          onClick={handleSubmit} 
          className="flex-1 h-14 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-primary/20 bg-primary hover:scale-[1.02] active:scale-[0.98] transition-all"
        >
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : usuario ? "Atualizar Perfil" : "Criar Novo Acesso"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
