import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Ruler, Plus, Pencil, Trash2, Search, Loader2, ListFilter, LayoutGrid, List } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/tamanhos")({
  component: TamanhosPage,
});

type Tamanho = {
  id: string;
  tam_nome: string;
  tam_descricao: string | null;
  created_at: string;
};

function TamanhosPage() {
  const [tamanhos, setTamanhos] = useState<Tamanho[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpenConfirm, setIsDeleteDialogOpenConfirm] = useState(false);
  const [selectedTamanho, setSelectedTamanho] = useState<Tamanho | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const itemsPerPage = 12;

  const [formData, setFormData] = useState({ tam_nome: "", tam_descricao: "" });
  const [submitting, setSubmitting] = useState(false);

  const fetchTamanhos = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("tab_tamanhos")
        .select("*")
        .order("tam_nome");

      if (error) throw error;
      setTamanhos(data || []);
    } catch (error: any) {
      toast.error("Erro ao carregar tamanhos: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTamanhos();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.tam_nome.trim()) {
      return toast.error("O nome do tamanho é obrigatório");
    }

    try {
      setSubmitting(true);
      const data = {
        tam_nome: formData.tam_nome.toUpperCase(),
        tam_descricao: formData.tam_descricao,
      };

      if (selectedTamanho) {
        const { error } = await supabase
          .from("tab_tamanhos")
          .update(data)
          .eq("id", selectedTamanho.id);
        if (error) throw error;
        toast.success("Tamanho atualizado com sucesso");
      } else {
        const { error } = await supabase
          .from("tab_tamanhos")
          .insert([data]);
        if (error) throw error;
        toast.success("Tamanho criado com sucesso");
      }
      setIsDialogOpen(false);
      fetchTamanhos();
    } catch (error: any) {
      toast.error("Erro ao salvar tamanho: " + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedTamanho) return;
    try {
      setSubmitting(true);
      
      // Verificar se existem produtos vinculados
      const { count, error: countError } = await supabase
        .from("tab_produtos")
        .select("*", { count: 'exact', head: true })
        .eq("pro_tamanho_id", selectedTamanho.id);

      if (countError) throw countError;

      if (count && count > 0) {
        toast.error(`Não é possível excluir: existem ${count} produto(s) vinculados a este tamanho.`);
        setIsDeleteDialogOpenConfirm(false);
        return;
      }

      const { error } = await supabase
        .from("tab_tamanhos")
        .delete()
        .eq("id", selectedTamanho.id);
      if (error) throw error;
      toast.success("Tamanho excluído com sucesso");
      setIsDeleteDialogOpenConfirm(false);
      fetchTamanhos();
    } catch (error: any) {
      if (error.message?.includes("violates foreign key constraint") || error.code === "23503") {
        toast.error("Este tamanho não pode ser excluído pois está vinculado a outros registros.");
      } else {
        toast.error("Erro ao excluir tamanho: " + error.message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const openAddDialog = () => {
    setSelectedTamanho(null);
    setFormData({ tam_nome: "", tam_descricao: "" });
    setIsDialogOpen(true);
  };

  const openEditDialog = (tamanho: Tamanho) => {
    setSelectedTamanho(tamanho);
    setFormData({
      tam_nome: tamanho.tam_nome,
      tam_descricao: tamanho.tam_descricao || "",
    });
    setIsDialogOpen(true);
  };

  const filteredTamanhos = tamanhos.filter((tam) => {
    const search = searchTerm.toLowerCase();
    return (
      tam.tam_nome.toLowerCase().includes(search) ||
      (tam.tam_descricao && tam.tam_descricao.toLowerCase().includes(search))
    );
  });

  const totalPages = Math.ceil(filteredTamanhos.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedTamanhos = filteredTamanhos.slice(startIndex, startIndex + itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8 space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <PageHeader
            title="Gestão de Tamanhos"
            description="Cadastre e organize as grades de tamanhos para seus produtos."
          />
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="px-3 py-1 text-xs font-semibold bg-primary/10 text-primary border-none">
              {tamanhos.length} {tamanhos.length === 1 ? 'Tamanho' : 'Tamanhos'} no sistema
            </Badge>
          </div>
        </div>
        <Button 
          onClick={openAddDialog} 
          className="bg-primary hover:bg-primary/90 text-white font-bold px-6 py-6 rounded-2xl shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <Plus className="mr-2 h-5 w-5" /> Adicionar Tamanho
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        <Card className="md:col-span-12 border-none bg-background/50 backdrop-blur-sm shadow-none">
          <CardContent className="p-0">
            <div className="flex flex-col sm:flex-row items-center gap-4 bg-card/40 p-3 rounded-2xl border border-border/50">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Pesquisar tamanhos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value.toUpperCase())}
                  className="pl-10 h-11 bg-transparent border-none focus-visible:ring-0 text-base"
                />
              </div>
              <div className="h-8 w-[1px] bg-border/50 hidden sm:block" />
              <Tabs value={viewMode} onValueChange={(v: any) => setViewMode(v)} className="w-full sm:w-auto">
                <TabsList className="grid grid-cols-2 w-full h-11 bg-muted/50 p-1 rounded-xl">
                  <TabsTrigger value="list" className="rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm">
                    <List className="h-4 w-4 mr-2" /> Listagem
                  </TabsTrigger>
                  <TabsTrigger value="grid" className="rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm">
                    <LayoutGrid className="h-4 w-4 mr-2" /> Grade
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="md:col-span-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Card key={i} className="animate-pulse h-32" />
            ))}
          </div>
        ) : paginatedTamanhos.length === 0 ? (
          <Card className="md:col-span-12 py-20 bg-muted/20 border-dashed border-2 flex flex-col items-center justify-center text-center">
            <div className="bg-muted/30 p-6 rounded-full mb-4">
              <Ruler className="h-12 w-12 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-bold text-foreground">Nenhum tamanho encontrado</h3>
            <p className="text-muted-foreground max-w-xs mt-2">
              Não encontramos resultados para sua busca ou ainda não existem tamanhos cadastrados.
            </p>
            <Button variant="outline" className="mt-6 rounded-xl" onClick={() => setSearchTerm("")}>
              Limpar Filtros
            </Button>
          </Card>
        ) : viewMode === "grid" ? (
          <div className="md:col-span-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {paginatedTamanhos.map((tam) => (
              <Card 
                key={tam.id} 
                className="group relative overflow-hidden hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 border-border/50 bg-card/60 backdrop-blur-sm"
              >
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="bg-primary/5 p-3 rounded-2xl group-hover:bg-primary/10 transition-colors">
                      <Ruler className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-full text-blue-500 hover:bg-blue-50"
                        onClick={() => openEditDialog(tam)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-full text-red-500 hover:bg-red-50"
                        onClick={() => { setSelectedTamanho(tam); setIsDeleteDialogOpenConfirm(true); }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <h3 className="text-2xl font-black text-foreground mb-1">{tam.tam_nome}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-2 italic min-h-[2.5rem]">
                    {tam.tam_descricao || "Sem descrição cadastrada"}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="md:col-span-12 border-none shadow-sm overflow-hidden bg-card/40">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead className="w-[100px] font-bold">Sigla</TableHead>
                  <TableHead className="font-bold">Descrição Completa</TableHead>
                  <TableHead className="w-[200px] text-right font-bold pr-6">Gerenciar</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedTamanhos.map((tam) => (
                  <TableRow key={tam.id} className="group hover:bg-primary/[0.02] transition-colors border-border/50">
                    <TableCell>
                      <Badge variant="outline" className="font-black text-base px-3 py-1 border-primary/20 bg-primary/5 text-primary">
                        {tam.tam_nome}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground italic">
                      {tam.tam_descricao || "—"}
                    </TableCell>
                    <TableCell className="text-right pr-4">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-xl border-blue-100 text-blue-600 hover:bg-blue-50 h-9"
                          onClick={() => openEditDialog(tam)}
                        >
                          <Pencil className="h-3.5 w-3.5 mr-2" /> Editar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-xl border-red-100 text-red-600 hover:bg-red-50 h-9"
                          onClick={() => { setSelectedTamanho(tam); setIsDeleteDialogOpenConfirm(true); }}
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-2" /> Excluir
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>

      {/* Pagination */}
      {!loading && filteredTamanhos.length > itemsPerPage && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 py-6 border-t border-dashed">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
             Mostrando <span className="text-foreground font-bold">{startIndex + 1}</span>-
            <span className="text-foreground font-bold">
              {Math.min(startIndex + itemsPerPage, filteredTamanhos.length)}
            </span>{" "}
            de <span className="text-foreground font-bold">{filteredTamanhos.length}</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="rounded-xl h-10 px-4 border-border/50"
            >
              Anterior
            </Button>
            <div className="flex items-center gap-1.5">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <Button
                  key={page}
                  variant={currentPage === page ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentPage(page)}
                  className={`h-10 w-10 p-0 rounded-xl transition-all ${
                    currentPage === page 
                      ? "shadow-lg shadow-primary/20 scale-110 border-none" 
                      : "border-border/50 hover:border-primary/50"
                  }`}
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
              className="rounded-xl h-10 px-4 border-border/50"
            >
              Próximo
            </Button>
          </div>
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[450px] p-0 overflow-hidden rounded-[2rem] border-none shadow-2xl">
          <DialogHeader className="p-8 pb-4 bg-primary text-white">
            <DialogTitle className="text-2xl font-black">
              {selectedTamanho ? "Atualizar Tamanho" : "Cadastrar Tamanho"}
            </DialogTitle>
            <DialogDescription className="text-primary-foreground/80 font-medium">
              Defina as características principais desta variação de tamanho.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSave} className="p-8 pt-6 space-y-6">
            <div className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="tam_nome" className="text-sm font-bold text-muted-foreground uppercase tracking-widest px-1">Sigla / Nome</Label>
                <Input
                  id="tam_nome"
                  placeholder="Ex: GG, P, 42..."
                  value={formData.tam_nome}
                  onChange={(e) => setFormData({ ...formData, tam_nome: e.target.value.toUpperCase().slice(0, 10) })}
                  className="rounded-2xl h-14 bg-muted/30 border-none focus-visible:ring-2 focus-visible:ring-primary text-xl font-black px-5"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="tam_descricao" className="text-sm font-bold text-muted-foreground uppercase tracking-widest px-1">Observações</Label>
                <Textarea
                  id="tam_descricao"
                  placeholder="Detalhes adicionais sobre as dimensões ou aplicação deste tamanho..."
                  value={formData.tam_descricao || ""}
                  onChange={(e) => setFormData({ ...formData, tam_descricao: e.target.value })}
                  className="rounded-2xl resize-none min-h-[120px] bg-muted/30 border-none focus-visible:ring-2 focus-visible:ring-primary italic px-5 py-4"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button 
                type="button" 
                variant="ghost" 
                onClick={() => setIsDialogOpen(false)}
                className="flex-1 rounded-2xl h-12 font-bold hover:bg-muted"
              >
                Voltar
              </Button>
              <Button 
                type="submit" 
                disabled={submitting} 
                className="flex-[2] rounded-2xl h-12 bg-primary font-bold shadow-lg shadow-primary/20"
              >
                {submitting ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                  <Plus className="mr-2 h-5 w-5" />
                )}
                {selectedTamanho ? "Salvar Alterações" : "Confirmar Cadastro"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpenConfirm} onOpenChange={setIsDeleteDialogOpenConfirm}>
        <AlertDialogContent className="rounded-[2rem] p-8 border-none shadow-2xl">
          <AlertDialogHeader className="space-y-4">
            <div className="mx-auto bg-red-50 p-4 rounded-full w-fit">
              <Trash2 className="h-8 w-8 text-red-500" />
            </div>
            <div className="text-center space-y-2">
              <AlertDialogTitle className="text-2xl font-black">Remover Tamanho?</AlertDialogTitle>
              <AlertDialogDescription className="text-base">
                Você está prestes a excluir o tamanho{" "}
                <span className="font-black text-foreground underline decoration-red-200 underline-offset-4">
                  "{selectedTamanho?.tam_nome}"
                </span>.
                <br />
                Esta ação é <span className="text-red-600 font-bold">permanente</span> e pode afetar produtos vinculados.
              </AlertDialogDescription>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-3 mt-6">
            <AlertDialogCancel className="w-full sm:w-auto flex-1 rounded-2xl h-12 font-bold border-none bg-muted hover:bg-muted/80">
              Manter Registro
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="w-full sm:w-auto flex-1 bg-red-500 hover:bg-red-600 rounded-2xl h-12 font-bold shadow-lg shadow-red-200"
              disabled={submitting}
            >
              {submitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Trash2 className="mr-2 h-5 w-5" />}
              Confirmar Exclusão
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
