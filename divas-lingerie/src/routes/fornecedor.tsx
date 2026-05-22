import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { 
  Building2, 
  Search, 
  Plus, 
  Pencil, 
  Trash2, 
  Loader2, 
  MapPin, 
  MoreVertical 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/fornecedor")({
  component: FornecedorPage,
});

type Fornecedor = {
  id: string;
  for_documento: string | null;
  for_razao_social: string;
  for_fantasia: string | null;
  for_endereco: string | null;
  for_numero: string | null;
  for_bairro: string | null;
  for_cidade: string | null;
  for_estado: string | null;
  for_cep: string | null;
  for_observacao: string | null;
};

function FornecedorPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedFornecedor, setSelectedFornecedor] = useState<Fornecedor | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [fornecedorToDelete, setFornecedorToDelete] = useState<Fornecedor | null>(null);

  const [isDeleting, setIsDeleting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [dependencyError, setDependencyError] = useState<string | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    
    try {
      setSubmitting(true);
      const payload = {
        for_razao_social: (formData.get("for_razao_social") as string).toUpperCase(),
        for_fantasia: (formData.get("for_fantasia") as string)?.toUpperCase(),
        for_documento: formData.get("for_documento") as string,
        for_cep: formData.get("for_cep") as string,
        for_endereco: (formData.get("for_endereco") as string)?.toUpperCase(),
        for_numero: formData.get("for_numero") as string,
        for_bairro: (formData.get("for_bairro") as string)?.toUpperCase(),
        for_cidade: (formData.get("for_cidade") as string)?.toUpperCase(),
        for_estado: (formData.get("for_estado") as string)?.toUpperCase(),
        for_observacao: formData.get("for_observacao") as string,
      };

      if (!payload.for_razao_social) {
        toast.error("Razão Social é obrigatória");
        return;
      }

      if (selectedFornecedor) {
        const { error } = await supabase
          .from("tab_fornecedores")
          .update(payload)
          .eq("id", selectedFornecedor.id);
        if (error) throw error;
        toast.success("Fornecedor atualizado com sucesso!");
      } else {
        const { error } = await supabase
          .from("tab_fornecedores")
          .insert([payload]);
        if (error) throw error;
        toast.success("Fornecedor cadastrado com sucesso!");
      }
      setIsDialogOpen(false);
      fetchFornecedores();
    } catch (error: any) {
      toast.error("Erro ao salvar: " + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!fornecedorToDelete) return;

    try {
      setIsDeleting(true);
      setDependencyError(null);
      
      const { error } = await supabase
        .from("tab_fornecedores")
        .delete()
        .eq("id", fornecedorToDelete.id);

      if (error) {
        if (error.code === "23503") {
          setDependencyError("Este fornecedor não pode ser excluído pois possui registros vinculados no sistema (produtos ou compras).");
          return;
        }
        throw error;
      }

      toast.success("Fornecedor removido com sucesso!");
      fetchFornecedores();
      setIsDeleteDialogOpen(false);
      setFornecedorToDelete(null);
    } catch (error: any) {
      toast.error("Erro ao remover fornecedor: " + error.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const fetchFornecedores = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("tab_fornecedores")
      .select("*")
      .order("for_razao_social");
    setFornecedores((data as any) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchFornecedores();
  }, []);

  const filtered = useMemo(() => {
    return fornecedores.filter(f =>
      f.for_razao_social?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.for_fantasia?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.for_cidade?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [fornecedores, searchTerm]);

  return (
    <div className="space-y-6 pb-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border shadow-sm">
        <PageHeader title="Fornecedores" description="Gerencie seus parceiros comerciais." />
        <Button onClick={() => { setSelectedFornecedor(null); setIsDialogOpen(true); }} className="rounded-2xl bg-slate-900 hover:bg-slate-800 h-11 px-6 shadow-lg shadow-slate-900/10">
          <Plus className="w-4 h-4 mr-2" /> Novo Fornecedor
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          placeholder="Buscar por nome, fantasia ou cidade..."
          className="h-12 pl-11 rounded-2xl border-slate-200 bg-white"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full flex justify-center p-12">
            <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
          </div>
        ) : filtered.length === 0 ? (
          <Card className="col-span-full p-12 text-center rounded-3xl border-none shadow-sm bg-white/50">
            <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="font-bold text-slate-500">Nenhum fornecedor encontrado.</p>
          </Card>
        ) : (
          filtered.map((f) => (
            <Card key={f.id} className="p-6 rounded-3xl border-none shadow-sm bg-white hover:shadow-md transition-all">
              <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
                  <Building2 className="w-6 h-6" />
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => { setSelectedFornecedor(f); setIsDialogOpen(true); }}>
                    <Pencil className="w-4 h-4 text-slate-400" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 rounded-lg hover:bg-red-50 hover:text-red-600 transition-colors" 
                    onClick={() => { setFornecedorToDelete(f); setIsDeleteDialogOpen(true); }}
                  >
                    <Trash2 className="w-4 h-4 text-slate-400" />
                  </Button>
                </div>
              </div>
              <h3 className="font-black text-slate-900 leading-none mb-1">{f.for_razao_social}</h3>
              <p className="text-sm text-slate-400 font-medium mb-4">{f.for_fantasia || "Sem fantasia"}</p>
              <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <MapPin className="w-3 h-3" />
                {f.for_cidade || "Cidade não informada"} - {f.for_estado || ""}
              </div>
            </Card>
          ))
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="rounded-[2rem]">
          <form onSubmit={handleSave}>
            <DialogHeader>
              <DialogTitle className="text-xl font-black">{selectedFornecedor ? "Editar Fornecedor" : "Novo Fornecedor"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto px-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Razão Social *</Label>
                  <Input name="for_razao_social" defaultValue={selectedFornecedor?.for_razao_social} required className="uppercase" />
                </div>
                <div className="space-y-1.5">
                  <Label>Nome Fantasia</Label>
                  <Input name="for_fantasia" defaultValue={selectedFornecedor?.for_fantasia || ""} className="uppercase" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>CNPJ / CPF</Label>
                  <Input name="for_documento" defaultValue={selectedFornecedor?.for_documento || ""} />
                </div>
                <div className="space-y-1.5">
                  <Label>CEP</Label>
                  <Input name="for_cep" defaultValue={selectedFornecedor?.for_cep || ""} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-3 space-y-1.5">
                  <Label>Endereço</Label>
                  <Input name="for_endereco" defaultValue={selectedFornecedor?.for_endereco || ""} className="uppercase" />
                </div>
                <div className="space-y-1.5">
                  <Label>Número</Label>
                  <Input name="for_numero" defaultValue={selectedFornecedor?.for_numero || ""} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label>Bairro</Label>
                  <Input name="for_bairro" defaultValue={selectedFornecedor?.for_bairro || ""} className="uppercase" />
                </div>
                <div className="space-y-1.5">
                  <Label>Cidade</Label>
                  <Input name="for_cidade" defaultValue={selectedFornecedor?.for_cidade || ""} className="uppercase" />
                </div>
                <div className="space-y-1.5">
                  <Label>Estado (UF)</Label>
                  <Input name="for_estado" defaultValue={selectedFornecedor?.for_estado || ""} maxLength={2} className="uppercase" />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Observação</Label>
                <Textarea name="for_observacao" defaultValue={selectedFornecedor?.for_observacao || ""} className="resize-none" />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" className="rounded-xl" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" className="rounded-xl bg-slate-900" disabled={submitting}>
                {submitting ? "Salvando..." : "Salvar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={(open) => {
        setIsDeleteDialogOpen(open);
        if (!open) {
          setDependencyError(null);
        }
      }}>
        <AlertDialogContent className="rounded-[2rem]">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-black text-xl">
              {dependencyError ? "Exclusão Bloqueada" : "Remover Fornecedor"}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-600">
              {dependencyError ? (
                <div className="flex flex-col gap-3">
                  <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl text-amber-800 text-sm font-medium">
                    {dependencyError}
                  </div>
                  <p>Para excluir este fornecedor, você precisa primeiro remover ou alterar os registros que dependem dele.</p>
                </div>
              ) : (
                <>
                  Tem certeza que deseja remover o fornecedor <span className="font-bold text-slate-900">{fornecedorToDelete?.for_razao_social}</span>? Esta ação não pode ser desfeita.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="rounded-xl border-slate-200">
              {dependencyError ? "Fechar" : "Cancelar"}
            </AlertDialogCancel>
            {!dependencyError && (
              <AlertDialogAction 
                onClick={(e) => {
                  e.preventDefault();
                  handleDelete();
                }} 
                className="rounded-xl bg-red-600 hover:bg-red-700 text-white border-none"
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Excluindo...
                  </>
                ) : (
                  "Confirmar Exclusão"
                )}
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
