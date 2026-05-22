import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  CreditCard,
  Banknote,
  QrCode,
  Plus,
  Trash2,
  Search,
  Pencil,
  ChevronLeft,
  Smartphone,
  Wallet,
  Coins,
  GripVertical,
  Hash,
  TrendingUp,
  ArrowUpDown,
  Sparkles,
  X,
  Loader2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  TouchSensor,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

export const Route = createFileRoute("/finalizadoras")({
  component: FinalizadorasPage,
});

const iconMap: Record<string, any> = {
  CreditCard,
  Banknote,
  QrCode,
  Smartphone,
  Wallet,
  Coins,
};

const availableIcons = [
  { value: "Banknote", label: "Dinheiro", icon: Banknote },
  { value: "CreditCard", label: "Cartão", icon: CreditCard },
  { value: "QrCode", label: "PIX", icon: QrCode },
  { value: "Smartphone", label: "Digital", icon: Smartphone },
  { value: "Wallet", label: "Carteira", icon: Wallet },
  { value: "Coins", label: "Moedas", icon: Coins },
];

interface Finalizadora {
  id: string;
  fin_descricao: string;
  fin_ativa: boolean;
  fin_icone: string | null;
  fin_permite_troco: boolean;
  fin_codigo_atalho: string | null;
  fin_ordem: number;
}

type SortBy = "ordem" | "descricao" | "status" | "uso";

function FinalizadorasPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortBy>("ordem");
  const [reorderMode, setReorderMode] = useState(false);

  const [formData, setFormData] = useState({
    fin_descricao: "",
    fin_ativa: true,
    fin_icone: "CreditCard",
    fin_permite_troco: true,
    fin_codigo_atalho: "",
  });

  const { data: finalizadoras = [], isLoading } = useQuery({
    queryKey: ["finalizadoras"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tab_finalizadoras")
        .select("*")
        .order("fin_ordem")
        .order("fin_descricao");
      if (error) throw error;
      return data as Finalizadora[];
    },
  });

  // Estatísticas de uso (contagem por finalizadora)
  const { data: usageMap = {} } = useQuery({
    queryKey: ["finalizadoras-uso"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tab_vendas_pagamentos")
        .select("vpa_finalizadora_id, vpa_valor");
      if (error) throw error;
      const map: Record<string, { count: number; total: number }> = {};
      (data ?? []).forEach((row: any) => {
        const id = row.vpa_finalizadora_id;
        if (!id) return;
        if (!map[id]) map[id] = { count: 0, total: 0 };
        map[id].count += 1;
        map[id].total += Number(row.vpa_valor) || 0;
      });
      return map;
    },
  });

  const [localOrder, setLocalOrder] = useState<Finalizadora[] | null>(null);

  useEffect(() => {
    if (!reorderMode) setLocalOrder(null);
  }, [reorderMode]);

  const sortedList = useMemo(() => {
    const base = [...finalizadoras];
    if (sortBy === "descricao") base.sort((a, b) => a.fin_descricao.localeCompare(b.fin_descricao));
    else if (sortBy === "status")
      base.sort((a, b) => Number(b.fin_ativa) - Number(a.fin_ativa) || a.fin_descricao.localeCompare(b.fin_descricao));
    else if (sortBy === "uso")
      base.sort((a, b) => (usageMap[b.id]?.count || 0) - (usageMap[a.id]?.count || 0));
    else base.sort((a, b) => a.fin_ordem - b.fin_ordem);
    return base;
  }, [finalizadoras, sortBy, usageMap]);

  const filteredList = useMemo(() => {
    const list = reorderMode && localOrder ? localOrder : sortedList;
    if (!searchTerm) return list;
    return list.filter((f) => f.fin_descricao.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [sortedList, searchTerm, reorderMode, localOrder]);

  const stats = useMemo(() => {
    const total = finalizadoras.length;
    const ativas = finalizadoras.filter((f) => f.fin_ativa).length;
    const totalUso = Object.values(usageMap).reduce((acc, v) => acc + v.count, 0);
    return { total, ativas, totalUso };
  }, [finalizadoras, usageMap]);

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      if (!data.fin_descricao || data.fin_descricao.trim() === "") {
        throw new Error("A descrição é obrigatória.");
      }
      const payload = {
        fin_descricao: data.fin_descricao.toUpperCase().trim(),
        fin_ativa: data.fin_ativa,
        fin_icone: data.fin_icone,
        fin_permite_troco: data.fin_permite_troco,
        fin_codigo_atalho: data.fin_codigo_atalho?.trim() || null,
      };
      if (editingId) {
        const { error } = await supabase.from("tab_finalizadoras").update(payload).eq("id", editingId);
        if (error) throw error;
      } else {
        const nextOrder = (finalizadoras.reduce((m, f) => Math.max(m, f.fin_ordem), 0) || 0) + 1;
        const { error } = await supabase.from("tab_finalizadoras").insert([{ ...payload, fin_ordem: nextOrder }]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finalizadoras"] });
      toast.success(editingId ? "Finalizadora atualizada" : "Finalizadora cadastrada");
      handleCloseDialog();
    },
    onError: (error: any) => toast.error("Erro: " + error.message),
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from("tab_finalizadoras").update({ fin_ativa: active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["finalizadoras"] }),
    onError: (error: any) => toast.error("Erro: " + error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tab_finalizadoras").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finalizadoras"] });
      toast.success("Finalizadora removida");
      setIsDeleteDialogOpen(false);
      setDeletingId(null);
    },
    onError: (error: any) => toast.error("Erro: " + error.message),
  });

  const reorderMutation = useMutation({
    mutationFn: async (items: Finalizadora[]) => {
      // Atualiza individualmente pra não depender de upsert
      await Promise.all(
        items.map((item, idx) =>
          supabase.from("tab_finalizadoras").update({ fin_ordem: idx + 1 }).eq("id", item.id)
        )
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finalizadoras"] });
      toast.success("Ordem salva");
      setReorderMode(false);
    },
    onError: (error: any) => toast.error("Erro: " + error.message),
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const base = localOrder ?? sortedList;
    const oldIndex = base.findIndex((i) => i.id === active.id);
    const newIndex = base.findIndex((i) => i.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    setLocalOrder(arrayMove(base, oldIndex, newIndex));
  }

  const handleOpenDialog = (fin?: Finalizadora) => {
    if (fin) {
      setEditingId(fin.id);
      setFormData({
        fin_descricao: fin.fin_descricao,
        fin_ativa: fin.fin_ativa,
        fin_icone: fin.fin_icone || "CreditCard",
        fin_permite_troco: fin.fin_permite_troco,
        fin_codigo_atalho: fin.fin_codigo_atalho || "",
      });
    } else {
      setEditingId(null);
      setFormData({
        fin_descricao: "",
        fin_ativa: true,
        fin_icone: "CreditCard",
        fin_permite_troco: true,
        fin_codigo_atalho: "",
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingId(null);
  };

  const fmtBRL = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0, maximumFractionDigits: 0 });

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-4 py-5 md:px-8 md:py-8 space-y-6 sm:space-y-8">
        {/* Header */}
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Finalizadoras</h1>
            <p className="text-muted-foreground text-xs sm:text-sm">Configure as formas de pagamento do seu PDV.</p>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 sm:flex-none h-9 rounded-xl gap-2 text-xs"
              onClick={() => window.history.back()}
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Voltar
            </Button>
            <Button 
              size="sm" 
              className="flex-1 sm:flex-none h-9 rounded-xl shadow-lg shadow-primary/20 text-xs font-bold"
              onClick={() => handleOpenDialog()}
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Nova Finalizadora
            </Button>
          </div>
        </header>

        {/* Stats grid using StatCard style from dashboard */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
          <StatPill label="Total" value={stats.total} accent="primary" icon={CreditCard} />
          <StatPill label="Ativas" value={stats.ativas} accent="success" icon={Smartphone} />
          <StatPill label="Usos" value={stats.totalUso} accent="info" icon={TrendingUp} />
        </div>

        {/* Toolbar */}
        <div className="flex flex-col gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar finalizadora..."
              className="pl-9 h-10 bg-background border-input rounded-xl shadow-sm text-sm focus-visible:ring-primary"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 overflow-x-auto -mx-1 px-1 pb-1 scrollbar-none">
            {(
              [
                { id: "ordem", label: "Ordem" },
                { id: "descricao", label: "Nome" },
                { id: "status", label: "Status" },
                { id: "uso", label: "Mais usadas" },
              ] as { id: SortBy; label: string }[]
            ).map((opt) => (
              <button
                key={opt.id}
                disabled={reorderMode}
                onClick={() => setSortBy(opt.id)}
                className={`shrink-0 h-8 px-4 rounded-full text-[11px] font-bold uppercase tracking-wider transition-all border ${
                  sortBy === opt.id
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background text-muted-foreground border-input hover:border-primary/30"
                } ${reorderMode ? "opacity-40" : ""}`}
              >
                {opt.label}
              </button>
            ))}
            <div className="ml-auto shrink-0 flex items-center gap-2">
              <Button
                variant={reorderMode ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  if (reorderMode && localOrder) reorderMutation.mutate(localOrder);
                  else setReorderMode(true);
                }}
                disabled={reorderMutation.isPending}
                className={`h-8 rounded-xl text-[11px] font-bold uppercase tracking-wider ${
                  reorderMode ? "bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20" : "bg-background"
                }`}
              >
                <ArrowUpDown className="w-3 h-3 mr-1.5" />
                {reorderMode ? "Salvar" : "Ordem"}
              </Button>
              {reorderMode && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setReorderMode(false)}
                  className="h-8 rounded-full text-[11px] font-bold uppercase tracking-wider text-slate-500 ml-1"
                >
                  Cancelar
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* List */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Carregando</p>
          </div>
        ) : filteredList.length === 0 ? (
          <Card className="flex flex-col items-center justify-center py-16 gap-3 border-dashed border-2 border-muted bg-muted/5">
            <div className="w-16 h-16 bg-primary/5 rounded-2xl flex items-center justify-center">
              <Sparkles className="h-7 w-7 text-primary/40" />
            </div>
            <div className="text-center px-6">
              <p className="text-base font-bold text-foreground">
                {searchTerm ? "Nenhum resultado" : "Nenhuma finalizadora"}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {searchTerm ? "Ajuste sua busca." : "Adicione a primeira forma de pagamento."}
              </p>
            </div>
            {!searchTerm && (
              <Button onClick={() => handleOpenDialog()} className="mt-2 rounded-xl shadow-lg shadow-primary/20">
                <Plus className="w-4 h-4 mr-1.5" /> Cadastrar
              </Button>
            )}
          </Card>
        ) : reorderMode ? (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={filteredList.map((f) => f.id)} strategy={verticalListSortingStrategy}>
              <div className="flex flex-col gap-2">
                {filteredList.map((fin) => (
                  <SortableRow key={fin.id} fin={fin} />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
            {filteredList.map((fin) => {
              const Icon = iconMap[fin.fin_icone || "CreditCard"] || CreditCard;
              const uso = usageMap[fin.id];
              return (
                <Card
                  key={fin.id}
                  className={`group relative overflow-hidden rounded-2xl border-border/60 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 ${
                    !fin.fin_ativa ? "bg-muted/30 opacity-75" : "bg-card"
                  }`}
                >
                  <div className="p-5">
                    <div className="flex items-start gap-4">
                      <div
                        className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                          fin.fin_ativa
                            ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        <Icon className="w-6 h-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3
                          className={`font-bold text-base leading-tight truncate ${
                            fin.fin_ativa ? "text-foreground" : "text-muted-foreground"
                          }`}
                        >
                          {fin.fin_descricao}
                        </h3>
                        <div className="flex flex-wrap items-center gap-1.5 mt-2">
                          {fin.fin_codigo_atalho && (
                            <Badge
                              variant="secondary"
                              className="h-5 px-1.5 text-[10px] font-bold uppercase tracking-wider bg-foreground text-background hover:bg-foreground"
                            >
                              <Hash className="w-2.5 h-2.5 mr-0.5" />
                              {fin.fin_codigo_atalho}
                            </Badge>
                          )}
                          {fin.fin_permite_troco && (
                            <Badge className="h-5 px-1.5 text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary hover:bg-primary/10 border-none">
                              Troco
                            </Badge>
                          )}
                        </div>
                      </div>
                      <Switch
                        checked={fin.fin_ativa}
                        onCheckedChange={(checked) => toggleStatusMutation.mutate({ id: fin.id, active: checked })}
                        className="data-[state=checked]:bg-primary scale-90"
                      />
                    </div>

                    {/* Usage stats */}
                    <div className="mt-5 flex items-center justify-between bg-muted/20 rounded-xl px-3 py-2.5">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Vendas</p>
                        <p className="text-sm font-bold text-foreground">{uso?.count || 0}</p>
                      </div>
                      <div className="h-8 w-px bg-border" />
                      <div className="text-right">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total</p>
                        <p className="text-sm font-bold text-foreground">{fmtBRL(uso?.total || 0)}</p>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 h-9 rounded-xl font-bold text-xs border-input bg-background"
                        onClick={() => handleOpenDialog(fin)}
                      >
                        <Pencil className="w-3 h-3 mr-1.5" /> Editar
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        onClick={() => {
                          setDeletingId(fin.id);
                          setIsDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Form Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[460px] rounded-2xl p-0 overflow-hidden border-none shadow-2xl gap-0">
          <div className="bg-primary p-6">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-primary-foreground">
                {editingId ? "Editar finalizadora" : "Nova finalizadora"}
              </DialogTitle>
              <p className="text-primary-foreground/80 text-xs font-medium mt-0.5">
                Configure os detalhes da forma de pagamento
              </p>
            </DialogHeader>
          </div>

          <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Descrição</Label>
              <Input
                placeholder="Ex: Cartão de Débito"
                className="h-10 rounded-xl border-input bg-muted/20 font-semibold focus-visible:ring-primary focus-visible:bg-background transition-all"
                value={formData.fin_descricao}
                onChange={(e) => setFormData({ ...formData, fin_descricao: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Ícone</Label>
                <Select
                  value={formData.fin_icone || "CreditCard"}
                  onValueChange={(v) => setFormData({ ...formData, fin_icone: v })}
                >
                  <SelectTrigger className="h-10 rounded-xl border-input bg-muted/20 font-semibold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {availableIcons.map((item) => (
                      <SelectItem key={item.value} value={item.value} className="rounded-lg">
                        <div className="flex items-center gap-2">
                          <item.icon className="w-4 h-4" />
                          <span className="font-semibold text-xs">{item.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Atalho</Label>
                <Input
                  placeholder="Ex: F1"
                  maxLength={4}
                  className="h-10 rounded-xl border-input bg-muted/20 font-semibold uppercase focus-visible:ring-primary focus-visible:bg-background transition-all"
                  value={formData.fin_codigo_atalho}
                  onChange={(e) => setFormData({ ...formData, fin_codigo_atalho: e.target.value.toUpperCase() })}
                />
              </div>
            </div>

            <ToggleRow
              label="Ativa no PDV"
              hint="Disponível para uso nas vendas"
              checked={formData.fin_ativa}
              onChange={(v) => setFormData({ ...formData, fin_ativa: v })}
            />
            <ToggleRow
              label="Permitir troco"
              hint="Habilita cálculo de troco"
              checked={formData.fin_permite_troco}
              onChange={(v) => setFormData({ ...formData, fin_permite_troco: v })}
            />

            <DialogFooter className="gap-3 pt-3 flex-row">
              <Button
                variant="ghost"
                className="flex-1 h-10 rounded-xl font-bold text-muted-foreground hover:bg-muted/30"
                onClick={handleCloseDialog}
              >
                Cancelar
              </Button>
              <Button
                className="flex-[2] h-10 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-lg shadow-primary/20"
                onClick={() => saveMutation.mutate(formData)}
                disabled={saveMutation.isPending}
              >
                {saveMutation.isPending ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : editingId ? (
                  "Salvar"
                ) : (
                  "Cadastrar"
                )}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="rounded-2xl p-6 max-w-[380px]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-bold text-slate-900 text-center">
              Remover finalizadora?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-500 font-medium pt-1 text-center text-sm">
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="grid grid-cols-2 gap-2 mt-6">
            <AlertDialogCancel className="h-11 rounded-xl font-bold border-slate-200 mt-0">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="h-11 rounded-xl bg-red-500 hover:bg-red-600 font-bold text-white"
              onClick={() => deletingId && deleteMutation.mutate(deletingId)}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function StatPill({
  label,
  value,
  accent,
  icon: Icon,
}: {
  label: string;
  value: number;
  accent: "primary" | "success" | "info" | "slate" | "emerald" | "indigo";
  icon?: React.ComponentType<{ className?: string }>;
}) {
  const palette = {
    primary: "from-primary/10 to-primary/5 text-primary border-primary/20",
    success: "from-emerald-500/10 to-emerald-500/5 text-emerald-600 border-emerald-500/20",
    info: "from-blue-500/10 to-blue-500/5 text-blue-600 border-blue-500/20",
    slate: "from-slate-100 to-slate-50 text-slate-900 border-slate-200/60",
    emerald: "from-emerald-100 to-emerald-50 text-emerald-900 border-emerald-200/60",
    indigo: "from-indigo-100 to-indigo-50 text-indigo-900 border-indigo-200/60",
  }[accent];
  return (
    <div className={`relative bg-gradient-to-br ${palette} border rounded-xl px-3 py-2.5 md:px-4 md:py-3`}>
      <div className="flex items-center gap-1.5">
        {Icon && <Icon className="w-3 h-3 opacity-60" />}
        <p className="text-[9px] md:text-[10px] font-bold uppercase tracking-wider opacity-70">{label}</p>
      </div>
      <p className="text-xl md:text-2xl font-extrabold mt-0.5 leading-none">{value}</p>
    </div>
  );
}

function ToggleRow({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div
      className={`flex items-center justify-between p-3.5 rounded-xl border transition-all ${
        checked ? "border-indigo-200 bg-indigo-50/40" : "border-slate-200 bg-slate-50/50"
      }`}
    >
      <div className="min-w-0">
        <p className="text-sm font-bold text-slate-900">{label}</p>
        <p className="text-[11px] font-medium text-slate-500 truncate">{hint}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} className="data-[state=checked]:bg-primary scale-90" />
    </div>
  );
}

function SortableRow({ fin }: { fin: Finalizadora }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: fin.id });
  const Icon = iconMap[fin.fin_icone || "CreditCard"] || CreditCard;
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : "auto" as any,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 bg-card rounded-xl border border-border p-3 shadow-sm ${
        isDragging ? "shadow-xl ring-2 ring-primary/30" : ""
      }`}
    >
      <button
        {...attributes}
        {...listeners}
        className="touch-none cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-700 p-1 -ml-1"
        aria-label="Arrastar"
      >
        <GripVertical className="w-5 h-5" />
      </button>
      <div
        className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
          fin.fin_ativa ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
        }`}
      >
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-sm text-slate-900 truncate">{fin.fin_descricao}</p>
        <p className="text-[11px] text-slate-500 font-medium">
          {fin.fin_ativa ? "Ativa" : "Inativa"}
          {fin.fin_codigo_atalho && ` · ${fin.fin_codigo_atalho}`}
        </p>
      </div>
    </div>
  );
}
