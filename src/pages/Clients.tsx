import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useData } from "@/contexts/DataContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { WysiwygEditor } from "@/components/ui/wysiwyg-editor";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatHours } from "@/lib/formatHours";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
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
  Plus,
  Pencil,
  Trash2,
  Loader2,
  UserCheck,
  Handshake,
  MoreVertical,
  UserPlus,
  UserX,
  Calendar,
  RefreshCw,
  Clock,
  AlertCircle,
  FileCheck,
  Users,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { ProposalsTab } from "@/components/clients/ProposalsTab";

interface Client {
  id: string;
  name: string;
  email: string;
  contracted_hours: number;
  access_token: string;
  pipeline_status?: string;
  company?: string | null;
  phone?: string | null;
  source?: string | null;
  notes?: string | null;
  contract_type?: "one_time" | "monthly";
  contract_start_date?: string | null;
  contract_end_date?: string | null;
  contract_months?: number | null;
}

export const Clients: React.FC = () => {
  const navigate = useNavigate();
  const {
    data,
    loading,
    createClient,
    updateClient,
    deleteClient,
    getClientHours,
    getClientMonthlyHours,
    getClientPreviousMonthOverflow,
  } = useData();
  const [mainTab, setMainTab] = useState<"clients" | "proposals">("clients");
  const [activeTab, setActiveTab] = useState<"lead" | "proposal" | "active" | "churned">("lead");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [deletingClient, setDeletingClient] = useState<Client | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    company: "",
    phone: "",
    contracted_hours: 0,
    pipeline_status: "lead",
    source: "",
    notes: "",
    contract_type: "one_time" as "one_time" | "monthly",
  });

  // Filter clients by pipeline status
  const filteredClients = useMemo(() => {
    return data.clients.filter((c) => (c.pipeline_status || "active") === activeTab);
  }, [data.clients, activeTab]);

  const leadCount = data.clients.filter((c) => (c.pipeline_status || "lead") === "lead").length;
  const proposalCount = data.clients.filter((c) => c.pipeline_status === "proposal").length;
  const activeCount = data.clients.filter((c) => c.pipeline_status === "active").length;
  const churnedCount = data.clients.filter((c) => c.pipeline_status === "churned").length;

  const handleOpenDialog = (client?: Client) => {
    if (client) {
      setEditingClient(client);
      setFormData({
        name: client.name,
        email: client.email,
        company: client.company || "",
        phone: client.phone || "",
        contracted_hours: client.contracted_hours,
        pipeline_status: client.pipeline_status || "lead",
        source: client.source || "",
        notes: client.notes || "",
        contract_type: client.contract_type || "one_time",
      });
    } else {
      setEditingClient(null);
      setFormData({
        name: "",
        email: "",
        company: "",
        phone: "",
        contracted_hours: 0,
        pipeline_status: "lead",
        source: "",
        notes: "",
        contract_type: "one_time",
      });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    if (editingClient) {
      await updateClient(editingClient.id, formData);
      toast.success("Cliente atualizado com sucesso!");
    } else {
      await createClient(formData);
      toast.success("Cliente criado com sucesso!");
    }

    setSubmitting(false);
    setIsDialogOpen(false);
  };

  const handleDelete = async () => {
    if (deletingClient) {
      await deleteClient(deletingClient.id);
      toast.success("Cliente excluído com sucesso!");
      setIsDeleteDialogOpen(false);
      setDeletingClient(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const getPipelineBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-100 text-green-800">Ativo</Badge>;
      case "proposal":
        return <Badge className="bg-blue-100 text-blue-800">Em Negociação</Badge>;
      case "churned":
        return <Badge variant="destructive">Inativo</Badge>;
      default:
        return <Badge variant="secondary">Lead</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      <span className="text-lg font-semibold text-foreground whitespace-nowrap">
        {clientCount} {clientCount === 1 ? "cliente" : "clientes"}
      </span>
      <Tabs value={mainTab} onValueChange={(v) => setMainTab(v as "clients" | "proposals")}>
        <div className="flex items-center justify-between w-full">
          <TabsList className="flex rounded-lg">
            <TabsTrigger value="clients">
              <Users className="w-3.5 h-3.5" />
              Clientes
            </TabsTrigger>

            <TabsTrigger value="proposals">
              <FileCheck className="w-3.5 h-3.5" />
              Propostas
            </TabsTrigger>
          </TabsList>

          <Button onClick={() => handleOpenDialog()} size="sm" className="h-8 w-8 shrink-0">
            <Plus className="w-3.5 h-3.5" />
          </Button>
        </div>
        <TabsContent value="clients" className="mt-6">
          <div className="w-full overflow-x-auto touch-pan-x overscroll-x-contain [-ms-overflow-style:none] [scrollbar-width:none]">
            <div className="flex items-center justify-start min-w-max gap-4">
              <Tabs
                value={activeTab}
                onValueChange={(v) => setActiveTab(v as "lead" | "proposal" | "active" | "churned")}
                className="flex-1 overflow-x-auto"
              >
                <TabsList className="h-8 w-full sm:w-auto p-1 rounded-full bg-trasparent gap-1">
                  <TabsTrigger
                    value="lead"
                    className="flex pt-1 pb-1 pl-1 pr-2 items-center gap-1 sm:gap-2 rounded-full data-[state=active]:bg-muted"
                  >
                    <Badge variant="circular" className="">
                      {leadCount}
                    </Badge>
                    <span className="sm:inline">Leads</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="proposal"
                    className="flex pt-1 pb-1 pl-1 pr-2 items-center gap-1 sm:gap-2 rounded-full data-[state=active]:bg-muted"
                  >
                    <Badge variant="circular" className="">
                      {proposalCount}
                    </Badge>
                    <span className=" sm:inline">Em Negociação</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="active"
                    className="flex pt-1 pb-1 pl-1 pr-2 items-center gap-1 sm:gap-2 rounded-full data-[state=active]:bg-muted"
                  >
                    <Badge variant="circular" className="">
                      {activeCount}
                    </Badge>
                    <span className="sm:inline">Ativos</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="churned"
                    className="flex pt-1 pb-1 pl-1 pr-2 items-center gap-1 sm:gap-2 rounded-full data-[state=active]:bg-muted"
                  >
                    <Badge variant="circular" className="">
                      {churnedCount}
                    </Badge>
                    <span className="sm:inline">Inativos</span>
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>

          {filteredClients.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground mb-4">Nenhum cliente cadastrado ainda.</p>
                <Button onClick={() => handleOpenDialog()} size="sm" className="h-8 w-8 shrink-0">
                  <Plus className="w-3.5 h-3.5 mr-2" />
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredClients.map((client) => {
                const isMonthly = (client as any).contract_type === "monthly";
                const totalUsedHours = getClientHours(client.id);
                const monthlyUsedHours = getClientMonthlyHours(client.id);
                const previousOverflow = isMonthly ? getClientPreviousMonthOverflow(client.id) : 0;
                const availableHours = isMonthly
                  ? Math.max(0, client.contracted_hours - previousOverflow)
                  : client.contracted_hours;
                const displayedHours = isMonthly ? monthlyUsedHours : totalUsedHours;
                const projectCount = data.projects.filter((p) => p.client_id === client.id).length;
                const contractEndDate = (client as any).contract_end_date;

                return (
                  <Card
                    key={client.id}
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => navigate(`/clients/${client.id}`)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-semibold text-foreground">{client.company || client.name}</h3>
                          <p className="text-sm text-muted-foreground">{client.email}</p>
                        </div>
                        <div onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-6 w-6">
                                <MoreVertical className="w-3 h-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleOpenDialog(client)}>
                                <Pencil className="w-4 h-4 mr-2" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => {
                                  setDeletingClient(client);
                                  setIsDeleteDialogOpen(true);
                                }}
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>

                      {/* Contract type and period badges */}
                      <div className="flex flex-wrap items-center gap-2 mb-3">
                        <Badge variant={isMonthly ? "default" : "secondary"} className="text-xs">
                          {isMonthly ? (
                            <>
                              <RefreshCw className="w-3 h-3 mr-1" />
                              Plano Mensal
                            </>
                          ) : (
                            <>
                              <Clock className="w-3 h-3 mr-1" />
                              Serviço Único
                            </>
                          )}
                        </Badge>
                        {contractEndDate && (
                          <Badge variant="outline" className="text-xs">
                            <Calendar className="w-3 h-3 mr-1" />
                            até {format(new Date(contractEndDate), "MMM/yy", { locale: ptBR })}
                          </Badge>
                        )}
                      </div>

                      {/* Previous month overflow indicator */}
                      {isMonthly && previousOverflow > 0 && (
                        <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400 mb-2">
                          <AlertCircle className="w-3 h-3" />
                          <span className="text-xs font-medium">Saldo anterior: {formatHours(previousOverflow)}</span>
                        </div>
                      )}

                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Projetos:</span>
                          <span className="font-medium text-foreground">{projectCount}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">
                            {isMonthly ? `Horas (${format(new Date(), "MMM/yy", { locale: ptBR })})` : "Horas usadas"}:
                          </span>
                          <span className="font-medium text-foreground">
                            {formatHours(displayedHours)} / {formatHours(availableHours)}
                          </span>
                        </div>
                        {isMonthly && previousOverflow > 0 && (
                          <div className="text-xs text-muted-foreground">
                            Disponível: {formatHours(client.contracted_hours)} - {formatHours(previousOverflow)} saldo
                          </div>
                        )}
                        <div className="w-full bg-muted rounded-full h-2 mt-2">
                          <div
                            className="bg-primary h-2 rounded-full transition-all"
                            style={{
                              width: `${
                                availableHours > 0 ? Math.min((displayedHours / availableHours) * 100, 100) : 0
                              }%`,
                            }}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="proposals" className="mt-6">
          <ProposalsTab />
        </TabsContent>
      </Tabs>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingClient ? "Editar Cliente" : "Novo Cliente"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
              {/* Dados Básicos */}
              <div className="space-y-4">
                <h4 className="font-medium text-sm text-muted-foreground">Dados Básicos</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome do Contato</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      disabled={submitting}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company">Empresa</Label>
                    <Input
                      id="company"
                      value={formData.company}
                      onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                      disabled={submitting}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                      disabled={submitting}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefone</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      disabled={submitting}
                    />
                  </div>
                </div>
              </div>

              {/* Faturamento */}
              <div className="space-y-4 pt-4 border-t">
                <h4 className="font-medium text-sm text-muted-foreground">Faturamento</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="contracted_hours">Horas Contratadas</Label>
                    <Input
                      id="contracted_hours"
                      type="number"
                      min="0"
                      value={formData.contracted_hours}
                      onChange={(e) => setFormData({ ...formData, contracted_hours: Number(e.target.value) })}
                      required
                      disabled={submitting}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contract_type">Modelo de Contratação</Label>
                    <Select
                      value={formData.contract_type}
                      onValueChange={(value: "one_time" | "monthly") =>
                        setFormData({ ...formData, contract_type: value })
                      }
                      disabled={submitting}
                    >
                      <SelectTrigger id="contract_type">
                        <SelectValue placeholder="Selecione o modelo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="one_time">Serviço Único</SelectItem>
                        <SelectItem value="monthly">Plano Mensal</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      {formData.contract_type === "monthly"
                        ? "Horas renovam a cada mês"
                        : "Horas acumulativas desde o início"}
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="source">Origem</Label>
                  <Input
                    id="source"
                    value={formData.source}
                    onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                    placeholder="Ex: Indicação, Google, etc."
                    disabled={submitting}
                  />
                </div>
              </div>

              {/* Pipeline de Vendas */}
              <div className="space-y-4 pt-4 border-t">
                <h4 className="font-medium text-sm text-muted-foreground">Pipeline de Vendas</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="pipeline_status">Status</Label>
                    <Select
                      value={formData.pipeline_status}
                      onValueChange={(value) => setFormData({ ...formData, pipeline_status: value })}
                      disabled={submitting}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="lead">Lead</SelectItem>
                        <SelectItem value="proposal">Em Negociação</SelectItem>
                        <SelectItem value="active">Ativo</SelectItem>
                        <SelectItem value="churned">Inativo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="notes">Observações</Label>
                    <WysiwygEditor
                      value={formData.notes}
                      onChange={(value) => setFormData({ ...formData, notes: value })}
                      placeholder="Anotações sobre o cliente..."
                      disabled={submitting}
                      minHeight="80px"
                    />
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} disabled={submitting}>
                Cancelar
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {editingClient ? "Salvar" : "Criar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir cliente?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso excluirá permanentemente o cliente "{deletingClient?.name}" e todos
              os seus projetos, tarefas e registros de horas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
