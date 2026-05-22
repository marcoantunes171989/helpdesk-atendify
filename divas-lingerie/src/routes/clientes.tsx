import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Plus, Pencil, Trash2, Search, Mail, Phone, MapPin, Users, UserPlus, Filter } from "lucide-react";
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
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/clientes")({
  component: ClientesPage,
});

function ClientesPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpenConfirm, setIsDeleteDialogOpenConfirm] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState<any | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { data: clientes = [], isLoading, refetch } = useQuery({
    queryKey: ["clientes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tab_clientes")
        .select("*")
        .order("cli_nome");
      if (error) throw error;
      return data || [];
    },
  });

  const filteredClientes = useMemo(() => {
    const search = searchTerm.toLowerCase();
    return clientes.filter((c) => 
      c.cli_nome?.toLowerCase().includes(search) ||
      c.cli_documento?.includes(search) ||
      c.cli_email?.toLowerCase().includes(search) ||
      c.cli_telefone?.includes(search) ||
      c.cli_cidade?.toLowerCase().includes(search)
    );
  }, [clientes, searchTerm]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    
    try {
      setSubmitting(true);
      const payload = {
        cli_nome: formData.get("cli_nome") as string,
        cli_documento: formData.get("cli_documento") as string,
        cli_email: formData.get("cli_email") as string,
        cli_telefone: formData.get("cli_telefone") as string,
        cli_cidade: formData.get("cli_cidade") as string,
      };

      if (selectedCliente) {
        await supabase.from("tab_clientes").update(payload).eq("id", selectedCliente.id);
        toast.success("Cliente atualizado!");
      } else {
        await supabase.from("tab_clientes").insert([payload]);
        toast.success("Cliente criado!");
      }
      setIsDialogOpen(false);
      refetch();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedCliente) return;
    try {
      setSubmitting(true);
      
      // Verificar se existem vendas vinculadas
      const { count, error: countError } = await supabase
        .from("tab_vendas")
        .select("*", { count: 'exact', head: true })
        .eq("ven_cliente_id", selectedCliente.id);

      if (countError) throw countError;

      if (count && count > 0) {
        toast.error(`Não é possível excluir: este cliente possui ${count} venda(s) registrada(s).`);
        setIsDeleteDialogOpenConfirm(false);
        return;
      }

      const { error } = await supabase.from("tab_clientes").delete().eq("id", selectedCliente.id);
      if (error) throw error;
      
      toast.success("Cliente excluído!");
      setIsDeleteDialogOpenConfirm(false);
      refetch();
    } catch (error: any) {
      if (error.code === "23503") {
        toast.error("Este cliente não pode ser excluído pois está vinculado a outros registros.");
      } else {
        toast.error(error.message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border shadow-sm">
        <PageHeader title="Clientes" description="Gestão completa da sua base de clientes." />
        <div className="flex gap-2">
           <Button variant="outline" className="rounded-2xl h-11 px-4 md:px-6 border-slate-200">
             <Filter className="w-4 h-4 md:mr-2" /> <span className="hidden md:inline">Filtros</span>
           </Button>
           <Button onClick={() => { setSelectedCliente(null); setIsDialogOpen(true); }} className="rounded-2xl bg-slate-900 hover:bg-slate-800 h-11 px-4 md:px-6 shadow-lg shadow-slate-900/10 transition-all hover:scale-[1.02]">
             <UserPlus className="w-4 h-4 md:mr-2" /> <span className="hidden md:inline">Novo Cliente</span><span className="md:hidden">Novo</span>
           </Button>
        </div>
      </div>

      <div className="bg-white p-2 rounded-2xl border shadow-sm flex items-center">
        <Search className="ml-4 h-5 w-5 text-slate-400" />
        <Input
          placeholder="Pesquisar clientes..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="border-none bg-transparent focus-visible:ring-0 text-base"
        />
      </div>

      <Card className="rounded-3xl border-none shadow-sm overflow-hidden bg-white">
        {/* View para Desktop */}
        <div className="hidden md:block">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow className="border-none hover:bg-transparent">
                <TableHead className="font-bold text-slate-500 h-12 pl-6">NOME</TableHead>
                <TableHead className="font-bold text-slate-500 h-12">CONTATO</TableHead>
                <TableHead className="font-bold text-slate-500 h-12">CIDADE</TableHead>
                <TableHead className="text-right font-bold text-slate-500 h-12 pr-6">AÇÕES</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}><TableCell colSpan={4}><Skeleton className="h-12 w-full rounded-xl" /></TableCell></TableRow>
                ))
              ) : filteredClientes.length > 0 ? (
                filteredClientes.map((cli) => (
                  <TableRow key={cli.id} className="hover:bg-slate-50/50 transition-colors border-slate-50">
                    <TableCell className="py-4 pl-6 font-bold text-slate-700">{cli.cli_nome}</TableCell>
                    <TableCell className="text-slate-500 font-medium">
                      <div className="flex flex-col gap-0.5">
                        {cli.cli_email && <div className="flex items-center text-xs"><Mail className="w-3 h-3 mr-1.5" />{cli.cli_email}</div>}
                        {cli.cli_telefone && <div className="flex items-center text-xs"><Phone className="w-3 h-3 mr-1.5" />{cli.cli_telefone}</div>}
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-500 font-medium">{cli.cli_cidade || "-"}</TableCell>
                    <TableCell className="text-right pr-6">
                      <Button variant="ghost" className="h-8 w-8 rounded-lg text-slate-400 hover:text-blue-600" onClick={() => { setSelectedCliente(cli); setIsDialogOpen(true); }}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" className="h-8 w-8 rounded-lg text-slate-400 hover:text-red-600" onClick={() => { setSelectedCliente(cli); setIsDeleteDialogOpenConfirm(true); }}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-12 text-slate-400">
                    Nenhum cliente encontrado
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* View para Mobile */}
        <div className="md:hidden divide-y divide-slate-100">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="p-4 space-y-3">
                <Skeleton className="h-5 w-3/4 rounded-lg" />
                <Skeleton className="h-4 w-1/2 rounded-lg" />
                <Skeleton className="h-4 w-1/4 rounded-lg" />
              </div>
            ))
          ) : filteredClientes.length > 0 ? (
            filteredClientes.map((cli) => (
              <div key={cli.id} className="p-4 hover:bg-slate-50/50 transition-colors">
                <div className="flex justify-between items-start mb-2">
                  <div className="font-bold text-slate-700">{cli.cli_nome}</div>
                  <div className="flex gap-1">
                    <Button variant="ghost" className="h-8 w-8 rounded-lg text-slate-400 hover:text-blue-600" onClick={() => { setSelectedCliente(cli); setIsDialogOpen(true); }}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" className="h-8 w-8 rounded-lg text-slate-400 hover:text-red-600" onClick={() => { setSelectedCliente(cli); setIsDeleteDialogOpenConfirm(true); }}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                
                <div className="space-y-1.5">
                  {(cli.cli_email || cli.cli_telefone) && (
                    <div className="flex flex-col gap-1">
                      {cli.cli_email && (
                        <div className="flex items-center text-xs text-slate-500">
                          <Mail className="w-3.5 h-3.5 mr-2 text-slate-400" />
                          {cli.cli_email}
                        </div>
                      )}
                      {cli.cli_telefone && (
                        <div className="flex items-center text-xs text-slate-500">
                          <Phone className="w-3.5 h-3.5 mr-2 text-slate-400" />
                          {cli.cli_telefone}
                        </div>
                      )}
                    </div>
                  )}
                  {cli.cli_cidade && (
                    <div className="flex items-center text-xs text-slate-500">
                      <MapPin className="w-3.5 h-3.5 mr-2 text-slate-400" />
                      {cli.cli_cidade}
                    </div>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12 text-slate-400">
              Nenhum cliente encontrado
            </div>
          )}
        </div>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="rounded-[2rem]">
          <DialogHeader><DialogTitle>{selectedCliente ? "Editar Cliente" : "Novo Cliente"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Label>Nome</Label>
                <Input name="cli_nome" defaultValue={selectedCliente?.cli_nome} required className="rounded-xl" />
              </div>
              <div>
                <Label>Documento</Label>
                <Input name="cli_documento" defaultValue={selectedCliente?.cli_documento} className="rounded-xl" />
              </div>
              <div>
                <Label>Telefone</Label>
                <Input name="cli_telefone" defaultValue={selectedCliente?.cli_telefone} className="rounded-xl" />
              </div>
              <div className="sm:col-span-2">
                <Label>E-mail</Label>
                <Input name="cli_email" defaultValue={selectedCliente?.cli_email} className="rounded-xl" />
              </div>
              <div className="sm:col-span-2">
                <Label>Cidade</Label>
                <Input name="cli_cidade" defaultValue={selectedCliente?.cli_cidade} className="rounded-xl" />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={submitting}>Salvar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpenConfirm} onOpenChange={setIsDeleteDialogOpenConfirm}>
        <AlertDialogContent className="rounded-[2rem]">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir cliente?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
