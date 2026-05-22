import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo, useRef, useEffect } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  MapPin, 
  Search, 
  Plus, 
  Package, 
  CheckCircle2,
  Filter,
  ReceiptText,
  Phone,
  Calendar,
  User,
  Info,
  Printer,
  Share2,
  FileText,
  Edit,
  Trash2,
  XCircle,
  Download,
  CalendarDays,
  Zap,
  ChevronRight,
  MoreHorizontal,
  Clock
} from "lucide-react";
import { dateBR, brl, formatPhone } from "@/lib/format";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
// @ts-ignore
import html2pdf from "html2pdf.js";
import { Badge } from "@/components/ui/badge";
import { CancelationNotice } from "@/components/CancelationNotice";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Cliente, Produto } from "@/lib/types";
import { Checkbox } from "@/components/ui/checkbox";

export const Route = createFileRoute("/visitas")({
  component: VisitasPage,
});

const DICAS_VISITAS = [
  "Registre o interesse das clientes em cores específicas para avisar quando chegarem novidades.",
  "Visitas realizadas com demonstração de produtos têm 60% mais chance de conversão.",
  "Agende visitas em horários de menor movimento para um atendimento mais exclusivo.",
  "Mantenha as observações atualizadas para lembrar do que a cliente mais gostou na última vez.",
  "O roteiro de visitas otimizado economiza tempo e combustível.",
  "Demonstrar peças que combinam com o que a cliente já tem aumenta as vendas casadas.",
  "Um pós-visita via WhatsApp reforça o relacionamento e pode fechar vendas pendentes."
];

