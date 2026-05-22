import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Package, Plus, Pencil, Trash2, Search, Loader2, Barcode, TrendingUp, AlertCircle, Tag, Info, DollarSign, Boxes, Layers, Ruler, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";

export const Route = createFileRoute("/produtos")({
  component: ProdutosPage,
});

const DICAS_PRODUTOS = [
  "Cadastre fotos de alta qualidade para destacar os detalhes das rendas e tecidos.",
  "Mantenha o estoque mínimo atualizado para nunca perder uma venda por falta de produto.",
  "Use categorias precisas para facilitar a organização e a busca rápida no PDV.",
  "Produtos em conjunto costumam ter maior saída que peças avulsas.",
  "Revise as descrições dos produtos para incluir dicas de conservação das peças.",
  "Organize seus produtos por cores para criar uma vitrine visualmente harmônica.",
  "Fique de olho nos produtos 'curva A' — os que trazem 80% do seu faturamento."
];

type Produto = {
  id: string;
  pro_codigo: string;
  pro_descricao: string;
  pro_valor_compra: number | null;
  pro_valor_venda: number | null;
  pro_estoque_atual: number | null;
  pro_estoque_minimo: number | null;
  pro_valor_total: number | null;
  pro_categoria_id: string | null;
  pro_tamanho_id: string | null;
  pro_cor_id: string | null;
  pro_codigo_barras: string | null;
  tab_categorias: { cat_nome: string } | null;
  tab_tamanhos: { tam_nome: string } | null;
  tab_cores: { cor_nome: string } | null;
};

type Categoria = { id: string; cat_nome: string };
type Tamanho = { id: string; tam_nome: string };
type Cor = { id: string; cor_nome: string };

