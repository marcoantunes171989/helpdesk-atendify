import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Pencil, Trash2, Search, Loader2, Tag, Info, Layers, ListChecks } from "lucide-react";
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
import { Separator } from "@/components/ui/separator";

export const Route = createFileRoute("/categorias")({
  component: CategoriasPage,
});

const DICAS_CATEGORIAS = [
  "Categorias bem definidas ajudam na organização do seu estoque.",
  "Use nomes curtos e objetivos para facilitar a leitura no PDV.",
  "Você pode filtrar seus relatórios de vendas por categoria para ver o que mais sai.",
  "Agrupe produtos similares para facilitar a gestão de inventário.",
  "Descrições ajudam novos funcionários a entenderem onde classificar cada produto."
];

type Categoria = {
  id: string;
  cat_nome: string;
  cat_descricao: string | null;
  created_at: string;
};

function CategoriasPage() {
  const dicaAleatoria = useMemo(() => DICAS_CATEGORIAS[Math.floor(Math.random() * DICAS_CATEGORIAS.length)], []);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpenConfirm, setIsDeleteDialogOpenConfirm] = useState(false);
  const [selectedCategoria, setSelectedCategoria] = useState<Categoria | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const [formData, setFormData] = useState({ cat_nome: "", cat_descricao: "" });
  const [submitting, setSubmitting] = useState(false);

  const fetchCategorias = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("tab_categorias")
        .select("*")
        .order("cat_nome");

      if (error) throw error;
      setCategorias(data || []);
    } catch (error: any) {
      toast.error("Erro ao carregar categorias: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategorias();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.cat_nome.trim()) {
      return toast.error("O nome da categoria é obrigatório");
    }

    try {
      setSubmitting(true);
      const data = {
        cat_nome: formData.cat_nome.toUpperCase(),
        cat_descricao: formData.cat_descricao,
      };

      if (selectedCategoria) {
        const { error } = await supabase
          .from("tab_categorias")
          .update(data)
          .eq("id", selectedCategoria.id);
        if (error) throw error;
        toast.success("Categoria atualizada com sucesso");
      } else {
        const { error } = await supabase
          .from("tab_categorias")
          .insert([data]);
        if (error) throw error;
        toast.success("Categoria criada com sucesso");
      }
      setIsDialogOpen(false);
      fetchCategorias();
    } catch (error: any) {
      toast.error("Erro ao salvar categoria: " + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedCategoria) return;
    try {
      setSubmitting(true);
      
      // Verificar se existem produtos vinculados
      const { count, error: countError } = await supabase
        .from("tab_produtos")
        .select("*", { count: 'exact', head: true })
        .eq("pro_categoria_id", selectedCategoria.id);

      if (countError) throw countError;

      if (count && count > 0) {
        toast.error(`Não é possível excluir: existem ${count} produto(s) vinculados a esta categoria.`);
        setIsDeleteDialogOpenConfirm(false);
        return;
      }

      const { error } = await supabase
        .from("tab_categorias")
        .delete()
        .eq("id", selectedCategoria.id);
      if (error) throw error;
      toast.success("Categoria excluída com sucesso");
      setIsDeleteDialogOpenConfirm(false);
      fetchCategorias();
    } catch (error: any) {
      const message = error.message || "Erro desconhecido";
      if (message.includes("violates foreign key constraint")) {
        toast.error("Não é possível excluir: existem registros vinculados a esta categoria.");
      } else {
        toast.error("Erro ao excluir categoria: " + message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const openAddDialog = () => {
    setSelectedCategoria(null);
    setFormData({ cat_nome: "", cat_descricao: "" });
    setIsDialogOpen(true);
  };

  const openEditDialog = (categoria: Categoria) => {
    setSelectedCategoria(categoria);
    setFormData({
      cat_nome: categoria.cat_nome,
      cat_descricao: categoria.cat_descricao || "",
    });
    setIsDialogOpen(true);
  };

  const filteredCategorias = categorias.filter((cat) => {
    const search = searchTerm.toLowerCase();
    return (
      cat.cat_nome.toLowerCase().includes(search) ||
      (cat.cat_descricao && cat.cat_descricao.toLowerCase().includes(search))
    );
  });

  const totalPages = Math.ceil(filteredCategorias.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedCategorias = filteredCategorias.slice(startIndex, startIndex + itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  return (
    <div className="space-y-6 pb-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border shadow-sm">
        <div className="space-y-1">
          <PageHeader
            title="Categorias"
            description="Organize seus produtos por grupos para facilitar a gestão."
          />
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="secondary" className="bg-slate-100 text-slate-600 border-none rounded-lg px-3 py-1">
              {categorias.length} {categorias.length === 1 ? 'Categoria' : 'Categorias'}
            </Badge>
          </div>
        </div>
        <Button onClick={openAddDialog} className="w-full sm:w-auto rounded-2xl bg-slate-900 hover:bg-slate-800 h-12 px-6 shadow-lg shadow-slate-900/10 transition-all hover:scale-[1.02] active:scale-[0.98]">
          <Plus className="mr-2 h-5 w-5" /> Nova Categoria
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="rounded-3xl border-none shadow-sm overflow-hidden bg-white">
            <div className="p-4 bg-slate-50/50 border-b flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Pesquisar categoria..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value.toUpperCase())}
                  className="pl-11 border-none bg-white focus-visible:ring-1 focus-visible:ring-slate-200 rounded-2xl h-12 shadow-sm"
                />
              </div>
            </div>
            
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-50/50">
                    <TableRow className="hover:bg-transparent border-none">
                      <TableHead className="w-[40%] font-bold text-slate-500 h-12">NOME</TableHead>
                      <TableHead className="font-bold text-slate-500 h-12">DESCRIÇÃO</TableHead>
                      <TableHead className="text-right font-bold text-slate-500 h-12">AÇÕES</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i} className="border-slate-50">
                          <TableCell><div className="h-5 w-40 bg-slate-100 animate-pulse rounded-lg" /></TableCell>
                          <TableCell><div className="h-5 w-64 bg-slate-100 animate-pulse rounded-lg" /></TableCell>
                          <TableCell><div className="h-9 w-20 ml-auto bg-slate-100 animate-pulse rounded-lg" /></TableCell>
                        </TableRow>
                      ))
                    ) : paginatedCategorias.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="h-72 text-center">
                          <div className="flex flex-col items-center justify-center space-y-3 opacity-40">
                            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-2">
                              <Tag className="h-8 w-8 text-slate-400" />
                            </div>
                            <p className="text-slate-500 font-medium text-lg">
                              {searchTerm ? "Nenhuma categoria encontrada." : "Sua lista está vazia."}
                            </p>
                            <p className="text-slate-400 text-sm max-w-[250px] mx-auto italic">
                              {searchTerm ? "Tente buscar por termos diferentes ou verifique a ortografia." : "Comece criando sua primeira categoria de produtos clicando no botão acima."}
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedCategorias.map((cat) => (
                        <TableRow key={cat.id} className="group hover:bg-slate-50/50 transition-colors border-slate-50">
                          <TableCell className="py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-slate-900 group-hover:text-white transition-all">
                                <Layers className="h-5 w-5" />
                              </div>
                              <span className="font-bold text-slate-700">{cat.cat_nome}</span>
                            </div>
                          </TableCell>
                          <TableCell className="py-4 max-w-md truncate text-slate-500 italic">
                            {cat.cat_descricao || "-"}
                          </TableCell>
                          <TableCell className="py-4 text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-9 w-9 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all"
                                onClick={() => openEditDialog(cat)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-9 w-9 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all"
                                onClick={() => { setSelectedCategoria(cat); setIsDeleteDialogOpenConfirm(true); }}
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
            </CardContent>

            {/* Pagination Footer */}
            {!loading && filteredCategorias.length > itemsPerPage && (
              <div className="p-6 border-t bg-slate-50/30 flex flex-col sm:flex-row items-center justify-between gap-4">
                <p className="text-sm text-slate-500 font-medium">
                  Mostrando <span className="text-slate-900 font-bold">{startIndex + 1}</span> a{" "}
                  <span className="text-slate-900 font-bold">
                    {Math.min(startIndex + itemsPerPage, filteredCategorias.length)}
                  </span>{" "}
                  de <span className="text-slate-900 font-bold">{filteredCategorias.length}</span> registros
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="rounded-xl h-9 px-4 border-slate-200"
                  >
                    Anterior
                  </Button>
                  <div className="flex items-center gap-1.5 px-2">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <Button
                        key={page}
                        variant={currentPage === page ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setCurrentPage(page)}
                        className={`h-8 w-8 p-0 rounded-lg text-xs font-bold ${
                          currentPage === page 
                            ? "bg-slate-900 text-white shadow-md shadow-slate-900/10" 
                            : "text-slate-500"
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
                    className="rounded-xl h-9 px-4 border-slate-200"
                  >
                    Próximo
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="rounded-3xl border-none shadow-sm bg-slate-900 text-white overflow-hidden p-6 relative">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Info className="w-24 h-24 rotate-12" />
            </div>
            <h3 className="text-lg font-bold flex items-center gap-2 mb-4">
              <ListChecks className="w-5 h-5 text-blue-400" /> Dica de Gestão
            </h3>
            <p className="text-slate-300 italic text-sm leading-relaxed relative z-10">
              "{dicaAleatoria}"
            </p>
            <div className="mt-6 pt-6 border-t border-white/10 flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Categorias Ativas</p>
                <p className="text-2xl font-black">{categorias.length}</p>
              </div>
              <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
                <Tag className="w-6 h-6 text-blue-400" />
              </div>
            </div>
          </Card>

          <Card className="rounded-3xl border-none shadow-sm bg-white p-6">
            <h3 className="font-bold text-slate-800 mb-4">Ações Rápidas</h3>
            <div className="space-y-3">
              <Button 
                variant="outline" 
                className="w-full justify-start h-12 rounded-2xl border-slate-100 hover:bg-slate-50 group"
                onClick={openAddDialog}
              >
                <div className="w-8 h-8 rounded-lg bg-green-50 text-green-600 flex items-center justify-center mr-3 group-hover:bg-green-600 group-hover:text-white transition-all">
                  <Plus className="w-4 h-4" />
                </div>
                Cadastrar Categoria
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start h-12 rounded-2xl border-slate-100 hover:bg-slate-50 group"
                onClick={() => toast.info("Relatório de categorias em breve")}
              >
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mr-3 group-hover:bg-blue-600 group-hover:text-white transition-all">
                  <Info className="w-4 h-4" />
                </div>
                Ver Relatório
              </Button>
            </div>
          </Card>
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px] p-0 rounded-[2rem] overflow-hidden border-none shadow-2xl">
          <form onSubmit={handleSave}>
            <div className="p-8 pb-4">
              <DialogHeader className="mb-6">
                <div className="w-14 h-14 bg-slate-900 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-slate-900/20">
                  <Tag className="h-7 w-7 text-white" />
                </div>
                <DialogTitle className="text-2xl font-black text-slate-900">
                  {selectedCategoria ? "Editar Categoria" : "Nova Categoria"}
                </DialogTitle>
                <DialogDescription className="text-slate-500 font-medium">
                  {selectedCategoria 
                    ? "Atualize as informações da categoria selecionada." 
                    : "Preencha os campos abaixo para criar um novo grupo de produtos."}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6 py-2">
                <div className="space-y-2">
                  <Label htmlFor="cat_nome" className="text-sm font-bold text-slate-700 flex items-center gap-2">
                    Nome da Categoria <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="cat_nome"
                    placeholder="Ex: MODA ÍNTIMA, ACESSÓRIOS..."
                    value={formData.cat_nome}
                    onChange={(e) => setFormData({ ...formData, cat_nome: e.target.value.toUpperCase() })}
                    className="rounded-2xl h-14 bg-slate-50 border-slate-100 focus:bg-white focus:ring-slate-200 transition-all font-bold text-slate-900 placeholder:font-normal"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cat_descricao" className="text-sm font-bold text-slate-700">Descrição (Opcional)</Label>
                  <Textarea
                    id="cat_descricao"
                    placeholder="Descreva o tipo de produtos que compõem esta categoria..."
                    value={formData.cat_descricao || ""}
                    onChange={(e) => setFormData({ ...formData, cat_descricao: e.target.value })}
                    className="rounded-2xl resize-none min-h-[120px] bg-slate-50 border-slate-100 focus:bg-white focus:ring-slate-200 transition-all italic text-slate-600 p-4"
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="p-8 bg-slate-50 flex flex-col-reverse sm:flex-row gap-3 border-t mt-4">
              <Button 
                type="button" 
                variant="ghost" 
                onClick={() => setIsDialogOpen(false)}
                className="rounded-2xl h-14 px-8 font-bold text-slate-500 hover:text-slate-900 transition-all"
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={submitting} 
                className="rounded-2xl bg-slate-900 hover:bg-slate-800 h-14 px-10 font-bold shadow-lg shadow-slate-900/10 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  selectedCategoria ? "Salvar Alterações" : "Criar Categoria"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpenConfirm} onOpenChange={setIsDeleteDialogOpenConfirm}>
        <AlertDialogContent className="rounded-[2rem] p-8 border-none shadow-2xl">
          <AlertDialogHeader>
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4">
              <Trash2 className="h-8 w-8 text-red-500" />
            </div>
            <AlertDialogTitle className="font-black text-2xl text-slate-900">Excluir Categoria</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-500 text-base leading-relaxed">
              Você tem certeza que deseja remover a categoria <span className="font-bold text-slate-900">"{selectedCategoria?.cat_nome}"</span>? 
              <br/><br/>
              Esta ação é <span className="text-red-500 font-bold underline decoration-red-200 underline-offset-4">permanente</span> e não poderá ser desfeita. 
              Certifique-se de que não existem produtos vinculados a ela.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-8 gap-3 sm:gap-0">
            <AlertDialogCancel className="rounded-2xl h-14 px-8 font-bold text-slate-500 border-none hover:bg-slate-50">Voltar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="rounded-2xl bg-red-600 hover:bg-red-700 h-14 px-8 font-bold text-white shadow-lg shadow-red-600/20"
            >
              Sim, Excluir Categoria
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
