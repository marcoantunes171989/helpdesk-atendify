import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { COMPANY_NAME } from "@/lib/constants";
import { 
  Shield, 
  Plus, 
  Search, 
  MoreVertical, 
  ShieldCheck,
  Pencil,
  Trash2,
  Loader2,
  CheckCircle2,
  XCircle,
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
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/cargos")({
  head: () => ({
    meta: [
      { title: `Cargos — ${COMPANY_NAME}` },
      { name: "description", content: "Gestão de cargos e permissões do sistema." },
    ],
  }),
  component: CargosPage,
});

const ALL_PERMISSIONS = [
  { id: "dashboard", label: "Dashboard" },
  { id: "vendas", label: "Vendas" },
  { id: "produtos", label: "Produtos" },
  { id: "clientes", label: "Clientes" },
  { id: "relatorios", label: "Relatórios" },
  { id: "usuarios", label: "Usuários" },
  { id: "configuracoes", label: "Configurações" },
  { id: "auditoria", label: "Auditoria" },
];

function CargosPage() {
  const queryClient = useQueryClient();
  const [busca, setBusca] = useState("");
  const [open, setOpen] = useState(false);
  const [editingCargo, setEditingCargo] = useState<any>(null);

  const { data: cargos = [], isLoading } = useQuery({
    queryKey: ["tab_cargos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tab_cargos")
        .select("*")
        .order("nome");
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (cargo: any) => {
      if (cargo.id) {
        const { error } = await supabase
          .from("tab_cargos")
          .update({ nome: cargo.nome, permissoes: cargo.permissoes })
          .eq("id", cargo.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("tab_cargos")
          .insert([{ nome: cargo.nome, permissoes: cargo.permissoes }]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tab_cargos"] });
      setOpen(false);
      setEditingCargo(null);
      toast.success("Cargo salvo com sucesso!");
    },
    onError: (error: any) => {
      toast.error("Erro ao salvar cargo: " + error.message);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tab_cargos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tab_cargos"] });
      toast.success("Cargo removido!");
    },
    onError: (error: any) => {
      toast.error("O cargo não pode ser removido pois está vinculado a usuários.");
    }
  });

  const filteredCargos = cargos.filter(c => 
    c.nome.toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <div className="space-y-8 pb-12 animate-in fade-in duration-700">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <PageHeader
          title="Gestão de Cargos"
          description="Defina os papéis e níveis de acesso dos colaboradores."
        />
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button 
              className="rounded-2xl h-12 px-6 shadow-xl shadow-primary/20 bg-primary hover:scale-[1.02] active:scale-[0.98] transition-all" 
              onClick={() => setEditingCargo(null)}
            >
              <Plus className="mr-2 h-5 w-5" /> 
              <span className="font-bold">Novo Cargo</span>
            </Button>
          </DialogTrigger>
          <CargoDialog 
            cargo={editingCargo} 
            onSave={(c) => saveMutation.mutate(c)} 
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
            onChange={(e) => setBusca(e.target.value)} 
            placeholder="Pesquisar por nome do cargo..." 
            className="pl-12 h-12 bg-background/50 border-none shadow-inner rounded-2xl text-sm font-medium"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-48 rounded-[2rem] bg-muted/20 animate-pulse border border-border/10" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredCargos.length === 0 ? (
            <div className="col-span-full py-32 flex flex-col items-center justify-center text-center">
              <div className="w-20 h-20 rounded-full bg-muted/30 flex items-center justify-center mb-6">
                <Shield className="h-10 w-10 text-muted-foreground/30" />
              </div>
              <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Nenhum cargo encontrado</h3>
              <p className="text-muted-foreground text-sm max-w-xs mt-2 font-medium">
                Comece criando um novo cargo para definir permissões.
              </p>
            </div>
          ) : filteredCargos.map((cargo) => (
            <Card 
              key={cargo.id} 
              className="group relative overflow-hidden rounded-[2rem] border-none shadow-lg hover:shadow-2xl transition-all duration-500 bg-card/50 backdrop-blur-sm"
            >
              <div className="absolute top-0 left-0 w-2 h-full bg-primary transition-all duration-500 group-hover:w-3" />
              
              <CardContent className="p-8">
                <div className="flex justify-between items-start mb-6">
                  <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-primary group-hover:scale-110 transition-transform duration-500">
                    <ShieldCheck className="h-8 w-8" />
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="rounded-xl h-10 w-10 bg-muted/20 hover:bg-muted/40"><MoreVertical className="h-5 w-5" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="rounded-2xl p-2 min-w-[160px] shadow-2xl border-none">
                      <DropdownMenuItem 
                        onClick={() => { setEditingCargo(cargo); setOpen(true); }}
                        className="rounded-xl gap-3 py-2.5 font-bold text-xs uppercase tracking-tight cursor-pointer"
                      >
                        <Pencil className="h-4 w-4 text-primary" /> Editar Cargo
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="my-2 bg-muted/40" />
                      <DropdownMenuItem 
                        onClick={() => deleteMutation.mutate(cargo.id)} 
                        className="rounded-xl gap-3 py-2.5 font-bold text-xs uppercase tracking-tight text-destructive focus:text-destructive cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4" /> Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-black text-slate-900 leading-tight group-hover:text-primary transition-colors uppercase tracking-tight">
                      {cargo.nome}
                    </h3>
                    <p className="text-[10px] font-bold text-muted-foreground mt-1 uppercase tracking-widest">
                      {Array.isArray(cargo.permissoes) ? cargo.permissoes.length : 0} Permissões Ativas
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-1.5 pt-2">
                    {Array.isArray(cargo.permissoes) && (cargo.permissoes as string[]).slice(0, 4).map((p: string) => (
                      <Badge key={p} variant="secondary" className="bg-slate-100 text-[9px] font-black uppercase px-2 py-0.5 rounded-md">
                        {p}
                      </Badge>
                    ))}
                    {Array.isArray(cargo.permissoes) && (cargo.permissoes as any[]).length > 4 && (
                      <Badge variant="secondary" className="bg-slate-100 text-[9px] font-black uppercase px-2 py-0.5 rounded-md">
                        +{(cargo.permissoes as any[]).length - 4}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function CargoDialog({ cargo, onSave, loading }: { cargo: any; onSave: (c: any) => void; loading?: boolean; }) {
  const [nome, setNome] = useState(cargo?.nome || "");
  const [permissoes, setPermissoes] = useState<string[]>(cargo?.permissoes || []);

  const togglePermission = (id: string) => {
    setPermissoes(prev => 
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const handleSubmit = () => {
    if (!nome.trim()) return toast.error("Nome do cargo é obrigatório");
    onSave({ id: cargo?.id, nome, permissoes });
  };

  return (
    <DialogContent className="rounded-[2.5rem] p-0 overflow-hidden border-none shadow-2xl max-w-2xl">
      <div className="bg-slate-900 text-white p-8 relative">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full -mr-16 -mt-16 blur-3xl" />
        <DialogHeader>
          <div className="flex items-center gap-4 relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center">
              <ShieldCheck className="h-6 w-6 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-xl font-black uppercase tracking-tight text-white leading-none mb-1">
                {cargo ? "Editar Cargo" : "Novo Cargo"}
              </DialogTitle>
              <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest">Defina o nome e as permissões de acesso</p>
            </div>
          </div>
        </DialogHeader>
      </div>
      
      <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Nome do Cargo</Label>
            <Input 
              value={nome} 
              onChange={e => setNome(e.target.value)} 
              className="h-12 rounded-2xl bg-muted/30 border-none shadow-inner font-medium text-sm" 
              placeholder="Ex: Gerente Comercial"
            />
          </div>

          <div className="space-y-4">
            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Permissões de Acesso</Label>
            <div className="grid grid-cols-2 gap-3">
              {ALL_PERMISSIONS.map((perm) => (
                <div 
                  key={perm.id}
                  onClick={() => togglePermission(perm.id)}
                  className={cn(
                    "flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer select-none",
                    permissoes.includes(perm.id) 
                      ? "bg-primary/5 border-primary/30 ring-1 ring-primary/20" 
                      : "bg-background border-border hover:border-primary/20 hover:bg-muted/30"
                  )}
                >
                  <span className={cn(
                    "text-xs font-bold uppercase tracking-tight",
                    permissoes.includes(perm.id) ? "text-primary" : "text-muted-foreground"
                  )}>
                    {perm.label}
                  </span>
                  {permissoes.includes(perm.id) ? (
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                  ) : (
                    <div className="h-4 w-4 rounded-full border border-muted-foreground/30" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <DialogFooter className="p-8 bg-muted/20 border-t border-border/10">
        <Button 
          onClick={handleSubmit} 
          disabled={loading}
          className="w-full h-12 rounded-2xl bg-primary font-black uppercase tracking-widest shadow-xl shadow-primary/20"
        >
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Confirmar e Salvar"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