function ProdutosPage() {
  const dicaAleatoria = useMemo(() => DICAS_PRODUTOS[Math.floor(Math.random() * DICAS_PRODUTOS.length)], []);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [tamanhos, setTamanhos] = useState<Tamanho[]>([]);
  const [cores, setCores] = useState<Cor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpenConfirm, setIsDeleteDialogOpenConfirm] = useState(false);
  const [selectedProduto, setSelectedProduto] = useState<Produto | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [dependencyError, setDependencyError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [formData, setFormData] = useState({
    pro_codigo: "",
    pro_descricao: "",
    pro_valor_compra: "",
    pro_valor_venda: "",
    pro_estoque_atual: "0",
    pro_estoque_minimo: "0",
    pro_categoria_id: "",
    pro_tamanho_id: "",
    pro_cor_id: "",
    pro_codigo_barras: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [prodResponse, catResponse, tamResponse, corResponse] = await Promise.all([
        supabase.from("tab_produtos").select("*, tab_categorias(cat_nome), tab_tamanhos(tam_nome), tab_cores(cor_nome)").order("pro_descricao"),
        supabase.from("tab_categorias").select("id, cat_nome").order("cat_nome"),
        supabase.from("tab_tamanhos").select("id, tam_nome").order("tam_nome"),
        supabase.from("tab_cores").select("id, cor_nome").order("cor_nome"),
      ]);
      if (prodResponse.error) throw prodResponse.error;
      setProdutos(prodResponse.data || []);
      setCategorias(catResponse.data || []);
      setTamanhos(tamResponse.data || []);
      setCores(corResponse.data || []);
    } catch (error: any) {
      toast.error("Erro ao carregar dados: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);
  
  useEffect(() => {
    if (selectedProduto) {
      setFormData({
        pro_codigo: selectedProduto.pro_codigo || "",
        pro_descricao: selectedProduto.pro_descricao || "",
        pro_valor_compra: selectedProduto.pro_valor_compra?.toLocaleString("pt-BR", { minimumFractionDigits: 2 }) || "0,00",
        pro_valor_venda: selectedProduto.pro_valor_venda?.toLocaleString("pt-BR", { minimumFractionDigits: 2 }) || "0,00",
        pro_estoque_atual: selectedProduto.pro_estoque_atual?.toString() || "0",
        pro_estoque_minimo: selectedProduto.pro_estoque_minimo?.toString() || "0",
        pro_categoria_id: selectedProduto.pro_categoria_id || "",
        pro_tamanho_id: selectedProduto.pro_tamanho_id || "",
        pro_cor_id: selectedProduto.pro_cor_id || "",
        pro_codigo_barras: selectedProduto.pro_codigo_barras || "",
      });
    } else {
      setFormData({
        pro_codigo: "",
        pro_descricao: "",
        pro_valor_compra: "0,00",
        pro_valor_venda: "0,00",
        pro_estoque_atual: "0",
        pro_estoque_minimo: "0",
        pro_categoria_id: "",
        pro_tamanho_id: "",
        pro_cor_id: "",
        pro_codigo_barras: "",
      });
    }
  }, [selectedProduto]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation before processing
    if (!formData.pro_descricao.trim()) {
      toast.error("A descrição do produto é obrigatória.");
      return;
    }

    if (!formData.pro_codigo.trim()) {
      toast.error("O código (REF) do produto é obrigatório.");
      return;
    }

    if (!formData.pro_categoria_id) {
      toast.error("A categoria do produto é obrigatória.");
      return;
    }

    if (!formData.pro_tamanho_id) {
      toast.error("O tamanho do produto é obrigatório.");
      return;
    }

    if (!formData.pro_cor_id) {
      toast.error("A cor do produto é obrigatória.");
      return;
    }

    try {
      setSubmitting(true);
      
      const valorVenda = parseFloat(formData.pro_valor_venda.replace(/\./g, "").replace(",", ".")) || 0;
      const valorCompra = parseFloat(formData.pro_valor_compra.replace(/\./g, "").replace(",", ".")) || 0;
      const estoqueAtual = parseInt(formData.pro_estoque_atual) || 0;
      const estoqueMinimo = parseInt(formData.pro_estoque_minimo) || 0;

      // Backend-style validation (simulated on client but robust)
      if (valorVenda < 0) {
        toast.error("O valor de venda não pode ser negativo.");
        setSubmitting(false);
        return;
      }

      if (estoqueAtual < 0) {
        toast.error("O estoque não pode ser negativo.");
        setSubmitting(false);
        return;
      }

      const data = {
        pro_codigo: formData.pro_codigo,
        pro_descricao: formData.pro_descricao,
        pro_valor_compra: valorCompra,
        pro_valor_venda: valorVenda,
        pro_estoque_atual: estoqueAtual,
        pro_estoque_minimo: estoqueMinimo,
        pro_categoria_id: formData.pro_categoria_id,
        pro_tamanho_id: formData.pro_tamanho_id,
        pro_cor_id: formData.pro_cor_id,
        pro_codigo_barras: formData.pro_codigo_barras || null,
      };

      if (selectedProduto) {
        const { error } = await supabase.from("tab_produtos").update(data).eq("id", selectedProduto.id);
        if (error) throw error;
        toast.success("Produto atualizado!");
      } else {
        const { error } = await supabase.from("tab_produtos").insert([data]);
        if (error) throw error;
        toast.success("Produto criado!");
      }
      setIsDialogOpen(false);
      fetchData();
    } catch (error: any) {
      console.error("Erro ao salvar:", error);
      toast.error("Erro ao salvar: " + (error.message || "Erro desconhecido"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedProduto) return;
    
    try {
      setIsDeleting(true);
      setDependencyError(null);
      
      // Verifica se o produto está vinculado a vendas concluídas ou ativas
      // itv_status pode ser 'concluido', 'ativo', 'cancelado'
      const { data: salesData, error: salesError } = await supabase
        .from("tab_itens_venda")
        .select("id")
        .eq("itv_produto_id", selectedProduto.id)
        .neq("itv_status", "cancelado")
        .limit(1);

      if (salesError) throw salesError;

      if (salesData && salesData.length > 0) {
        setDependencyError("Este produto possui vendas concluídas ou ativas e não pode ser excluído. Somente produtos sem vendas ou com vendas canceladas podem ser removidos.");
        return;
      }

      const { error } = await supabase
        .from("tab_produtos")
        .delete()
        .eq("id", selectedProduto.id);

      if (error) throw error;

      toast.success("Produto excluído com sucesso!");
      setIsDeleteDialogOpenConfirm(false);
      fetchData();
    } catch (error: any) {
      console.error("Erro ao excluir produto:", error);
      toast.error("Erro ao excluir produto: " + error.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredProdutos = produtos.filter((p) => {
    const s = searchTerm.toLowerCase();
    return p.pro_descricao?.toLowerCase().includes(s) || p.pro_codigo?.toLowerCase().includes(s);
  });

  const paginatedProdutos = filteredProdutos.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="space-y-6 p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Gestão de Estoque</h1>
          <p className="text-slate-500 mt-1 flex items-center gap-2 text-sm italic">
            <TrendingUp className="w-4 h-4 text-primary" /> {dicaAleatoria}
          </p>
        </div>
        <Button onClick={() => { setIsDialogOpen(true); setSelectedProduto(null); }} className="rounded-2xl shadow-lg shadow-primary/20 h-12 px-6 bg-slate-900 hover:bg-slate-800">
          <Plus className="mr-2 h-4 w-4" /> Novo Produto
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="col-span-1 md:col-span-3 border-none bg-white shadow-xl shadow-slate-200/50 rounded-3xl p-4">
          <div className="relative">
            <Search className="absolute left-4 top-3.5 h-5 w-5 text-slate-400" />
            <Input
              placeholder="Pesquise por nome, código ou EAN..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 h-14 text-lg bg-slate-50 border-none rounded-2xl focus-visible:ring-2 focus-visible:ring-primary/20"
            />
          </div>
        </Card>
      </div>

      <Card className="border-none shadow-xl shadow-slate-200/50 rounded-3xl overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow>
                <TableHead className="min-w-[150px]">Produto</TableHead>
                <TableHead className="hidden sm:table-cell">Categoria</TableHead>
                <TableHead className="hidden sm:table-cell">Preço</TableHead>
                <TableHead className="text-center hidden sm:table-cell">Estoque</TableHead>
                <TableHead className="hidden md:table-cell">Total Estoque</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedProdutos.map((prod) => (
                <TableRow key={prod.id} className="hover:bg-slate-50 transition-colors">
                  <TableCell>
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Package className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-slate-900 truncate text-sm sm:text-base mb-0.5" title={prod.pro_descricao}>
                          {prod.pro_descricao}
                        </p>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="text-[10px] sm:text-xs text-slate-400 font-mono">
                            REF: {prod.pro_codigo}
                          </span>
                          <span className="text-[10px] sm:text-xs font-bold text-primary sm:hidden">
                            Venda: {new Intl.NumberFormat("pt-BR", { 
                              style: "currency", 
                              currency: "BRL"
                            }).format(prod.pro_valor_venda || 0)}
                          </span>
                          <span className="text-[10px] sm:text-xs font-bold text-slate-600 md:hidden">
                            Total: {new Intl.NumberFormat("pt-BR", { 
                              style: "currency", 
                              currency: "BRL"
                            }).format(prod.pro_valor_total || 0)}
                          </span>
                          <span className={`text-[10px] sm:text-xs font-medium sm:hidden ${(prod.pro_estoque_atual || 0) < (prod.pro_estoque_minimo || 0) ? 'text-red-500' : 'text-slate-500'}`}>
                            Estoque: {prod.pro_estoque_atual}
                          </span>
                          {prod.tab_categorias?.cat_nome && (
                            <span className="text-[10px] sm:text-xs text-slate-400 bg-slate-100 px-1.5 rounded sm:hidden">
                              Cat: {prod.tab_categorias.cat_nome}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Badge variant="secondary" className="rounded-full px-2 py-0 sm:px-3 text-[10px] sm:text-xs truncate max-w-[100px]">
                      {prod.tab_categorias?.cat_nome}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-bold text-slate-700 text-sm sm:text-base whitespace-nowrap hidden sm:table-cell">
                    {new Intl.NumberFormat("pt-BR", { 
                      style: "currency", 
                      currency: "BRL",
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    }).format(prod.pro_valor_venda || 0)}
                  </TableCell>
                  <TableCell className="text-center hidden sm:table-cell">
                    <div className="flex items-center justify-center gap-1">
                      <span className={`font-bold text-sm sm:text-base ${(prod.pro_estoque_atual || 0) < (prod.pro_estoque_minimo || 0) ? 'text-red-500' : 'text-slate-900'}`}>
                        {prod.pro_estoque_atual}
                      </span>
                      {(prod.pro_estoque_atual || 0) < (prod.pro_estoque_minimo || 0) && (
                        <AlertCircle className="w-3 h-3 sm:w-4 sm:h-4 text-red-500 flex-shrink-0" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="font-bold text-slate-700 whitespace-nowrap hidden md:table-cell">
                    {new Intl.NumberFormat("pt-BR", { 
                      style: "currency", 
                      currency: "BRL"
                    }).format(prod.pro_valor_total || 0)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        className="rounded-full h-8 w-8 sm:h-10 sm:w-10" 
                        onClick={() => { setSelectedProduto(prod); setIsDialogOpen(true); }}
                      >
                        <Pencil className="w-4 h-4 text-slate-500" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        className="rounded-full h-8 w-8 sm:h-10 sm:w-10 hover:bg-red-50 hover:text-red-600 transition-colors" 
                        onClick={() => { 
                          setSelectedProduto(prod); 
                          setDependencyError(null);
                          setIsDeleteDialogOpenConfirm(true); 
                        }}
                      >
                        <Trash2 className="w-4 h-4 text-slate-400" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
      
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="rounded-3xl max-w-2xl w-[95vw] max-h-[90vh] overflow-y-auto p-0 border-none shadow-2xl">
          <form onSubmit={handleSave}>
            <div className="bg-slate-900 p-6 text-white">
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center backdrop-blur-xl">
                    <Package className="w-6 h-6 text-primary-foreground" />
                  </div>
                  <div>
                    <DialogTitle className="text-2xl font-black">{selectedProduto ? "Editar Produto" : "Novo Produto"}</DialogTitle>
                    <DialogDescription className="text-slate-400">
                      {selectedProduto ? `Editando: ${selectedProduto.pro_descricao}` : "Cadastre um novo produto no seu estoque"}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>
            </div>

            <div className="p-6">
              <Tabs defaultValue="geral" className="w-full">
                <TabsList className="grid w-full grid-cols-3 mb-8 bg-slate-100 rounded-xl p-1">
                  <TabsTrigger value="geral" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
                    <Info className="w-4 h-4 mr-2" /> Geral
                  </TabsTrigger>
                  <TabsTrigger value="financeiro" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
                    <DollarSign className="w-4 h-4 mr-2" /> Valores
                  </TabsTrigger>
                  <TabsTrigger value="atributos" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
                    <Layers className="w-4 h-4 mr-2" /> Atributos
                  </TabsTrigger>
                </TabsList>

                 <TabsContent value="geral" className="space-y-4 animate-in fade-in-50 duration-300">
                  <div className="grid gap-2">
                    <Label htmlFor="pro_descricao" className="font-bold flex items-center gap-2">
                      <Package className="w-4 h-4 text-slate-400" /> Descrição do Produto *
                    </Label>
                    <Input 
                      id="pro_descricao"
                      placeholder="Ex: Conjunto Renda Luxo"
                      value={formData.pro_descricao} 
                      onChange={e => setFormData({...formData, pro_descricao: e.target.value})} 
                      required 
                      className="rounded-xl h-12 bg-slate-50 border-slate-200 focus:bg-white transition-all"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="pro_codigo" className="font-bold flex items-center gap-2">
                        <Tag className="w-4 h-4 text-slate-400" /> Código (REF) *
                      </Label>
                      <Input 
                        id="pro_codigo"
                        placeholder="Ex: REF001"
                        value={formData.pro_codigo} 
                        onChange={e => setFormData({...formData, pro_codigo: e.target.value})} 
                        required
                        className="rounded-xl h-12 bg-slate-50 border-slate-200 focus:bg-white transition-all"
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="pro_codigo_barras" className="font-bold flex items-center gap-2">
                        <Barcode className="w-4 h-4 text-slate-400" /> Código de Barras (EAN)
                      </Label>
                      <Input 
                        id="pro_codigo_barras"
                        placeholder="Opcional"
                        value={formData.pro_codigo_barras} 
                        onChange={e => setFormData({...formData, pro_codigo_barras: e.target.value})}
                        className="rounded-xl h-12 bg-slate-50 border-slate-200 focus:bg-white transition-all"
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="financeiro" className="space-y-4 animate-in fade-in-50 duration-300">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="pro_valor_compra" className="font-bold flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-slate-400" /> Preço de Compra
                      </Label>
                      <div className="relative">
                        <span className="absolute left-4 top-3.5 text-slate-400 font-medium">R$</span>
                        <Input 
                          id="pro_valor_compra"
                          value={formData.pro_valor_compra} 
                          onChange={e => setFormData({...formData, pro_valor_compra: e.target.value})}
                          className="pl-10 rounded-xl h-12 bg-slate-50 border-slate-200 focus:bg-white transition-all font-bold text-slate-700"
                        />
                      </div>
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="pro_valor_venda" className="font-bold flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-green-500" /> Preço de Venda
                      </Label>
                      <div className="relative">
                        <span className="absolute left-4 top-3.5 text-slate-400 font-medium">R$</span>
                        <Input 
                          id="pro_valor_venda"
                          value={formData.pro_valor_venda} 
                          onChange={e => setFormData({...formData, pro_valor_venda: e.target.value})}
                          className="pl-10 rounded-xl h-12 bg-slate-50 border-slate-200 focus:bg-white transition-all font-bold text-green-600"
                        />
                      </div>
                    </div>
                  </div>

                  <Separator className="my-4 opacity-50" />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="pro_estoque_atual" className="font-bold flex items-center gap-2">
                        <Boxes className="w-4 h-4 text-slate-400" /> Estoque Atual
                      </Label>
                      <Input 
                        id="pro_estoque_atual"
                        type="number"
                        value={formData.pro_estoque_atual} 
                        onChange={e => setFormData({...formData, pro_estoque_atual: e.target.value})}
                        className="rounded-xl h-12 bg-slate-50 border-slate-200 focus:bg-white transition-all text-center text-lg font-bold"
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="pro_estoque_minimo" className="font-bold flex items-center gap-2 text-red-500">
                        <AlertCircle className="w-4 h-4" /> Estoque Mínimo
                      </Label>
                      <Input 
                        id="pro_estoque_minimo"
                        type="number"
                        value={formData.pro_estoque_minimo} 
                        onChange={e => setFormData({...formData, pro_estoque_minimo: e.target.value})}
                        className="rounded-xl h-12 bg-slate-50 border-slate-200 focus:bg-white transition-all text-center text-lg font-bold text-red-600"
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="atributos" className="space-y-4 animate-in fade-in-50 duration-300">
                  <div className="grid gap-2">
                    <div className="grid gap-2">
                      <Label htmlFor="pro_categoria_id" className="font-bold flex items-center gap-2">
                        <Layers className="w-4 h-4 text-slate-400" /> Categoria *
                      </Label>
                      <Select 
                        value={formData.pro_categoria_id} 
                        onValueChange={value => setFormData({...formData, pro_categoria_id: value})}
                      >
                        <SelectTrigger className="rounded-xl h-12 bg-slate-50 border-slate-200">
                          <SelectValue placeholder="Selecione uma categoria" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-none shadow-xl">
                          {categorias.map(cat => (
                            <SelectItem key={cat.id} value={cat.id}>{cat.cat_nome}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="pro_tamanho_id" className="font-bold flex items-center gap-2">
                          <Ruler className="w-4 h-4 text-slate-400" /> Tamanho *
                        </Label>
                        <Select 
                          value={formData.pro_tamanho_id} 
                          onValueChange={value => setFormData({...formData, pro_tamanho_id: value})}
                        >
                          <SelectTrigger className="rounded-xl h-12 bg-slate-50 border-slate-200">
                            <SelectValue placeholder="Selecione um tamanho" />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl border-none shadow-xl">
                            {tamanhos.map(tam => (
                              <SelectItem key={tam.id} value={tam.id}>{tam.tam_nome}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="pro_cor_id" className="font-bold flex items-center gap-2">
                          <Palette className="w-4 h-4 text-slate-400" /> Cor *
                        </Label>
                        <Select 
                          value={formData.pro_cor_id} 
                          onValueChange={value => setFormData({...formData, pro_cor_id: value})}
                        >
                          <SelectTrigger className="rounded-xl h-12 bg-slate-50 border-slate-200">
                            <SelectValue placeholder="Selecione uma cor" />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl border-none shadow-xl">
                            {cores.map(cor => (
                              <SelectItem key={cor.id} value={cor.id}>{cor.cor_nome}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>

            <DialogFooter className="p-6 bg-slate-50 flex flex-col-reverse sm:flex-row justify-end gap-3 border-t">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsDialogOpen(false)}
                className="rounded-xl h-12 px-6 border-slate-200 hover:bg-slate-100 text-slate-600 font-medium"
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={submitting}
                className="rounded-xl h-12 px-8 bg-slate-900 hover:bg-slate-800 shadow-lg shadow-slate-900/20"
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  "Confirmar Alterações"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <AlertDialog open={isDeleteDialogOpenConfirm} onOpenChange={setIsDeleteDialogOpenConfirm}>
        <AlertDialogContent className="rounded-3xl border-none shadow-2xl">
          <AlertDialogHeader>
            <div className="w-12 h-12 rounded-2xl bg-red-100 flex items-center justify-center mb-4">
              <Trash2 className="w-6 h-6 text-red-600" />
            </div>
            <AlertDialogTitle className="text-2xl font-black text-slate-900">
              {dependencyError ? "Exclusão Impedida" : "Confirmar Exclusão"}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-600 text-base">
              {dependencyError ? (
                <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex gap-3 text-amber-800">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <p>{dependencyError}</p>
                </div>
              ) : (
                <>
                  Você tem certeza que deseja excluir o produto <span className="font-bold text-slate-900">{selectedProduto?.pro_descricao}</span>?
                  Esta ação não poderá ser desfeita.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-3 mt-6">
            <AlertDialogCancel 
              onClick={() => {
                setIsDeleteDialogOpenConfirm(false);
                setDependencyError(null);
              }}
              className="rounded-xl h-12 border-slate-200 text-slate-600 font-medium"
            >
              {dependencyError ? "Fechar" : "Cancelar"}
            </AlertDialogCancel>
            {!dependencyError && (
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault();
                  handleDelete();
                }}
                disabled={isDeleting}
                className="rounded-xl h-12 bg-red-600 hover:bg-red-700 text-white font-bold shadow-lg shadow-red-600/20"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Excluindo...
                  </>
                ) : (
                  "Excluir Produto"
                )}
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
