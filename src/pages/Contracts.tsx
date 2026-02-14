import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Plus,
  FileSignature,
  Send,
  Copy,
  Check,
  MoreVertical,
  Pencil,
  Trash2,
  Eye,
  Loader2,
  Search,
  Clock,
  DollarSign,
  CheckCircle,
  LayoutTemplate,
  User,
  FileText,
  Calendar,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

interface ServiceItem {
  id: string;
  service: string;
  description: string;
  hours: number;
  pricePerHour: number;
}

interface Contract {
  id: string;
  share_token: string;
  contractor_name: string;
  contractor_email: string;
  contractor_company: string | null;
  contractor_document: string | null;
  contractor_address: string | null;
  title: string;
  content: string;
  services_summary: ServiceItem[];
  total_hours: number;
  total_value: number;
  start_date: string | null;
  end_date: string | null;
  payment_terms: string | null;
  status: string;
  sent_at: string | null;
  viewed_at: string | null;
  signed_at: string | null;
  signer_name: string | null;
  created_at: string;
  client_id: string | null;
  proposal_id: string | null;
}

interface ContractTemplate {
  id: string;
  name: string;
  description: string | null;
  content: string;
}

export const Contracts: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: appData } = useData();
  
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [templates, setTemplates] = useState<ContractTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // Dialog states
  const [contractDialogOpen, setContractDialogOpen] = useState(false);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTemplateDialogOpen, setDeleteTemplateDialogOpen] = useState(false);
  
  // Form states
  const [editingContract, setEditingContract] = useState<Contract | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<ContractTemplate | null>(null);
  const [contractToDelete, setContractToDelete] = useState<string | null>(null);
  const [templateToDelete, setTemplateToDelete] = useState<string | null>(null);
  
  // Contract form
  const [formData, setFormData] = useState({
    contractorName: '',
    contractorEmail: '',
    contractorCompany: '',
    contractorDocument: '',
    contractorAddress: '',
    title: '',
    content: '',
    startDate: '',
    endDate: '',
    paymentTerms: '',
    clientId: '',
    totalHours: 0,
    totalValue: 0,
  });
  
  // Template form
  const [templateFormData, setTemplateFormData] = useState({
    name: '',
    description: '',
    content: '',
  });
  
  const [saving, setSaving] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [contractsRes, templatesRes] = await Promise.all([
        supabase.from('contracts').select('*').order('created_at', { ascending: false }),
        supabase.from('contract_templates').select('*').order('name'),
      ]);

      if (contractsRes.data) {
        setContracts(contractsRes.data.map(c => ({
          ...c,
          services_summary: (c.services_summary as unknown as ServiceItem[]) || [],
        })));
      }
      if (templatesRes.data) {
        setTemplates(templatesRes.data as ContractTemplate[]);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  // Handle contract save
  const handleSaveContract = async () => {
    if (!formData.contractorName || !formData.contractorEmail || !formData.title) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }

    setSaving(true);
    try {
      const contractData = {
        contractor_name: formData.contractorName,
        contractor_email: formData.contractorEmail,
        contractor_company: formData.contractorCompany || null,
        contractor_document: formData.contractorDocument || null,
        contractor_address: formData.contractorAddress || null,
        title: formData.title,
        content: formData.content,
        start_date: formData.startDate || null,
        end_date: formData.endDate || null,
        payment_terms: formData.paymentTerms || null,
        client_id: formData.clientId || null,
        total_hours: formData.totalHours,
        total_value: formData.totalValue,
        created_by: user?.id,
      };

      if (editingContract) {
        const { error } = await supabase
          .from('contracts')
          .update(contractData)
          .eq('id', editingContract.id);
        if (error) throw error;
        toast.success('Contrato atualizado!');
      } else {
        const { error } = await supabase
          .from('contracts')
          .insert(contractData);
        if (error) throw error;
        toast.success('Contrato criado!');
      }

      setContractDialogOpen(false);
      resetContractForm();
      fetchData();
    } catch (error) {
      console.error('Error saving contract:', error);
      toast.error('Erro ao salvar contrato');
    } finally {
      setSaving(false);
    }
  };

  // Handle template save
  const handleSaveTemplate = async () => {
    if (!templateFormData.name) {
      toast.error('Preencha o nome do template');
      return;
    }

    setSaving(true);
    try {
      const templateData = {
        name: templateFormData.name,
        description: templateFormData.description || null,
        content: templateFormData.content,
      };

      if (editingTemplate) {
        const { error } = await supabase
          .from('contract_templates')
          .update(templateData)
          .eq('id', editingTemplate.id);
        if (error) throw error;
        toast.success('Template atualizado!');
      } else {
        const { error } = await supabase
          .from('contract_templates')
          .insert(templateData);
        if (error) throw error;
        toast.success('Template criado!');
      }

      setTemplateDialogOpen(false);
      resetTemplateForm();
      fetchData();
    } catch (error) {
      console.error('Error saving template:', error);
      toast.error('Erro ao salvar template');
    } finally {
      setSaving(false);
    }
  };

  // Delete contract
  const handleDeleteContract = async () => {
    if (!contractToDelete) return;
    
    try {
      const { error } = await supabase
        .from('contracts')
        .delete()
        .eq('id', contractToDelete);
      if (error) throw error;
      
      toast.success('Contrato excluído!');
      setDeleteDialogOpen(false);
      setContractToDelete(null);
      fetchData();
    } catch (error) {
      console.error('Error deleting contract:', error);
      toast.error('Erro ao excluir contrato');
    }
  };

  // Delete template
  const handleDeleteTemplate = async () => {
    if (!templateToDelete) return;
    
    try {
      const { error } = await supabase
        .from('contract_templates')
        .delete()
        .eq('id', templateToDelete);
      if (error) throw error;
      
      toast.success('Template excluído!');
      setDeleteTemplateDialogOpen(false);
      setTemplateToDelete(null);
      fetchData();
    } catch (error) {
      console.error('Error deleting template:', error);
      toast.error('Erro ao excluir template');
    }
  };

  // Send contract
  const handleSendContract = async (contract: Contract) => {
    try {
      const { error } = await supabase
        .from('contracts')
        .update({ status: 'sent', sent_at: new Date().toISOString() })
        .eq('id', contract.id);
      if (error) throw error;
      
      toast.success('Contrato enviado!');
      fetchData();
    } catch (error) {
      console.error('Error sending contract:', error);
      toast.error('Erro ao enviar contrato');
    }
  };

  // Copy link
  const handleCopyLink = async (shareToken: string) => {
    const url = `${window.location.origin}/contract/${shareToken}`;
    await navigator.clipboard.writeText(url);
    setCopiedToken(shareToken);
    toast.success('Link copiado!');
    setTimeout(() => setCopiedToken(null), 2000);
  };

  // Reset forms
  const resetContractForm = () => {
    setEditingContract(null);
    setFormData({
      contractorName: '',
      contractorEmail: '',
      contractorCompany: '',
      contractorDocument: '',
      contractorAddress: '',
      title: '',
      content: '',
      startDate: '',
      endDate: '',
      paymentTerms: '',
      clientId: '',
      totalHours: 0,
      totalValue: 0,
    });
  };

  const resetTemplateForm = () => {
    setEditingTemplate(null);
    setTemplateFormData({
      name: '',
      description: '',
      content: '',
    });
  };

  // Edit contract
  const openEditContract = (contract: Contract) => {
    setEditingContract(contract);
    setFormData({
      contractorName: contract.contractor_name,
      contractorEmail: contract.contractor_email,
      contractorCompany: contract.contractor_company || '',
      contractorDocument: contract.contractor_document || '',
      contractorAddress: contract.contractor_address || '',
      title: contract.title,
      content: contract.content,
      startDate: contract.start_date || '',
      endDate: contract.end_date || '',
      paymentTerms: contract.payment_terms || '',
      clientId: contract.client_id || '',
      totalHours: contract.total_hours,
      totalValue: contract.total_value,
    });
    setContractDialogOpen(true);
  };

  // Edit template
  const openEditTemplate = (template: ContractTemplate) => {
    setEditingTemplate(template);
    setTemplateFormData({
      name: template.name,
      description: template.description || '',
      content: template.content,
    });
    setTemplateDialogOpen(true);
  };

  // Apply template
  const handleApplyTemplate = (template: ContractTemplate) => {
    setFormData(prev => ({
      ...prev,
      content: template.content,
    }));
    toast.success('Template aplicado!');
  };

  // Status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <Badge variant="outline">Rascunho</Badge>;
      case 'sent':
        return <Badge variant="secondary" className="bg-blue-500/20 text-blue-700 dark:text-blue-300">Enviado</Badge>;
      case 'viewed':
        return <Badge variant="secondary" className="bg-purple-500/20 text-purple-700 dark:text-purple-300">Visualizado</Badge>;
      case 'signed':
        return <Badge variant="secondary" className="bg-green-500/20 text-green-700 dark:text-green-300">Assinado</Badge>;
      case 'expired':
        return <Badge variant="destructive">Expirado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Get client name (company or contact name)
  const getClientName = (clientId: string | null) => {
    if (!clientId) return null;
    const client = appData.clients.find(c => c.id === clientId);
    return client?.company || client?.name || null;
  };

  // Filter contracts
  const filteredContracts = useMemo(() => {
    return contracts.filter(c => {
      const matchesSearch = 
        c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.contractor_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.contractor_email.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [contracts, searchTerm, statusFilter]);

  // Stats
  const stats = useMemo(() => {
    return {
      total: contracts.length,
      pending: contracts.filter(c => ['draft', 'sent', 'viewed'].includes(c.status)).length,
      signed: contracts.filter(c => c.status === 'signed').length,
      totalValue: contracts.filter(c => c.status === 'signed').reduce((sum, c) => sum + Number(c.total_value), 0),
    };
  }, [contracts]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <FileSignature className="w-4 h-4" />
              <span className="text-sm">Total</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Clock className="w-4 h-4" />
              <span className="text-sm">Pendentes</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{stats.pending}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <CheckCircle className="w-4 h-4" />
              <span className="text-sm">Assinados</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{stats.signed}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <DollarSign className="w-4 h-4" />
              <span className="text-sm">Valor Assinado</span>
            </div>
            <p className="text-2xl font-bold text-foreground">
              {stats.totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="contracts">
        <TabsList>
          <TabsTrigger value="contracts" className="flex items-center gap-2">
            <FileSignature className="w-4 h-4" />
            Contratos
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <LayoutTemplate className="w-4 h-4" />
            Templates
          </TabsTrigger>
        </TabsList>

        {/* Contracts Tab */}
        <TabsContent value="contracts" className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex flex-1 gap-3 w-full sm:w-auto">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="draft">Rascunho</SelectItem>
                  <SelectItem value="sent">Enviado</SelectItem>
                  <SelectItem value="viewed">Visualizado</SelectItem>
                  <SelectItem value="signed">Assinado</SelectItem>
                  <SelectItem value="expired">Expirado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => { resetContractForm(); setContractDialogOpen(true); }}>
              <Plus className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Novo Contrato</span>
            </Button>
          </div>

          {filteredContracts.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <FileSignature className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">Nenhum contrato encontrado.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredContracts.map((contract) => (
                <Card key={contract.id} className="group">
                  <CardContent className="py-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-1 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-foreground truncate">{contract.title}</h3>
                          {getStatusBadge(contract.status)}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <User className="w-3 h-3" />
                          <span className="truncate">{contract.contractor_name}</span>
                          <span>•</span>
                          <span className="truncate">{contract.contractor_email}</span>
                        </div>
                        {contract.client_id && (
                          <p className="text-xs text-primary">
                            Vinculado ao cliente: {getClientName(contract.client_id)}
                          </p>
                        )}
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {contract.total_hours}h
                          </span>
                          <span className="flex items-center gap-1">
                            <DollarSign className="w-3 h-3" />
                            {contract.total_value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </span>
                          {contract.signed_at && (
                            <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                              <CheckCircle className="w-3 h-3" />
                              Assinado por {contract.signer_name}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Criado em {format(parseISO(contract.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {contract.status === 'draft' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleSendContract(contract)}
                          >
                            <Send className="w-4 h-4 mr-2" />
                            Enviar
                          </Button>
                        )}
                        
                        {contract.status !== 'draft' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleCopyLink(contract.share_token)}
                          >
                            {copiedToken === contract.share_token ? (
                              <Check className="w-4 h-4" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </Button>
                        )}
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="sm" variant="ghost">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => window.open(`/contract/${contract.share_token}`, '_blank')}>
                              <Eye className="w-4 h-4 mr-2" />
                              Visualizar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openEditContract(contract)}>
                              <Pencil className="w-4 h-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => {
                                setContractToDelete(contract.id);
                                setDeleteDialogOpen(true);
                              }}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => { resetTemplateForm(); setTemplateDialogOpen(true); }}>
              <Plus className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Novo Template</span>
            </Button>
          </div>

          {templates.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <LayoutTemplate className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">Nenhum template cadastrado.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {templates.map((template) => (
                <Card key={template.id} className="group relative">
                  <div className="absolute top-3 right-3">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                          <MoreVertical className="w-3 h-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEditTemplate(template)}>
                          <Pencil className="w-4 h-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => {
                            setTemplateToDelete(template.id);
                            setDeleteTemplateDialogOpen(true);
                          }}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <CardHeader className="pb-2 pr-10">
                    <CardTitle className="text-lg">{template.name}</CardTitle>
                    {template.description && (
                      <CardDescription>{template.description}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {template.content ? template.content.substring(0, 100) + '...' : 'Sem conteúdo'}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Contract Dialog */}
      <Dialog open={contractDialogOpen} onOpenChange={setContractDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingContract ? 'Editar Contrato' : 'Novo Contrato'}
            </DialogTitle>
            <DialogDescription>
              Preencha os dados do contrato
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Client selection */}
            <div className="space-y-2">
              <Label>Vincular a Cliente (opcional)</Label>
              <Select value={formData.clientId || 'none'} onValueChange={(v) => {
                const clientId = v === 'none' ? '' : v;
                const client = appData.clients.find(c => c.id === clientId);
                setFormData(prev => ({
                  ...prev,
                  clientId: clientId,
                  contractorName: client?.name || prev.contractorName,
                  contractorEmail: client?.email || prev.contractorEmail,
                  contractorCompany: prev.contractorCompany,
                }));
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um cliente..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {appData.clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.company || client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Contractor info */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Nome do Contratante *</Label>
                <Input
                  value={formData.contractorName}
                  onChange={(e) => setFormData(prev => ({ ...prev, contractorName: e.target.value }))}
                  placeholder="Nome completo"
                />
              </div>
              <div className="space-y-2">
                <Label>Email *</Label>
                <Input
                  type="email"
                  value={formData.contractorEmail}
                  onChange={(e) => setFormData(prev => ({ ...prev, contractorEmail: e.target.value }))}
                  placeholder="email@exemplo.com"
                />
              </div>
              <div className="space-y-2">
                <Label>Empresa</Label>
                <Input
                  value={formData.contractorCompany}
                  onChange={(e) => setFormData(prev => ({ ...prev, contractorCompany: e.target.value }))}
                  placeholder="Nome da empresa"
                />
              </div>
              <div className="space-y-2">
                <Label>CPF/CNPJ</Label>
                <Input
                  value={formData.contractorDocument}
                  onChange={(e) => setFormData(prev => ({ ...prev, contractorDocument: e.target.value }))}
                  placeholder="000.000.000-00"
                />
              </div>
              <div className="sm:col-span-2 space-y-2">
                <Label>Endereço</Label>
                <Input
                  value={formData.contractorAddress}
                  onChange={(e) => setFormData(prev => ({ ...prev, contractorAddress: e.target.value }))}
                  placeholder="Endereço completo"
                />
              </div>
            </div>

            {/* Contract details */}
            <div className="space-y-2">
              <Label>Título do Contrato *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Ex: Contrato de Prestação de Serviços"
              />
            </div>

            {/* Apply template */}
            {templates.length > 0 && (
              <div className="space-y-2">
                <Label>Aplicar Template</Label>
                <Select onValueChange={(id) => {
                  const template = templates.find(t => t.id === id);
                  if (template) handleApplyTemplate(template);
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um template..." />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Conteúdo do Contrato</Label>
              <Textarea
                value={formData.content}
                onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                placeholder="Texto completo do contrato... Use variáveis como {{contractor_name}}, {{total_value}}, etc."
                rows={10}
              />
              <p className="text-xs text-muted-foreground">
                Variáveis disponíveis: {'{{contractor_name}}'}, {'{{contractor_email}}'}, {'{{contractor_company}}'}, {'{{total_hours}}'}, {'{{total_value}}'}, {'{{start_date}}'}, {'{{end_date}}'}
              </p>
            </div>

            {/* Dates and values */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Data de Início</Label>
                <Input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Data de Término</Label>
                <Input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Total de Horas</Label>
                <Input
                  type="number"
                  min={0}
                  value={formData.totalHours || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, totalHours: Number(e.target.value) }))}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label>Valor Total (R$)</Label>
                <Input
                  type="number"
                  min={0}
                  value={formData.totalValue || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, totalValue: Number(e.target.value) }))}
                  placeholder="0"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Condições de Pagamento</Label>
              <Textarea
                value={formData.paymentTerms}
                onChange={(e) => setFormData(prev => ({ ...prev, paymentTerms: e.target.value }))}
                placeholder="Descreva as condições de pagamento..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setContractDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveContract} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingContract ? 'Salvar' : 'Criar Contrato'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Template Dialog */}
      <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? 'Editar Template' : 'Novo Template'}
            </DialogTitle>
            <DialogDescription>
              Crie um modelo reutilizável para seus contratos
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <div className="space-y-2">
              <Label>Nome do Template *</Label>
              <Input
                value={templateFormData.name}
                onChange={(e) => setTemplateFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Ex: Contrato Padrão de Serviços"
              />
            </div>

            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea
                value={templateFormData.description}
                onChange={(e) => setTemplateFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Breve descrição do template..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Conteúdo do Template</Label>
              <Textarea
                value={templateFormData.content}
                onChange={(e) => setTemplateFormData(prev => ({ ...prev, content: e.target.value }))}
                placeholder="Texto padrão do contrato com variáveis..."
                rows={12}
              />
              <p className="text-xs text-muted-foreground">
                Use variáveis como {'{{contractor_name}}'}, {'{{total_value}}'}, {'{{start_date}}'} que serão substituídas automaticamente
              </p>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setTemplateDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveTemplate} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingTemplate ? 'Salvar' : 'Criar Template'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Contract Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Contrato</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este contrato? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteContract} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Template Dialog */}
      <AlertDialog open={deleteTemplateDialogOpen} onOpenChange={setDeleteTemplateDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Template</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este template? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteTemplate} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
