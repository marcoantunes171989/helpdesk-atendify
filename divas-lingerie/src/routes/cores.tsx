import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Palette, Plus, Pencil, Trash2, Search, Loader2, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

export const Route = createFileRoute("/cores")({
  component: CoresPage,
});

type Cor = {
  id: string;
  cor_nome: string;
  cor_descricao: string | null;
  created_at: string;
};

function CoresPage() {
  const [cores, setCores] = useState<Cor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpenConfirm, setIsDeleteDialogOpenConfirm] = useState(false);
  const [isProductsDialogOpen, setIsProductsDialogOpen] = useState(false);
  const [productsUsingCor, setProductsUsingCor] = useState<{ pro_nome: string, pro_codigo: string | null }[]>([]);
  const [selectedCor, setSelectedCor] = useState<Cor | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [formData, setFormData] = useState({ cor_nome: "", cor_descricao: "" });
  const [submitting, setSubmitting] = useState(false);

  const fetchCores = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("tab_cores")
        .select("*")
        .order("cor_nome");

      if (error) throw error;
      setCores(data || []);
    } catch (error: any) {
      toast.error("Erro ao carregar cores: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCores();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.cor_nome.trim()) {
      return toast.error("O nome da cor é obrigatório");
    }

    try {
      setSubmitting(true);
      const data = {
        cor_nome: formData.cor_nome.toUpperCase(),
        cor_descricao: formData.cor_descricao,
      };

      if (selectedCor) {
        const { error } = await supabase
          .from("tab_cores")
          .update(data)
          .eq("id", selectedCor.id);
        if (error) throw error;
        toast.success("Cor atualizada com sucesso");
      } else {
        const { error } = await supabase
          .from("tab_cores")
          .insert([data]);
        if (error) throw error;
        toast.success("Cor criada com sucesso");
      }
      setIsDialogOpen(false);
      fetchCores();
    } catch (error: any) {
      toast.error("Erro ao salvar cor: " + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const fetchProductsUsingCor = async (corId: string) => {
    try {
      const { data, error } = await supabase
        .from("tab_produtos")
        .select("pro_descricao, pro_codigo")
        .eq("pro_cor_id", corId);

      if (error) throw error;
      setProductsUsingCor((data || []).map(p => ({ 
        pro_nome: p.pro_descricao || "Produto sem descrição", 
        pro_codigo: p.pro_codigo 
      })));
      setIsProductsDialogOpen(true);
    } catch (error: any) {
      toast.error("Erro ao carregar produtos: " + error.message);
    }
  };

  const handleDelete = async () => {
    if (!selectedCor) return;
    try {
      setSubmitting(true);
      
      // First check if this color is being used by any product
      const { count, error: countError } = await supabase
        .from("tab_produtos")
        .select("*", { count: 'exact', head: true })
        .eq("pro_cor_id", selectedCor.id);

      if (countError) throw countError;

      if (count && count > 0) {
        toast.error(`Não é possível excluir esta cor pois ela está vinculada a ${count} produto(s).`, {
          action: {
            label: "Ver Produtos",
            onClick: () => fetchProductsUsingCor(selectedCor.id)
          },
          duration: 5000,
        });
        setIsDeleteDialogOpenConfirm(false);
        return;
      }

      const { error } = await supabase
        .from("tab_cores")
        .delete()
        .eq("id", selectedCor.id);
        
      if (error) throw error;
      
      toast.success("Cor excluída com sucesso");
      setIsDeleteDialogOpenConfirm(false);
      fetchCores();
    } catch (error: any) {
      if (error.code === "23503") {
        toast.error("Esta cor não pode ser excluída pois está vinculada a um produto.", {
          action: {
            label: "Ver Produtos",
            onClick: () => fetchProductsUsingCor(selectedCor.id)
          }
        });
      } else {
        toast.error("Erro ao excluir cor: " + error.message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const openAddDialog = () => {
    setSelectedCor(null);
    setFormData({ cor_nome: "", cor_descricao: "" });
    setIsDialogOpen(true);
  };

  const openEditDialog = (cor: Cor) => {
    setSelectedCor(cor);
    setFormData({
      cor_nome: cor.cor_nome,
      cor_descricao: cor.cor_descricao || "",
    });
    setIsDialogOpen(true);
  };

  const filteredCores = cores.filter((cor) => {
    const search = searchTerm.toLowerCase();
    return (
      cor.cor_nome.toLowerCase().includes(search) ||
      (cor.cor_descricao && cor.cor_descricao.toLowerCase().includes(search))
    );
  });

  const totalPages = Math.ceil(filteredCores.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedCores = filteredCores.slice(startIndex, startIndex + itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <PageHeader
            title="Cores"
            description="Gerencie as variações de cores dos produtos."
          />
          <span className="text-xs font-medium text-muted-foreground ml-1">
            Total de registros: <span className="text-primary font-bold">{cores.length}</span>
          </span>
        </div>
        <Button onClick={openAddDialog} className="w-full sm:w-auto rounded-full bg-primary hover:bg-primary/90 h-11 sm:h-10">
          <Plus className="mr-2 h-4 w-4" /> Nova Cor
        </Button>
      </div>

      <div className="flex items-center space-x-2 bg-card p-1 rounded-2xl border shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Pesquisar por nome ou descrição..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value.toUpperCase().replace(/[^A-Z0-9 ]/g, ""))}
            className="pl-9 border-none bg-transparent focus-visible:ring-0 rounded-xl"
          />
        </div>
      </div>

      <div className="rounded-2xl border shadow-sm overflow-hidden bg-card">
        {/* Mobile View: Cards */}
        <div className="block sm:hidden divide-y divide-border">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="p-4 space-y-3 animate-pulse">
                <div className="h-4 w-1/3 bg-muted rounded" />
                <div className="h-3 w-1/2 bg-muted rounded" />
                <div className="flex justify-end gap-2">
                  <div className="h-8 w-20 bg-muted rounded" />
                  <div className="h-8 w-20 bg-muted rounded" />
                </div>
              </div>
            ))
          ) : paginatedCores.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center justify-center opacity-40">
              <Palette className="h-12 w-12 text-slate-300 mb-2" />
              <p className="text-slate-500 font-medium italic">
                {searchTerm ? "Nenhuma cor encontrada." : "Sem cores cadastradas."}
              </p>
            </div>
          ) : (
            paginatedCores.map((cor) => (
              <div key={cor.id} className="p-4 space-y-3 active:bg-muted/50 transition-colors">
                <div className="space-y-1">
                  <h3 className="font-bold text-foreground leading-tight">{cor.cor_nome}</h3>
                  <p className="text-xs text-muted-foreground italic truncate">{cor.cor_descricao || "Sem descrição"}</p>
                </div>
                
                <div className="flex justify-end gap-2 pt-1">
                  <Button variant="outline" size="sm" className="h-9 px-3 rounded-xl border-blue-100 text-blue-600 font-bold text-xs" onClick={() => openEditDialog(cor)}>
                    <Pencil className="h-3.5 w-3.5 mr-1.5" /> Editar
                  </Button>
                  <Button variant="outline" size="sm" className="h-9 px-3 rounded-xl border-red-100 text-red-600 font-bold text-xs" onClick={() => { setSelectedCor(cor); setIsDeleteDialogOpenConfirm(true); }}>
                    <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Excluir
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop View: Table */}
        <div className="hidden sm:block">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="font-bold">Cor</TableHead>
                <TableHead className="font-bold">Descrição</TableHead>
                <TableHead className="text-right font-bold">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><div className="h-4 w-32 bg-muted animate-pulse rounded" /></TableCell>
                    <TableCell><div className="h-4 w-64 bg-muted animate-pulse rounded" /></TableCell>
                    <TableCell><div className="h-8 w-16 ml-auto bg-muted animate-pulse rounded" /></TableCell>
                  </TableRow>
                ))
              ) : paginatedCores.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="h-64 text-center">
                    <div className="flex flex-col items-center justify-center space-y-2 opacity-40">
                      <Palette className="h-12 w-12 text-slate-300" />
                      <p className="text-slate-500 font-medium italic">
                        {searchTerm ? "Nenhuma cor encontrada." : "Sem cores cadastradas."}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedCores.map((cor) => (
                  <TableRow key={cor.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="font-bold">{cor.cor_nome}</TableCell>
                    <TableCell className="max-w-md truncate text-muted-foreground italic">
                      {cor.cor_descricao || "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-full text-blue-500 hover:text-blue-600 hover:bg-blue-50"
                          onClick={() => openEditDialog(cor)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-full text-red-500 hover:text-red-600 hover:bg-red-50"
                          onClick={() => { setSelectedCor(cor); setIsDeleteDialogOpenConfirm(true); }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Pagination */}
      {!loading && filteredCores.length > itemsPerPage && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-dashed">
          <p className="text-sm text-muted-foreground font-medium">
            Mostrando <span className="text-foreground font-bold">{startIndex + 1}</span> a{" "}
            <span className="text-foreground font-bold">
              {Math.min(startIndex + itemsPerPage, filteredCores.length)}
            </span>{" "}
            de <span className="text-foreground font-bold">{filteredCores.length}</span> registros
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="rounded-xl h-9"
            >
              Anterior
            </Button>
            <div className="flex items-center gap-1 mx-2">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <Button
                  key={page}
                  variant={currentPage === page ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setCurrentPage(page)}
                  className={`h-8 w-8 p-0 rounded-lg ${currentPage === page ? "shadow-md shadow-primary/20" : ""}`}
                >
                  {page}
                </Button>
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="rounded-xl h-9"
            >
              Próximo
            </Button>
          </div>
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px] rounded-3xl">
          <form onSubmit={handleSave} onKeyDown={(e) => {
            if (e.key === "Enter" && e.target instanceof HTMLInputElement) {
              e.preventDefault();
              const form = e.currentTarget;
              const index = Array.from(form.elements).indexOf(e.target);
              const next = form.elements[index + 1] as HTMLElement;
              if (next) next.focus();
            }
          }}>
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">
                {selectedCor ? "Editar Cor" : "Nova Cor"}
              </DialogTitle>
              <DialogDescription>
                Informe o nome da cor e uma descrição opcional.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="cor_nome" className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Nome da Cor</Label>
                <Input
                  id="cor_nome"
                  placeholder="Ex: VERMELHO"
                  value={formData.cor_nome}
                  onChange={(e) => setFormData({ ...formData, cor_nome: e.target.value.toUpperCase() })}
                  className="rounded-xl h-11 bg-muted/30 border-none focus-visible:ring-1 focus-visible:ring-primary font-bold"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="cor_descricao" className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Descrição (Opcional)</Label>
                <Textarea
                  id="cor_descricao"
                  placeholder="Detalhes sobre esta cor..."
                  value={formData.cor_descricao || ""}
                  onChange={(e) => setFormData({ ...formData, cor_descricao: e.target.value })}
                  className="rounded-xl resize-none min-h-[100px] bg-muted/30 border-none focus-visible:ring-1 focus-visible:ring-primary italic"
                />
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button 
                type="button" 
                variant="ghost" 
                onClick={() => setIsDialogOpen(false)}
                className="rounded-full font-bold"
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={submitting} 
                className="rounded-full bg-primary px-8 font-bold"
              >
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {selectedCor ? "Salvar" : "Criar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isProductsDialogOpen} onOpenChange={setIsProductsDialogOpen}>
        <DialogContent className="sm:max-w-[500px] rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <List className="h-5 w-5 text-primary" />
              Produtos Vinculados
            </DialogTitle>
            <DialogDescription>
              Esta cor está vinculada aos seguintes produtos e não pode ser excluída.
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="max-h-[300px] mt-4 pr-4">
            <div className="space-y-3">
              {productsUsingCor.map((product, idx) => (
                <div key={idx} className="p-3 bg-muted/30 rounded-xl flex flex-col gap-1">
                  <span className="font-bold text-sm">{product.pro_nome}</span>
                  {product.pro_codigo && (
                    <span className="text-xs text-muted-foreground">Código: {product.pro_codigo}</span>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
          
          <DialogFooter className="mt-4">
            <Button 
              onClick={() => setIsProductsDialogOpen(false)}
              className="rounded-full bg-primary font-bold w-full sm:w-auto"
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpenConfirm} onOpenChange={setIsDeleteDialogOpenConfirm}>
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-bold text-xl">Excluir Cor</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a cor{" "}
              <span className="font-black text-foreground underline decoration-red-200 underline-offset-4">
                "{selectedCor?.cor_nome}"
              </span>
              ? Esta ação não poderá ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel className="rounded-full font-bold">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-full bg-red-500 hover:bg-red-600 font-bold px-8"
              onClick={handleDelete}
              disabled={submitting}
            >
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