function VisitasPage() {
  const dicaAleatoria = useMemo(() => {
    return DICAS_VISITAS[Math.floor(Math.random() * DICAS_VISITAS.length)];
  }, []);

  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [visitaToEdit, setVisitaToEdit] = useState<any>(null);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [visitaToCancelId, setVisitaToCancelId] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [visitaToDeleteId, setVisitaToDeleteId] = useState<string | null>(null);

  const [selectedVisitas, setSelectedVisitas] = useState<string[]>([]);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [printMode, setPrintMode] = useState<"separate" | "combined">("combined");
  const [isWhatsAppOpen, setIsWhatsAppOpen] = useState(false);
  const [whatsAppNumber, setWhatsAppNumber] = useState("");
  const [currentVisitaForWhatsApp, setCurrentVisitaForWhatsApp] = useState<any>(null);
  const [printFormat, setPrintFormat] = useState<"A4" | "LETTER">("A4");
  const [printMargin, setPrintMargin] = useState<number>(15);
  const printContentRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  
  const [selectedClienteId, setSelectedClienteId] = useState("");
  const [dataPrevista, setDataPrevista] = useState(new Date().toISOString().split('T')[0]);
  const [dataReal, setDataReal] = useState("");
  const [dataReagendada, setDataReagendada] = useState("");
  const [selectedProdutos, setSelectedProdutos] = useState<string[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [obs, setObs] = useState("");

  const { data: clientes = [] } = useQuery({
    queryKey: ["clientes-visitas"],
    queryFn: async () => {
      const { data, error } = await supabase.from("tab_clientes").select("*").order("cli_nome");
      if (error) throw error;
      return data as Cliente[];
    },
  });

  const { data: produtos = [] } = useQuery({
    queryKey: ["produtos-visitas-detalhado"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tab_produtos")
        .select(`
          *,
          tab_cores(cor_nome),
          tab_categorias(cat_nome),
          tab_tamanhos(tam_nome)
        `);
      if (error) throw error;
      return data.map(p => ({
        ...p,
        cor_nome: p.tab_cores?.cor_nome,
        categoria_nome: p.tab_categorias?.cat_nome,
        tamanho_nome: p.tab_tamanhos?.tam_nome
      })) as (Produto & { cor_nome?: string; categoria_nome?: string; tamanho_nome?: string })[];
    },
  });

  const { data: categorias = [] } = useQuery({
    queryKey: ["categorias-visitas"],
    queryFn: async () => {
      const { data, error } = await supabase.from("tab_categorias").select("*").order("cat_nome");
      if (error) throw error;
      return data;
    },
  });

  const { data: visitas = [], isLoading } = useQuery({
    queryKey: ["visitas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("view_visitas_detalhada")
        .select("*")
        .is("deleted_at", null)
        .order("vis_data_prevista", { ascending: false });
      if (error) throw error;
      return data.map((v: any) => ({
        id: v.id,
        cliente_id: v.cliente_id,
        cliente_nome: v.cliente_nome,
        cliente_cidade: v.cliente_cidade,
        cliente_endereco: v.cliente_endereco,
        cliente_numero: v.cliente_numero,
        cliente_bairro: v.cliente_bairro,
        cliente_telefone: v.cliente_telefone,
        cliente_documento: v.cliente_documento,
        data_prevista: v.vis_data_prevista,
        data_real: v.vis_data_real,
        data_reagendada: v.vis_data_reagendada,
        vis_status: v.vis_status,
        vis_motivo_cancelamento: v.vis_motivo_cancelamento,
        produtos_demonstrados: v.produtos_detalhes || [],
        observacoes: v.vis_observacoes
      }));
    },
  });

  const addVisitaMutation = useMutation({
    mutationFn: async (newVisita: any) => {
      const { error } = await supabase.from("tab_visitas").insert([{
        vis_cliente_id: newVisita.cliente_id,
        vis_data_prevista: newVisita.data_prevista,
        vis_data_real: newVisita.data_real || null,
        vis_data_reagendada: newVisita.data_reagendada || null,
        vis_produtos_ids: newVisita.produtos_demonstrados,
        vis_observacoes: newVisita.observacoes,
        vis_status: newVisita.vis_status
      }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["visitas"] });
      setIsAddOpen(false);
      setSelectedProdutos([]);
      setSelectedClienteId("");
      setObs("");
      toast.success("Visita registrada com sucesso!");
    },
    onError: (error: any) => {
      if (error.code === '23505') {
        toast.error("Já existe uma visita registrada para esta cliente nesta data com as mesmas observações.");
      } else {
        toast.error(`Erro ao registrar: ${error.message}`);
      }
    }
  });

  const updateVisitaMutation = useMutation({
    mutationFn: async (updatedVisita: any) => {
      const { error } = await supabase
        .from("tab_visitas")
        .update({
          vis_cliente_id: updatedVisita.cliente_id,
          vis_data_prevista: updatedVisita.data_prevista,
          vis_data_real: updatedVisita.data_real || null,
          vis_data_reagendada: updatedVisita.data_reagendada || null,
          vis_produtos_ids: updatedVisita.produtos_demonstrados,
          vis_observacoes: updatedVisita.observacoes,
          vis_status: updatedVisita.vis_status
        })
        .eq("id", updatedVisita.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["visitas"] });
      setIsEditOpen(false);
      setVisitaToEdit(null);
      toast.success("Visita atualizada com sucesso!");
    },
    onError: (error: any) => {
      toast.error(`Erro ao atualizar: ${error.message}`);
    }
  });

  const cancelVisitaMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const { error } = await supabase
        .from("tab_visitas")
        .update({
          vis_status: 'cancelada',
          vis_motivo_cancelamento: reason
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["visitas"] });
      setIsCancelDialogOpen(false);
      setCancelReason("");
      setVisitaToCancelId(null);
      toast.success("Visita cancelada com sucesso!");
    },
    onError: (error: any) => {
      toast.error(`Erro ao cancelar: ${error.message}`);
    }
  });

  const deleteVisitaMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("tab_visitas")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["visitas"] });
      setIsDeleteDialogOpen(false);
      setVisitaToDeleteId(null);
      toast.success("Visita excluída com sucesso!");
    },
    onError: (error: any) => {
      toast.error(`Erro ao excluir: ${error.message}`);
    }
  });

  const filteredVisitas = useMemo(() => {
    return visitas.filter(v => {
      const cliente = clientes.find(c => c.id === v.cliente_id);
      const matchesSearch = cliente?.cli_nome.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === "todos" || v.vis_status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [visitas, clientes, searchTerm, statusFilter]);

  const resetForm = () => {
    setSelectedClienteId("");
    setDataPrevista(new Date().toISOString().split('T')[0]);
    setDataReal("");
    setDataReagendada("");
    setSelectedProdutos([]);
    setProductSearch("");
    setObs("");
    setSelectedCategory(null);
  };

  const handleAddVisita = () => {
    if (!selectedClienteId) {
      toast.error("Selecione uma cliente");
      return;
    }
    const normalizedObs = obs.trim();
    if (normalizedObs.length > 100) {
      toast.error("A observação deve ter no máximo 100 caracteres");
      return;
    }
    let status = 'agendada';
    if (dataReal) status = 'realizada';
    else if (dataReagendada) status = 'reagendada';
    
    addVisitaMutation.mutate({
      cliente_id: selectedClienteId,
      data_prevista: dataPrevista,
      data_real: dataReal || null,
      data_reagendada: dataReagendada || null,
      produtos_demonstrados: selectedProdutos,
      observacoes: normalizedObs || null,
      vis_status: status
    });
  };

  const filteredProducts = useMemo(() => {
    return produtos
      .filter(p => {
        const searchStr = [
          p.pro_descricao,
          p.pro_codigo,
          p.categoria_nome,
          p.cor_nome,
          p.tamanho_nome
        ].filter(Boolean).join(" ").toLowerCase();
        const matchesSearch = searchStr.includes(productSearch.toLowerCase());
        const matchesCategory = !selectedCategory || p.pro_categoria_id === selectedCategory;
        return matchesSearch && matchesCategory;
      })
      .sort((a, b) => {
        const catA = a.categoria_nome || "";
        const catB = b.categoria_nome || "";
        if (catA !== catB) return catA.localeCompare(catB);
        const descA = a.pro_descricao || "";
        const descB = b.pro_descricao || "";
        if (descA !== descB) return descA.localeCompare(descB);
        const corA = a.cor_nome || "";
        const corB = b.cor_nome || "";
        if (corA !== corB) return corA.localeCompare(corB);
        return (a.tamanho_nome || "").localeCompare(b.tamanho_nome || "");
      });
  }, [produtos, productSearch, selectedCategory]);

  const handleOpenEdit = (visita: any) => {
    setVisitaToEdit(visita);
    setSelectedClienteId(visita.cliente_id);
    setDataPrevista(visita.data_prevista);
    setDataReal(visita.data_real || "");
    setDataReagendada(visita.data_reagendada || "");
    setSelectedProdutos(visita.produtos_demonstrados.map((p: any) => p.id));
    setObs(visita.observacoes || "");
    setIsEditOpen(true);
  };

  const handleUpdateVisita = () => {
    if (!selectedClienteId) {
      toast.error("Selecione uma cliente");
      return;
    }
    const normalizedObs = obs.trim();
    if (normalizedObs.length > 100) {
      toast.error("A observação deve ter no máximo 100 caracteres");
      return;
    }
    let status = 'agendada';
    if (dataReal) status = 'realizada';
    else if (dataReagendada) status = 'reagendada';

    updateVisitaMutation.mutate({
      id: visitaToEdit.id,
      cliente_id: selectedClienteId,
      data_prevista: dataPrevista,
      data_real: dataReal || null,
      data_reagendada: dataReagendada || null,
      produtos_demonstrados: selectedProdutos,
      observacoes: normalizedObs || null,
      vis_status: status
    });
  };

  const handleOpenCancel = (id: string) => {
    setVisitaToCancelId(id);
    setCancelReason("");
    setIsCancelDialogOpen(true);
  };

  const handleConfirmCancel = () => {
    const reason = cancelReason.trim();
    if (!reason) {
      toast.error("A justificativa é obrigatória para cancelar");
      return;
    }
    if (reason.length > 100) {
      toast.error("A justificativa deve ter no máximo 100 caracteres");
      return;
    }
    if (visitaToCancelId) {
      cancelVisitaMutation.mutate({ 
        id: visitaToCancelId, 
        reason
      });
    }
  };

  const handleOpenDelete = (id: string) => {
    setVisitaToDeleteId(id);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (visitaToDeleteId) {
      deleteVisitaMutation.mutate(visitaToDeleteId);
    }
  };

  const handlePrintSelected = () => {
    if (selectedVisitas.length === 0) {
      toast.error("Selecione ao menos uma visita para imprimir");
      return;
    }
    setIsPreviewOpen(true);
  };

  const confirmPrint = () => {
    setIsPreviewOpen(false);
    setTimeout(() => {
      window.print();
    }, 500);
  };

  const handleDownloadPDF = async () => {
    if (!printContentRef.current) return;
    
    setIsDownloading(true);
    const element = printContentRef.current;
    
    const opt = {
      margin: [printMargin, printMargin, printMargin, printMargin] as [number, number, number, number],
      filename: `visitas-${new Date().toISOString().split('T')[0]}.pdf`,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { 
        scale: 2, 
        useCORS: true,
        letterRendering: true,
      },
      jsPDF: { unit: 'mm' as const, format: 'a4', orientation: 'portrait' as const }
    };

    try {
      const worker = html2pdf().set(opt).from(element);
      await worker.save();
      toast.success("PDF gerado com sucesso!");
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      toast.error("Erro ao gerar o PDF. Tente novamente.");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleShareWhatsApp = (visita: any) => {
    setCurrentVisitaForWhatsApp(visita);
    setWhatsAppNumber(visita.cliente_telefone || "");
    setIsWhatsAppOpen(true);
  };

  const confirmWhatsAppShare = () => {
    if (!whatsAppNumber) {
      toast.error("Informe um número de WhatsApp");
      return;
    }
    if (!currentVisitaForWhatsApp) return;

    const v = currentVisitaForWhatsApp;
    const totalProdutos = v.produtos_demonstrados?.length || 0;
    const valorTotal = v.produtos_demonstrados?.reduce((acc: number, p: any) => acc + (p.valor_unitario || 0), 0) || 0;

    let message = `*RELATÓRIO DE VISITA*\n\n`;
    message += `*Cliente:* ${v.cliente_nome}\n`;
    message += `*Data:* ${dateBR(v.data_prevista || "")}\n`;
    message += `*Status:* ${v.data_real ? 'Concluída' : 'Agendada'}\n\n`;
    message += `*PRODUTOS DEMONSTRADOS:*\n`;

    v.produtos_demonstrados.forEach((p: any) => {
      message += `- ${p.descricao} (${p.cor || 'N/A'}, ${p.tamanho || 'N/A'}) - ${brl(p.valor_unitario || 0)}\n`;
    });

    message += `\n*TOTAL DE ITENS:* ${totalProdutos}\n`;
    message += `*VALOR TOTAL:* ${brl(valorTotal)}\n\n`;
    
    if (v.observacoes) {
      message += `*OBS:* ${v.observacoes}\n\n`;
    }

    message += `Obrigado pela atenção!`;
    const encodedMessage = encodeURIComponent(message);
    const cleanNumber = whatsAppNumber.replace(/\D/g, '');
    const whatsappUrl = `https://wa.me/${cleanNumber.startsWith('55') ? cleanNumber : '55' + cleanNumber}?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
    setIsWhatsAppOpen(false);
  };

  const toggleSelectVisita = (id: string) => {
    setSelectedVisitas(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const VisitaReceipt = ({ v, isPrint = false }: { v: any, isPrint?: boolean }) => {
    const totalProdutos = v.produtos_demonstrados?.length || 0;
    const valorTotal = v.produtos_demonstrados?.reduce((acc: number, p: any) => acc + (p.valor_unitario || 0), 0) || 0;
    
    return (
      <div 
        className={`bg-white font-mono text-slate-900 mx-auto px-4 sm:px-0 ${isPrint ? 'w-full border-none shadow-none p-0' : 'py-8 w-full max-w-[400px] text-[11px] leading-tight'}`}
        style={!isPrint ? undefined : { 
          paddingLeft: '0', 
          paddingRight: '0',
          paddingTop: '0',
          paddingBottom: '0'
        }}
      >
        <div className="text-center border-b-2 border-dashed border-black pb-3 mb-4 relative">
          {/* Cabeçalho removido a pedido do usuário */}
          <CancelationNotice 
            status={v.vis_status} 
            reason={v.vis_motivo_cancelamento} 
            className="mb-4"
            isPrint={isPrint}
          />
          <h3 className="text-lg font-black uppercase tracking-widest flex items-center justify-center gap-2">
            <ReceiptText className="h-5 w-5" />
            Relatório de Visita
          </h3>
          <p className="text-[10px] font-bold mt-1 tracking-tighter">CONTROLE Nº: {v.id.split('-')[0].toUpperCase()}</p>
        </div>

        {/* Motivo já exibido pelo componente CancelationNotice acima */}

        <div className="space-y-2 mb-4 border-b border-dashed border-slate-300 pb-4">
          <div className="flex justify-between uppercase font-bold text-[10px]">
            <span>Data Prevista:</span>
            <span>{dateBR(v.data_prevista || "")}</span>
          </div>
          {v.data_real && (
            <div className="flex justify-between uppercase font-bold text-[10px]">
              <span>Visita Realizada:</span>
              <span>{dateBR(v.data_real)}</span>
            </div>
          )}
          {v.data_reagendada && (
            <div className="flex justify-between uppercase font-bold text-[10px]">
              <span>Visita Reagendada:</span>
              <span>{dateBR(v.data_reagendada)}</span>
            </div>
          )}
          <div className="flex justify-between uppercase font-bold text-[10px]">
            <span>Status:</span>
            <span className="capitalize">{v.vis_status}</span>
          </div>
        </div>

        <div className="space-y-1 mb-4 border-b border-dashed border-slate-300 pb-4">
          <div className="flex items-center gap-1 mb-1">
            <User className="h-3 w-3 shrink-0" />
            <span className="uppercase font-black text-[12px] truncate">{v.cliente_nome}</span>
          </div>
          <div className="grid grid-cols-1 gap-0.5 text-slate-600 pl-4 break-words text-[10px]">
            {v.cliente_documento && <p>CPF/CNPJ: {v.cliente_documento}</p>}
            <p className="flex items-start gap-1">
              <MapPin className="h-2 w-2 mt-0.5 shrink-0" />
              <span>{v.cliente_endereco}, {v.cliente_numero}</span>
            </p>
            <p className="pl-3">{v.cliente_bairro} - {v.cliente_cidade}</p>
            {v.cliente_telefone && (
              <p className="flex items-center gap-1">
                <Phone className="h-2 w-2 shrink-0" />
                {formatPhone(v.cliente_telefone)}
              </p>
            )}
          </div>
        </div>

        <div className="mb-4">
          <div className="grid grid-cols-12 font-bold border-b-2 border-black pb-1 mb-2 uppercase text-[10px] tracking-wider">
            <span className="col-span-8">Descrição Detalhada</span>
            <span className="col-span-1 text-center">Qtd</span>
            <span className="col-span-3 text-right">Valor</span>
          </div>
          <div className={`${isPrint ? '' : 'max-h-[350px] overflow-y-auto pr-2 custom-scrollbar'} space-y-3`}>
            {[...v.produtos_demonstrados]
              .sort((a: any, b: any) => a.descricao.localeCompare(b.descricao))
              .map((p: any) => (
              <div key={p.id} className="grid grid-cols-12 gap-y-1 border-b border-slate-200 pb-2 last:border-0">
                <div className="col-span-8 flex flex-col min-w-0">
                  <span className="font-black uppercase text-[11px] leading-tight text-slate-900">{p.descricao}</span>
                  <div className="flex flex-wrap items-center gap-x-1 gap-y-0.5 mt-1 text-[8px] font-bold text-slate-500 uppercase">
                    {p.categoria && <span className="bg-slate-200 px-1 rounded text-slate-700">{p.categoria}</span>}
                    {p.cor && <span>• COR: {p.cor}</span>}{p.tamanho && <span>• TAM: {p.tamanho}</span>}
                  </div>
                </div>
                <span className="col-span-1 text-center font-bold pt-0.5 text-[10px]">01</span>
                <span className="col-span-3 text-right font-black text-[11px] pt-0.5">{brl(p.valor_unitario || 0)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t-2 border-slate-800 pt-3 mt-4 space-y-1">
          <div className="flex justify-between font-black text-[11px] uppercase">
            <span>Total de Itens:</span>
            <span>{String(totalProdutos).padStart(2, '0')}</span>
          </div>
          <div className="flex justify-between font-black text-[13px] uppercase">
            <span>Valor Total:</span>
            <span>{brl(valorTotal)}</span>
          </div>
        </div>

        <div className="text-center mt-8 pt-4 border-t border-dashed border-slate-300">
          <p className="uppercase text-[9px] font-bold opacity-40">*** Fim do Relatório ***</p>
          <p className="text-[8px] mt-1 text-slate-400">Emissão: {new Date().toLocaleString('pt-BR')}</p>
        </div>
      </div>
    );
  };

  const VisitaFormFields = () => {
    const [localSearch, setLocalSearch] = useState("");
    
    return (
    <div className="grid gap-6 py-4">
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4">
          <div className="space-y-2">
            <Label>Cliente</Label>
            <Select onValueChange={setSelectedClienteId} value={selectedClienteId}>
              <SelectTrigger className="h-14 rounded-xl bg-muted/20 border-none px-4">
                <SelectValue placeholder="Selecione a cliente..." />
              </SelectTrigger>
              <SelectContent className="rounded-xl max-h-[300px]">
                <div className="p-2 sticky top-0 bg-popover z-10 border-b">
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Filtrar clientes..."
                      className="h-9 pl-8 rounded-lg"
                      autoFocus
                      onChange={(e) => {
                        const search = e.target.value.toLowerCase();
                        const items = document.querySelectorAll('[role="option"]');
                        items.forEach((item) => {
                          const text = item.textContent?.toLowerCase() || "";
                          (item as HTMLElement).style.display = text.includes(search) ? "flex" : "none";
                        });
                      }}
                    />
                  </div>
                </div>
                {clientes.map(c => (
                  <SelectItem key={c.id} value={c.id} className="rounded-lg py-3">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-bold text-sm">{c.cli_nome}</span>
                      <span className="text-[10px] text-muted-foreground leading-tight">
                        {[c.cli_endereco, c.cli_numero, c.cli_bairro, c.cli_cidade, c.cli_telefone].filter(Boolean).join(", ")}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Data Prevista</Label>
              <Input type="date" value={dataPrevista} onChange={e => setDataPrevista(e.target.value)} className="h-11 rounded-xl bg-muted/20 border-none" />
            </div>
            <div className="space-y-2">
              <Label>Visita Realizada</Label>
              <Input type="date" value={dataReal} onChange={e => setDataReal(e.target.value)} className="h-11 rounded-xl bg-muted/20 border-none" />
            </div>
            <div className="space-y-2">
              <Label>Visita Reagendada</Label>
              <Input type="date" value={dataReagendada} onChange={e => setDataReagendada(e.target.value)} className="h-11 rounded-xl bg-muted/20 border-none" />
            </div>
          </div>
        </div>
      </div>
      <div className="space-y-4">
        <div className="flex flex-col gap-3">
          <Label>Produtos Demonstrados</Label>
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Pesquisar produto..." 
              value={productSearch}
              onChange={e => setProductSearch(e.target.value.slice(0, 32))}
              maxLength={32}
              className="h-11 pl-10 rounded-xl bg-muted/20 border-none w-full"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant={selectedCategory === null ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(null)}
              className="rounded-full h-8 text-xs"
            >
              Tudo
            </Button>
            {categorias.map(cat => (
              <Button
                key={cat.id}
                variant={selectedCategory === cat.id ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(cat.id)}
                className="rounded-full h-8 text-xs"
              >
                {cat.cat_nome}
              </Button>
            ))}
          </div>
        </div>
        <ScrollArea className="h-64 border rounded-2xl p-4 bg-muted/5">
          <div className="grid grid-cols-1 gap-2">
            {filteredProducts.map(p => (
              <div 
                key={p.id} 
                className={`flex items-center gap-3 text-sm p-3 hover:bg-muted/50 rounded-xl cursor-pointer transition-colors border ${selectedProdutos.includes(p.id) ? 'border-primary/50 bg-primary/5' : 'border-transparent'}`} 
                onClick={() => setSelectedProdutos(prev => prev.includes(p.id) ? prev.filter(id => id !== p.id) : [...prev, p.id])}
              >
                <div className={`h-5 w-5 shrink-0 rounded-md border flex items-center justify-center transition-all ${selectedProdutos.includes(p.id) ? 'bg-primary border-primary text-white scale-110' : 'border-muted-foreground/30'}`}>
                  {selectedProdutos.includes(p.id) && <CheckCircle2 className="h-3.5 w-3.5" />}
                </div>
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-foreground">{p.pro_descricao}</span>
                    {p.categoria_nome && <Badge variant="outline" className="text-[9px] h-4 px-1 bg-primary/5 text-primary border-primary/20">{p.categoria_nome}</Badge>}
                  </div>
                  <div className="text-[11px] text-muted-foreground flex items-center gap-2 flex-wrap mt-0.5">
                    <Badge variant="secondary" className="px-1 py-0 h-4 text-[9px] font-normal">{p.pro_codigo || 'S/C'}</Badge>
                    {p.cor_nome && <span className="flex items-center gap-1"><span className="opacity-50">•</span><span className="font-medium">Cor: {p.cor_nome}</span></span>}
                    {p.tamanho_nome && <span className="flex items-center gap-1"><span className="opacity-50">•</span><span className="font-medium">Tam: {p.tamanho_nome}</span></span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <Label>Observações</Label>
          <span className="text-[10px] text-muted-foreground">{obs.length}/100</span>
        </div>
        <Input 
          value={obs} 
          onChange={e => setObs(e.target.value.slice(0, 100))} 
          maxLength={100}
          placeholder="Ex: Demonstrou interesse na nova coleção" 
          className="h-11 rounded-xl bg-muted/20 border-none" 
        />
      </div>
    </div>
    );
  };

  return (
    <div className="space-y-8 pb-12 animate-in fade-in duration-700 print:p-0">
      <style>
        {`
          @media print {
            @page {
              size: ${printFormat === "A4" ? "210mm 297mm" : "letter"};
              margin: 10mm;
            }
            html, body, #root { 
              background: white !important;
              height: auto !important;
              min-height: 0 !important;
              padding: 0 !important;
              margin: 0 !important;
              overflow: visible !important;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            [data-radix-portal] { display: none !important; }
            body * { visibility: hidden; }
            .print-only, .print-only * { visibility: visible !important; }
            .print-only { 
              position: static !important;
              width: 100% !important;
              margin: 0 !important;
              padding: 0 !important;
              display: block !important;
              min-height: 0 !important;
              background: white !important;
            }
            .no-print { display: none !important; }
            .print-card-wrapper {
              width: 100% !important;
              padding: 0 !important;
              margin: 0 0 2rem 0 !important;
              background: white !important;
              break-inside: avoid !important;
              page-break-inside: avoid !important;
              display: block !important;
              position: relative !important;
            }
            .print-card-wrapper:last-child {
              margin-bottom: 0 !important;
              page-break-after: avoid !important;
              break-after: avoid !important;
            }
            .page-break-always {
              page-break-after: always !important;
              break-after: page !important;
            }
          }
        `}
      </style>
      
      {/* Header Section */}
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between no-print">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest">
            <CalendarDays className="h-3 w-3 fill-current" /> Gestão de Campo
          </div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight text-slate-900 leading-none">
            Roteiro de <span className="text-primary italic">Visitas</span>
          </h1>
          <p className="text-muted-foreground text-sm font-medium">
            <span className="text-primary font-bold">Dica:</span> {dicaAleatoria}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {selectedVisitas.length > 0 && (
            <div className="flex items-center gap-2 bg-card/50 backdrop-blur-sm border border-border/40 rounded-2xl p-1.5 shadow-sm">
              <Select value={printFormat} onValueChange={(v: any) => setPrintFormat(v)}>
                <SelectTrigger className="w-[100px] border-none shadow-none h-9 text-xs font-bold uppercase tracking-tight focus:ring-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-none shadow-2xl">
                  <SelectItem value="A4" className="rounded-xl font-bold text-xs uppercase">A4</SelectItem>
                  <SelectItem value="LETTER" className="rounded-xl font-bold text-xs uppercase">Carta</SelectItem>
                </SelectContent>
              </Select>
              <Button 
                onClick={handlePrintSelected} 
                variant="ghost" 
                size="sm" 
                className="h-9 px-4 rounded-xl text-xs font-bold border-l border-border/40 text-primary hover:bg-primary/5"
              >
                <Printer className="mr-2 h-3.5 w-3.5" />
                Imprimir ({selectedVisitas.length})
              </Button>
            </div>
          )}

          <Dialog open={isAddOpen} onOpenChange={(open) => { if (open) resetForm(); setIsAddOpen(open); }}>
            <DialogTrigger asChild>
              <Button size="sm" className="h-11 px-6 rounded-2xl shadow-xl shadow-primary/20 bg-primary hover:scale-[1.02] active:scale-[0.98] transition-all font-black uppercase tracking-widest text-[10px]">
                <Plus className="mr-2 h-4 w-4" /> Novo Agendamento
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[650px] rounded-[2.5rem] p-0 overflow-hidden border-none shadow-2xl">
              <div className="bg-slate-900 text-white p-8 relative shrink-0">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full -mr-16 -mt-16 blur-3xl" />
                <DialogHeader>
                  <div className="flex items-center gap-4 relative z-10">
                    <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center">
                      <MapPin className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <DialogTitle className="text-xl font-black uppercase tracking-tight text-white leading-none mb-1">
                        Agendar Visita
                      </DialogTitle>
                      <DialogDescription className="text-white/40 text-[10px] font-bold uppercase tracking-widest">
                        Planeje sua demonstração de produtos
                      </DialogDescription>
                    </div>
                  </div>
                </DialogHeader>
              </div>
              
              <div className="p-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
                <VisitaFormFields />
              </div>

              <div className="p-6 bg-slate-50 border-t shrink-0">
                <Button 
                  onClick={handleAddVisita} 
                  disabled={addVisitaMutation.isPending} 
                  className="w-full h-12 rounded-2xl bg-slate-900 text-white font-black uppercase tracking-widest text-xs shadow-xl shadow-slate-900/20 active:scale-95 transition-all"
                >
                  {addVisitaMutation.isPending ? "Processando..." : "Confirmar Agendamento"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Summary Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 no-print">
        <Card className="rounded-3xl border-none shadow-sm bg-card/50 backdrop-blur-sm p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center shrink-0">
            <Calendar className="h-6 w-6 text-blue-500" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground leading-none mb-1">Total</p>
            <p className="text-xl font-black text-slate-900 leading-none">{visitas.length}</p>
          </div>
        </Card>
        <Card className="rounded-3xl border-none shadow-sm bg-card/50 backdrop-blur-sm p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center shrink-0">
            <CheckCircle2 className="h-6 w-6 text-emerald-500" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground leading-none mb-1">Realizadas</p>
            <p className="text-xl font-black text-slate-900 leading-none">{visitas.filter(v => v.vis_status === 'realizada').length}</p>
          </div>
        </Card>
        <Card className="rounded-3xl border-none shadow-sm bg-card/50 backdrop-blur-sm p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center shrink-0">
            <Clock className="h-6 w-6 text-amber-500" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground leading-none mb-1">Pendentes</p>
            <p className="text-xl font-black text-slate-900 leading-none">{visitas.filter(v => v.vis_status === 'agendada').length}</p>
          </div>
        </Card>
        <Card className="rounded-3xl border-none shadow-sm bg-card/50 backdrop-blur-sm p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
            <Package className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground leading-none mb-1">Itens em Campo</p>
            <p className="text-xl font-black text-slate-900 leading-none">
              {visitas.reduce((acc, v) => acc + (v.produtos_demonstrados?.length || 0), 0)}
            </p>
          </div>
        </Card>
      </div>

      {/* Filters Section */}
      <div className="flex flex-col gap-4 bg-white/50 backdrop-blur-md p-6 rounded-[2rem] border border-border/40 shadow-xl no-print">
        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <div className="relative flex-1 group w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-primary transition-colors" />
            <Input 
              placeholder="Pesquisar por nome da cliente..." 
              className="pl-12 h-14 bg-white/80 border-none shadow-sm rounded-2xl text-base font-medium placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-primary/20" 
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)} 
            />
          </div>
          <div className="w-full sm:w-64">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-14 bg-white/80 border-none shadow-sm rounded-2xl text-[10px] font-black uppercase tracking-widest px-6 focus:ring-2 focus:ring-primary/20">
                <SelectValue placeholder="Filtrar Status" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl border-none shadow-2xl">
                <SelectItem value="todos" className="rounded-xl font-bold text-xs uppercase">Todos os Status</SelectItem>
                <SelectItem value="agendada" className="rounded-xl font-bold text-xs uppercase">Agendada</SelectItem>
                <SelectItem value="realizada" className="rounded-xl font-bold text-xs uppercase text-emerald-600">Realizada</SelectItem>
                <SelectItem value="reagendada" className="rounded-xl font-bold text-xs uppercase text-blue-600">Reagendada</SelectItem>
                <SelectItem value="cancelada" className="rounded-xl font-bold text-xs uppercase text-red-600">Cancelada</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-20 text-muted-foreground animate-pulse no-print">Carregando visitas...</div>
      ) : filteredVisitas.length === 0 ? (
        <Card className="border-dashed py-20 text-center rounded-3xl bg-muted/5 no-print">
          <CardContent className="flex flex-col items-center">
            <div className="mb-4 rounded-full bg-muted p-4"><Search className="h-8 w-8 text-muted-foreground/30" /></div>
            <h3 className="text-lg font-bold">Nenhuma visita encontrada</h3>
          </CardContent>
        </Card>
      ) : (
        <div id="print-area" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredVisitas.map(v => {
            const isSelected = selectedVisitas.includes(v.id);
            return (
              <div key={v.id} className={!isSelected && selectedVisitas.length > 0 ? "no-print" : ""}>
                <div className="hidden print:block w-full">
                  <VisitaReceipt v={v} isPrint={true} />
                </div>
                <div className="no-print h-full">
                  <HoverCard openDelay={200}>
                    <HoverCardTrigger asChild>
                    <Card className={`hover:shadow-xl transition-all group overflow-hidden border-none shadow-sm cursor-help relative h-full flex flex-col rounded-[2rem] ${isSelected ? 'ring-2 ring-primary bg-primary/5' : 'bg-card/40 backdrop-blur-sm'} ${v.vis_status === 'cancelada' ? 'opacity-75 grayscale-[0.5]' : ''}`}>
                      <div className={`h-1.5 w-full shrink-0 ${v.vis_status === 'cancelada' ? 'bg-red-400/50' : 'bg-primary/20'}`} />
                      <CardContent className="p-6 flex-1 flex flex-col">
                        <div className="flex justify-between items-start mb-6">
                          <div className="flex items-start gap-3 min-w-0 pr-2">
                            <Checkbox checked={isSelected} onCheckedChange={() => toggleSelectVisita(v.id)} className="mt-1.5 no-print rounded-lg border-slate-300 data-[state=checked]:bg-primary data-[state=checked]:border-primary" />
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="font-black text-slate-900 truncate tracking-tight">{v.cliente_nome}</h4>
                                {v.vis_status === 'reagendada' && <Badge variant="outline" className="h-5 text-[8px] px-2 font-black uppercase border-blue-500 text-blue-600 bg-blue-50 rounded-full">Reagendada</Badge>}
                                {v.vis_status === 'realizada' && <Badge variant="outline" className="h-5 text-[8px] px-2 font-black uppercase border-emerald-500 text-emerald-600 bg-emerald-50 rounded-full">Realizada</Badge>}
                              </div>
                              <div className="flex items-center gap-1.5 mt-1 text-slate-500 font-bold uppercase text-[9px] tracking-widest">
                                <Calendar className="h-3 w-3 text-primary" />
                                <span>{dateBR(v.data_prevista || "")}</span>
                                {v.data_reagendada && <span className="text-blue-600 ml-1">→ {dateBR(v.data_reagendada)}</span>}
                              </div>
                            </div>
                          </div>
                          <Badge variant="secondary" className="bg-white shadow-sm border border-slate-100 text-slate-900 font-black text-[10px] h-7 px-3 rounded-full shrink-0">{v.produtos_demonstrados?.length || 0} Itens</Badge>
                        </div>

                        <div className="space-y-3 mb-6">
                          <div className="flex items-start gap-3 text-slate-600 bg-slate-50/80 p-3 rounded-2xl">
                            <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-primary/40" />
                            <span className="text-[11px] font-medium leading-tight line-clamp-2">
                              {[v.cliente_endereco, v.cliente_numero, v.cliente_bairro, v.cliente_cidade].filter(Boolean).join(", ")}
                            </span>
                          </div>
                          {v.cliente_telefone && (
                            <div className="flex items-center gap-3 text-slate-600 px-3">
                              <Phone className="h-4 w-4 shrink-0 text-primary/40" />
                              <span className="text-[11px] font-bold tracking-tight">{formatPhone(v.cliente_telefone)}</span>
                            </div>
                          )}
                        </div>

                        <div className="mt-auto">
                          <CancelationNotice 
                            status={v.vis_status} 
                            reason={v.vis_motivo_cancelamento} 
                            className="mb-4 no-print"
                          />
                          
                          <div className="flex items-center justify-between pt-4 border-t border-dashed border-slate-200 no-print">
                            <div className="flex gap-1">
                              {v.vis_status !== 'cancelada' && (
                                <>
                                  <Button size="icon" variant="ghost" className="h-9 w-9 rounded-xl hover:bg-blue-50 text-blue-600 transition-colors" onClick={(e) => { e.stopPropagation(); handleOpenEdit(v); }}><Edit className="h-4 w-4" /></Button>
                                  <Button size="icon" variant="ghost" className="h-9 w-9 rounded-xl hover:bg-red-50 text-red-500 transition-colors" onClick={(e) => { e.stopPropagation(); handleOpenCancel(v.id); }}><XCircle className="h-4 w-4" /></Button>
                                </>
                              )}
                              <Button size="icon" variant="ghost" className="h-9 w-9 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-red-600 transition-colors" onClick={(e) => { e.stopPropagation(); handleOpenDelete(v.id); }}><Trash2 className="h-4 w-4" /></Button>
                            </div>
                            
                            <div className="flex gap-1">
                              <Button size="icon" variant="ghost" className="h-9 w-9 rounded-xl hover:bg-emerald-50 text-emerald-600 transition-colors" onClick={(e) => { e.stopPropagation(); handleShareWhatsApp(v); }}>
                                <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" xmlns="http://www.w3.org/2000/svg">
                                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                              </Button>
                              <Button size="icon" variant="ghost" className="h-9 w-9 rounded-xl hover:bg-slate-100 text-slate-600 transition-colors" onClick={(e) => { e.stopPropagation(); window.print(); }}><Printer className="h-4 w-4" /></Button>
                            </div>
                          </div>
                        </div>
                        <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-20 transition-opacity no-print"><Info className="h-3 w-3 text-slate-900" /></div>
                      </CardContent>
                    </Card>
                    </HoverCardTrigger>
                    <HoverCardContent 
                      side="right" 
                      align="start" 
                      sideOffset={15} 
                      className="p-0 rounded-2xl overflow-hidden border-2 border-primary/10 shadow-2xl z-50 w-auto max-w-[90vw] lg:max-w-[450px] max-h-[85vh] overflow-y-auto"
                    >
                      <div className="relative">
                        <VisitaReceipt v={v} />
                      </div>
                    </HoverCardContent>
                  </HoverCard>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={isWhatsAppOpen} onOpenChange={setIsWhatsAppOpen}>
        <DialogContent className="sm:max-w-[425px] rounded-[2.5rem] p-0 overflow-hidden border-none shadow-2xl">
          <div className="bg-emerald-600 text-white p-8 relative shrink-0">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-3xl" />
            <DialogHeader>
              <div className="flex items-center gap-4 relative z-10">
                <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
                  <svg viewBox="0 0 24 24" className="h-6 w-6 fill-current text-white" xmlns="http://www.w3.org/2000/svg">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                </div>
                <div>
                  <DialogTitle className="text-xl font-black uppercase tracking-tight text-white leading-none mb-1">
                    Enviar WhatsApp
                  </DialogTitle>
                  <DialogDescription className="text-white/60 text-[10px] font-bold uppercase tracking-widest">
                    Compartilhe o roteiro com a cliente
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
          </div>
          <div className="p-8">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase text-muted-foreground ml-1">Número (com DDD)</Label>
              <Input value={whatsAppNumber} onChange={e => setWhatsAppNumber(e.target.value)} placeholder="Ex: 11999999999" className="h-12 rounded-2xl bg-muted/20 border-none px-6 text-lg font-bold" />
            </div>
          </div>
          <div className="p-6 bg-slate-50 border-t">
            <Button onClick={confirmWhatsAppShare} className="w-full h-12 rounded-2xl font-black uppercase tracking-widest text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-xl shadow-emerald-600/20 active:scale-95 transition-all">
              Enviar Agora
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="sm:max-w-[850px] h-[95vh] flex flex-col p-0 overflow-hidden rounded-[2.5rem] no-print border-none shadow-2xl">
          <div className="bg-slate-900 text-white p-8 relative shrink-0">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full -mr-16 -mt-16 blur-3xl" />
            <DialogHeader>
              <div className="flex items-center gap-4 relative z-10">
                <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center">
                  <Printer className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-black uppercase tracking-tight text-white leading-none mb-1">
                    Pré-visualização
                  </DialogTitle>
                  <DialogDescription className="text-white/40 text-[10px] font-bold uppercase tracking-widest">
                    {selectedVisitas.length} {selectedVisitas.length === 1 ? 'visita selecionada' : 'visitas selecionadas'}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
          </div>
          
          <div className="bg-slate-50 p-4 border-b flex items-center justify-between no-print shrink-0 px-8">
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Modo:</span>
              <div className="bg-white p-1 rounded-xl shadow-sm border flex gap-1">
                <Button 
                  variant={printMode === "combined" ? "default" : "ghost"} 
                  size="sm" 
                  onClick={() => setPrintMode("combined")}
                  className={cn("h-8 rounded-lg text-[10px] font-black uppercase tracking-wider px-4", printMode === "combined" ? "bg-slate-900 text-white" : "text-slate-500")}
                >
                  Documento Único
                </Button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="h-8 rounded-xl px-4 border-slate-200 text-slate-500 font-bold text-[10px] uppercase">Formato {printFormat}</Badge>
            </div>
          </div>
          
          <ScrollArea className="flex-1 p-6 bg-slate-100">
            <div 
              ref={printContentRef} 
              className="flex flex-col gap-8 w-full mx-auto"
              style={{ paddingLeft: `${printMargin}mm`, paddingRight: `${printMargin}mm` }}
            >
              {visitas
                .filter(v => selectedVisitas.includes(v.id))
                .map(v => (
                  <div key={v.id} className="bg-white shadow-xl rounded-sm overflow-hidden ring-1 ring-black/5">
                    <VisitaReceipt v={v} isPrint={true} />
                  </div>
                ))}
            </div>
          </ScrollArea>
          
          <DialogFooter className="p-6 border-t shrink-0 bg-white gap-2 flex-wrap sm:flex-nowrap">
            <Button variant="outline" onClick={() => setIsPreviewOpen(false)} className="rounded-xl h-11 px-6">Cancelar</Button>
            <Button 
              variant="secondary" 
              onClick={handleDownloadPDF} 
              disabled={isDownloading}
              className="rounded-xl h-11 px-6 font-bold"
            >
              <Download className="h-4 w-4 mr-2" />
              {isDownloading ? "Baixando..." : "Baixar PDF"}
            </Button>
            <Button onClick={confirmPrint} className="rounded-xl h-11 px-6 font-bold shadow-lg shadow-primary/20">
              <Printer className="h-4 w-4 mr-2" />
              Imprimir Agora
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[650px] rounded-[2.5rem] p-0 overflow-hidden border-none shadow-2xl">
          <div className="bg-slate-900 text-white p-8 relative shrink-0">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/20 rounded-full -mr-16 -mt-16 blur-3xl" />
            <DialogHeader>
              <div className="flex items-center gap-4 relative z-10">
                <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center">
                  <Edit className="h-6 w-6 text-blue-400" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-black uppercase tracking-tight text-white leading-none mb-1">
                    Editar Visita
                  </DialogTitle>
                  <DialogDescription className="text-white/40 text-[10px] font-bold uppercase tracking-widest">
                    Atualize as informações do agendamento
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
          </div>
          
          <div className="p-8 max-h-[60vh] overflow-y-auto custom-scrollbar">
            <VisitaFormFields />
          </div>

          <div className="p-6 bg-slate-50 border-t shrink-0">
            <Button 
              onClick={handleUpdateVisita} 
              disabled={updateVisitaMutation.isPending} 
              className="w-full h-12 rounded-2xl bg-slate-900 text-white font-black uppercase tracking-widest text-xs shadow-xl shadow-slate-900/20 active:scale-95 transition-all"
            >
              {updateVisitaMutation.isPending ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
        <DialogContent className="sm:max-w-[450px] rounded-[2.5rem] p-0 overflow-hidden border-none shadow-2xl">
          <div className="bg-red-50 text-red-600 p-8 relative shrink-0 border-b border-red-100">
            <DialogHeader>
              <div className="flex items-center gap-4 relative z-10">
                <div className="w-12 h-12 rounded-2xl bg-red-100 flex items-center justify-center">
                  <XCircle className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-black uppercase tracking-tight leading-none mb-1">
                    Cancelar Visita
                  </DialogTitle>
                  <DialogDescription className="text-red-400 text-[10px] font-bold uppercase tracking-widest">
                    Esta ação não pode ser desfeita
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
          </div>
          <div className="p-8 space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase text-muted-foreground ml-1">Justificativa (obrigatório)</Label>
              <Input 
                value={cancelReason} 
                onChange={e => setCancelReason(e.target.value.slice(0, 100))} 
                maxLength={100} 
                placeholder="Digite o motivo do cancelamento..." 
                className="h-12 rounded-2xl bg-muted/20 border-none px-6" 
              />
              <div className="flex justify-end">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{cancelReason.length}/100</span>
              </div>
            </div>
          </div>
          <div className="p-6 bg-slate-50 border-t flex gap-3">
            <Button variant="ghost" onClick={() => setIsCancelDialogOpen(false)} className="flex-1 h-12 rounded-2xl font-black uppercase tracking-widest text-[10px]">
              Fechar
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleConfirmCancel} 
              disabled={cancelVisitaMutation.isPending}
              className="flex-1 h-12 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-red-600/20"
            >
              Confirmar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[450px] rounded-[2.5rem] p-0 overflow-hidden border-none shadow-2xl">
          <div className="bg-slate-900 text-white p-8 relative shrink-0">
            <DialogHeader>
              <div className="flex items-center gap-4 relative z-10">
                <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center">
                  <Trash2 className="h-6 w-6 text-red-400" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-black uppercase tracking-tight leading-none mb-1">
                    Excluir Registro
                  </DialogTitle>
                  <DialogDescription className="text-white/40 text-[10px] font-bold uppercase tracking-widest">
                    Ação irreversível no sistema
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
          </div>
          <div className="p-8">
            <p className="text-sm font-medium text-slate-600 leading-relaxed">
              Deseja realmente remover esta visita permanentemente? Todos os dados vinculados serão perdidos.
            </p>
          </div>
          <div className="p-6 bg-slate-50 border-t flex gap-3">
            <Button variant="ghost" onClick={() => setIsDeleteDialogOpen(false)} className="flex-1 h-12 rounded-2xl font-black uppercase tracking-widest text-[10px]">
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleConfirmDelete} 
              disabled={deleteVisitaMutation.isPending}
              className="flex-1 h-12 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-red-600/20"
            >
              {deleteVisitaMutation.isPending ? "Excluindo..." : "Sim, Excluir"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Container de Impressão */}
      <div className="print-only hidden print:block">
        {visitas
          .filter(v => selectedVisitas.includes(v.id))
          .map((v, index, array) => (
            <div 
              key={v.id} 
              className={`bg-white ${printMode === 'separate' && index < array.length - 1 ? 'page-break-always' : index < array.length - 1 ? 'border-b-[3px] border-dashed border-black pb-8 mb-8' : ''} print-card-wrapper`}
              style={{ paddingLeft: `${printMargin}mm`, paddingRight: `${printMargin}mm` }}
            >
              <VisitaReceipt v={v} isPrint={true} />
            </div>
          ))}
      </div>
    </div>
  );
}
