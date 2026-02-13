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
  FileText,
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
  XCircle,
  MessageSquare,
  FileCheck,
  LayoutTemplate,
  FileSignature,
  User,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

interface ProposalItem {
  id: string;
  service: string;
  description: string;
  hours: number;
  pricePerHour: number;
}

interface Proposal {
  id: string;
  template_id: string | null;
  share_token: string;
  recipient_name: string;
  recipient_email: string;
  recipient_company: string | null;
  title: string;
  description: string | null;
  items: ProposalItem[];
  total_hours: number;
  total_value: number;
  status: string;
  valid_until: string | null;
  created_at: string;
  client_id: string | null;
}

interface ProposalTemplate {
  id: string;
  name: string;
  description: string | null;
  items: ProposalItem[];
}

const emptyItem = (): ProposalItem => ({
  id: crypto.randomUUID(),
  service: '',
  description: '',
  hours: 0,
  pricePerHour: 0,
});

export const Proposals: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: appData } = useData();
  
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [templates, setTemplates] = useState<ProposalTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // Dialog states
  const [proposalDialogOpen, setProposalDialogOpen] = useState(false);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTemplateDialogOpen, setDeleteTemplateDialogOpen] = useState(false);
  const [viewCommentsDialogOpen, setViewCommentsDialogOpen] = useState(false);
  const [convertDialogOpen, setConvertDialogOpen] = useState(false);
  
  // Form states
  const [editingProposal, setEditingProposal] = useState<Proposal | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<ProposalTemplate | null>(null);
  const [proposalToDelete, setProposalToDelete] = useState<string | null>(null);
  const [templateToDelete, setTemplateToDelete] = useState<string | null>(null);
  const [viewingCommentsFor, setViewingCommentsFor] = useState<Proposal | null>(null);
  const [proposalToConvert, setProposalToConvert] = useState<Proposal | null>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  
  // Proposal form
  const [formData, setFormData] = useState({
    recipientName: '',
    recipientEmail: '',
    recipientCompany: '',
    title: '',
    description: '',
    validUntil: '',
    clientId: '',
    items: [emptyItem()] as ProposalItem[],
  });
  
  // Template form
  const [templateFormData, setTemplateFormData] = useState({
    name: '',
    description: '',
  });
  
  const [saving, setSaving] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  // Fetch data
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [proposalsRes, templatesRes] = await Promise.all([
        supabase.from('proposals').select('*').order('created_at', { ascending: false }),
        supabase.from('proposal_templates').select('*').order('name'),
      ]);

      if (proposalsRes.data) {
        setProposals(proposalsRes.data.map(p => ({
          ...p,
          items: (p.items as unknown as ProposalItem[]) || [],
        })));
      }
      if (templatesRes.data) {
        setTemplates(templatesRes.data.map(t => ({
          ...t,
          items: (t.items as unknown as ProposalItem[]) || [],
        })));
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  // Calculate totals
  const calculateTotals = (items: ProposalItem[]) => {
    const totalHours = items.reduce((sum, item) => sum + Number(item.hours || 0), 0);
    const totalValue = items.reduce((sum, item) => sum + (Number(item.hours || 0) * Number(item.pricePerHour || 0)), 0);
    return { totalHours, totalValue };
  };

  // Handle proposal save
  const handleSaveProposal = async () => {
    if (!formData.recipientName || !formData.recipientEmail || !formData.title) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }

    setSaving(true);
    try {
      const { totalHours, totalValue } = calculateTotals(formData.items);
      
      const proposalData = {
        recipient_name: formData.recipientName,
        recipient_email: formData.recipientEmail,
        recipient_company: formData.recipientCompany || null,
        title: formData.title,
        description: formData.description || null,
        valid_until: formData.validUntil || null,
        items: formData.items as unknown as any,
        total_hours: totalHours,
        total_value: totalValue,
        created_by: user?.id,
        client_id: formData.clientId || null,
      };

      if (editingProposal) {
        const { error } = await supabase
          .from('proposals')
          .update(proposalData)
          .eq('id', editingProposal.id);
        if (error) throw error;
        toast.success('Proposta atualizada!');
      } else {
        const { error } = await supabase
          .from('proposals')
          .insert(proposalData);
        if (error) throw error;
        toast.success('Proposta criada!');
      }

      setProposalDialogOpen(false);
      resetProposalForm();
      fetchData();
    } catch (error) {
      console.error('Error saving proposal:', error);
      toast.error('Erro ao salvar proposta');
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
        items: [],
      };

      if (editingTemplate) {
        const { error } = await supabase
          .from('proposal_templates')
          .update(templateData)
          .eq('id', editingTemplate.id);
        if (error) throw error;
        toast.success('Template atualizado!');
      } else {
        const { error } = await supabase
          .from('proposal_templates')
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

  // Delete proposal
  const handleDeleteProposal = async () => {
    if (!proposalToDelete) return;
    
    try {
      const { error } = await supabase
        .from('proposals')
        .delete()
        .eq('id', proposalToDelete);
      if (error) throw error;
      
      toast.success('Proposta excluída!');
      setDeleteDialogOpen(false);
      setProposalToDelete(null);
      fetchData();
    } catch (error) {
      console.error('Error deleting proposal:', error);
      toast.error('Erro ao excluir proposta');
    }
  };

  // Delete template
  const handleDeleteTemplate = async () => {
    if (!templateToDelete) return;
    
    try {
      const { error } = await supabase
        .from('proposal_templates')
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

  // Send proposal
  const handleSendProposal = async (proposal: Proposal) => {
    try {
      const { error } = await supabase
        .from('proposals')
        .update({ status: 'sent' })
        .eq('id', proposal.id);
      if (error) throw error;
      
      toast.success('Proposta enviada!');
      fetchData();
    } catch (error) {
      console.error('Error sending proposal:', error);
      toast.error('Erro ao enviar proposta');
    }
  };

  // Copy link
  const handleCopyLink = async (shareToken: string) => {
    const url = `${window.location.origin}/proposal/${shareToken}`;
    await navigator.clipboard.writeText(url);
    setCopiedToken(shareToken);
    toast.success('Link copiado!');
    setTimeout(() => setCopiedToken(null), 2000);
  };

  // View comments
  const handleViewComments = async (proposal: Proposal) => {
    setViewingCommentsFor(proposal);
    setViewCommentsDialogOpen(true);
    setCommentsLoading(true);
    
    try {
      const { data } = await supabase
        .from('proposal_comments')
        .select('*')
        .eq('proposal_id', proposal.id)
        .order('created_at', { ascending: true });
      setComments(data || []);
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setCommentsLoading(false);
    }
  };

  // Convert to contract
  const handleConvertToContract = async () => {
    if (!proposalToConvert) return;
    
    setSaving(true);
    try {
      const { data, error } = await supabase
        .rpc('convert_proposal_to_contract', {
          p_proposal_id: proposalToConvert.id,
          p_template_id: null
        });
      
      if (error) throw error;
      
      toast.success('Contrato criado com sucesso!');
      setConvertDialogOpen(false);
      setProposalToConvert(null);
      navigate('/contracts');
    } catch (error) {
      console.error('Error converting to contract:', error);
      toast.error('Erro ao criar contrato');
    } finally {
      setSaving(false);
    }
  };

  // Apply template
  const handleApplyTemplate = (template: ProposalTemplate) => {
    setFormData(prev => ({
      ...prev,
      items: template.items.map(item => ({ ...item, id: crypto.randomUUID() })),
    }));
    toast.success('Template aplicado!');
  };

  // Item management
  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, emptyItem()],
    }));
  };

  const removeItem = (itemId: string) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter(i => i.id !== itemId),
    }));
  };

  const updateItem = (itemId: string, field: keyof ProposalItem, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map(i => i.id === itemId ? { ...i, [field]: value } : i),
    }));
  };

  // Reset forms
  const resetProposalForm = () => {
    setEditingProposal(null);
    setFormData({
      recipientName: '',
      recipientEmail: '',
      recipientCompany: '',
      title: '',
      description: '',
      validUntil: '',
      clientId: '',
      items: [emptyItem()],
    });
  };

  const resetTemplateForm = () => {
    setEditingTemplate(null);
    setTemplateFormData({
      name: '',
      description: '',
    });
  };

  // Edit proposal
  const openEditProposal = (proposal: Proposal) => {
    setEditingProposal(proposal);
    setFormData({
      recipientName: proposal.recipient_name,
      recipientEmail: proposal.recipient_email,
      recipientCompany: proposal.recipient_company || '',
      title: proposal.title,
      description: proposal.description || '',
      validUntil: proposal.valid_until || '',
      clientId: proposal.client_id || '',
      items: proposal.items.length > 0 ? proposal.items : [emptyItem()],
    });
    setProposalDialogOpen(true);
  };

  // Edit template
  const openEditTemplate = (template: ProposalTemplate) => {
    setEditingTemplate(template);
    setTemplateFormData({
      name: template.name,
      description: template.description || '',
    });
    setTemplateDialogOpen(true);
  };

  // Status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <Badge variant="outline">Rascunho</Badge>;
      case 'sent':
        return <Badge variant="secondary" className="bg-blue-500/20 text-blue-700 dark:text-blue-300">Enviada</Badge>;
      case 'viewed':
        return <Badge variant="secondary" className="bg-purple-500/20 text-purple-700 dark:text-purple-300">Visualizada</Badge>;
      case 'accepted':
        return <Badge variant="secondary" className="bg-green-500/20 text-green-700 dark:text-green-300">Aceita</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejeitada</Badge>;
      case 'negotiating':
        return <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-700 dark:text-yellow-300">Negociando</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Get client name
  const getClientName = (clientId: string | null) => {
    if (!clientId) return null;
    const client = appData.clients.find(c => c.id === clientId);
    return client?.company || client?.name || null;
  };

  // Filter proposals
  const filteredProposals = useMemo(() => {
    return proposals.filter(p => {
      const matchesSearch = 
        p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.recipient_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.recipient_email.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [proposals, searchTerm, statusFilter]);

  // Stats
  const stats = useMemo(() => {
    return {
      total: proposals.length,
      pending: proposals.filter(p => ['draft', 'sent', 'viewed'].includes(p.status)).length,
      accepted: proposals.filter(p => p.status === 'accepted').length,
      totalValue: proposals.filter(p => p.status === 'accepted').reduce((sum, p) => sum + Number(p.total_value), 0),
    };
  }, [proposals]);

  const { totalHours: formTotalHours, totalValue: formTotalValue } = calculateTotals(formData.items);

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
              <FileText className="w-4 h-4" />
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
              <span className="text-sm">Aceitas</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{stats.accepted}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <DollarSign className="w-4 h-4" />
              <span className="text-sm">Valor Aceito</span>
            </div>
            <p className="text-2xl font-bold text-foreground">
              {stats.totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="proposals">
        <TabsList>
          <TabsTrigger value="proposals" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Propostas
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <LayoutTemplate className="w-4 h-4" />
            Templates
          </TabsTrigger>
        </TabsList>

        {/* Proposals Tab */}
        <TabsContent value="proposals" className="space-y-4">
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
                  <SelectItem value="sent">Enviada</SelectItem>
                  <SelectItem value="viewed">Visualizada</SelectItem>
                  <SelectItem value="accepted">Aceita</SelectItem>
                  <SelectItem value="rejected">Rejeitada</SelectItem>
                  <SelectItem value="negotiating">Negociando</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => { resetProposalForm(); setProposalDialogOpen(true); }}>
              <Plus className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Nova Proposta</span>
            </Button>
          </div>

          {filteredProposals.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">Nenhuma proposta encontrada.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredProposals.map((proposal) => (
                <Card key={proposal.id} className="group">
                  <CardContent className="py-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-1 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-foreground truncate">{proposal.title}</h3>
                          {getStatusBadge(proposal.status)}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <User className="w-3 h-3" />
                          <span className="truncate">{proposal.recipient_name}</span>
                          <span>•</span>
                          <span className="truncate">{proposal.recipient_email}</span>
                        </div>
                        {proposal.client_id && (
                          <p className="text-xs text-primary">
                            Vinculada ao cliente: {getClientName(proposal.client_id)}
                          </p>
                        )}
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {proposal.total_hours}h
                          </span>
                          <span className="flex items-center gap-1">
                            <DollarSign className="w-3 h-3" />
                            {proposal.total_value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Criada em {format(parseISO(proposal.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {proposal.status === 'draft' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleSendProposal(proposal)}
                          >
                            <Send className="w-4 h-4 mr-2" />
                            Enviar
                          </Button>
                        )}
                        
                        {proposal.status !== 'draft' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleCopyLink(proposal.share_token)}
                          >
                            {copiedToken === proposal.share_token ? (
                              <Check className="w-4 h-4" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </Button>
                        )}
                        
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewComments(proposal)}
                        >
                          <MessageSquare className="w-4 h-4" />
                        </Button>
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="sm" variant="ghost">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => window.open(`/proposal/${proposal.share_token}`, '_blank')}>
                              <Eye className="w-4 h-4 mr-2" />
                              Visualizar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openEditProposal(proposal)}>
                              <Pencil className="w-4 h-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            {proposal.status === 'accepted' && (
                              <DropdownMenuItem onClick={() => {
                                setProposalToConvert(proposal);
                                setConvertDialogOpen(true);
                              }}>
                                <FileSignature className="w-4 h-4 mr-2" />
                                Gerar Contrato
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => {
                                setProposalToDelete(proposal.id);
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
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Proposal Dialog */}
      <Dialog open={proposalDialogOpen} onOpenChange={setProposalDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingProposal ? 'Editar Proposta' : 'Nova Proposta'}
            </DialogTitle>
            <DialogDescription>
              Preencha os dados da proposta comercial
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
                  recipientName: client?.name || prev.recipientName,
                  recipientEmail: client?.email || prev.recipientEmail,
                  recipientCompany: prev.recipientCompany,
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

            {/* Recipient info */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Nome do Destinatário *</Label>
                <Input
                  value={formData.recipientName}
                  onChange={(e) => setFormData(prev => ({ ...prev, recipientName: e.target.value }))}
                  placeholder="Nome completo"
                />
              </div>
              <div className="space-y-2">
                <Label>Email *</Label>
                <Input
                  type="email"
                  value={formData.recipientEmail}
                  onChange={(e) => setFormData(prev => ({ ...prev, recipientEmail: e.target.value }))}
                  placeholder="email@exemplo.com"
                />
              </div>
              <div className="space-y-2">
                <Label>Empresa</Label>
                <Input
                  value={formData.recipientCompany}
                  onChange={(e) => setFormData(prev => ({ ...prev, recipientCompany: e.target.value }))}
                  placeholder="Nome da empresa"
                />
              </div>
              <div className="space-y-2">
                <Label>Válida até</Label>
                <Input
                  type="date"
                  value={formData.validUntil}
                  onChange={(e) => setFormData(prev => ({ ...prev, validUntil: e.target.value }))}
                />
              </div>
            </div>

            {/* Proposal details */}
            <div className="space-y-2">
              <Label>Título da Proposta *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Ex: Proposta de Desenvolvimento Web"
              />
            </div>

            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Descrição geral da proposta..."
                rows={3}
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

            {/* Items */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Itens da Proposta</Label>
                <Button type="button" variant="outline" size="sm" onClick={() => addItem()}>
                  <Plus className="w-4 h-4 mr-1" />
                  Adicionar
                </Button>
              </div>

              {formData.items.map((item, index) => (
                <Card key={item.id}>
                  <CardContent className="pt-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">Item {index + 1}</span>
                      {formData.items.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeItem(item.id)}
                          className="text-destructive h-6 w-6 p-0"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Serviço</Label>
                        <Input
                          value={item.service}
                          onChange={(e) => updateItem(item.id, 'service', e.target.value)}
                          placeholder="Nome do serviço"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Descrição</Label>
                        <Input
                          value={item.description}
                          onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                          placeholder="Breve descrição"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Horas</Label>
                        <Input
                          type="number"
                          min={0}
                          value={item.hours || ''}
                          onChange={(e) => updateItem(item.id, 'hours', Number(e.target.value))}
                          placeholder="0"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Preço/Hora (R$)</Label>
                        <Input
                          type="number"
                          min={0}
                          value={item.pricePerHour || ''}
                          onChange={(e) => updateItem(item.id, 'pricePerHour', Number(e.target.value))}
                          placeholder="0"
                        />
                      </div>
                    </div>
                    <div className="text-right text-sm text-muted-foreground">
                      Subtotal: {((item.hours || 0) * (item.pricePerHour || 0)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </div>
                  </CardContent>
                </Card>
              ))}

              <Card className="bg-muted/50">
                <CardContent className="py-4">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold">Total</span>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">{formTotalHours} horas</p>
                      <p className="text-lg font-bold">
                        {formTotalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setProposalDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveProposal} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingProposal ? 'Salvar' : 'Criar Proposta'}
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
              Crie um modelo reutilizável para suas propostas
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <div className="space-y-2">
              <Label>Nome do Template *</Label>
              <Input
                value={templateFormData.name}
                onChange={(e) => setTemplateFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Ex: Pacote Básico de Design"
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

      {/* Delete Proposal Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Proposta</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta proposta? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteProposal} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
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

      {/* Comments Dialog */}
      <Dialog open={viewCommentsDialogOpen} onOpenChange={setViewCommentsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Comentários</DialogTitle>
            <DialogDescription>
              {viewingCommentsFor?.title}
            </DialogDescription>
          </DialogHeader>

          {commentsLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : comments.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <MessageSquare className="w-8 h-8 mx-auto mb-2" />
              <p>Nenhum comentário ainda.</p>
            </div>
          ) : (
            <div className="space-y-4 max-h-80 overflow-y-auto">
              {comments.map((comment) => (
                <div key={comment.id} className="p-3 rounded-lg bg-muted">
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-medium text-sm">{comment.author_name || 'Anônimo'}</span>
                    <span className="text-xs text-muted-foreground">
                      {format(parseISO(comment.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                    </span>
                  </div>
                  <p className="text-sm">{comment.content}</p>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Convert to Contract Dialog */}
      <AlertDialog open={convertDialogOpen} onOpenChange={setConvertDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Gerar Contrato</AlertDialogTitle>
            <AlertDialogDescription>
              Um contrato será criado com base nos dados desta proposta. Você poderá editá-lo antes de enviar ao cliente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConvertToContract} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Gerar Contrato
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
