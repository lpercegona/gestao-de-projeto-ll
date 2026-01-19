import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
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
  
  // Form states
  const [editingProposal, setEditingProposal] = useState<Proposal | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<ProposalTemplate | null>(null);
  const [proposalToDelete, setProposalToDelete] = useState<string | null>(null);
  const [templateToDelete, setTemplateToDelete] = useState<string | null>(null);
  const [viewingCommentsFor, setViewingCommentsFor] = useState<Proposal | null>(null);
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
    items: [emptyItem()] as ProposalItem[],
  });
  
  // Template form
  const [templateFormData, setTemplateFormData] = useState({
    name: '',
    description: '',
    items: [emptyItem()] as ProposalItem[],
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
        items: templateFormData.items as unknown as any,
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

  // Apply template
  const handleApplyTemplate = (template: ProposalTemplate) => {
    setFormData(prev => ({
      ...prev,
      items: template.items.map(item => ({ ...item, id: crypto.randomUUID() })),
    }));
    toast.success('Template aplicado!');
  };

  // Item management
  const addItem = (isTemplate: boolean = false) => {
    if (isTemplate) {
      setTemplateFormData(prev => ({
        ...prev,
        items: [...prev.items, emptyItem()],
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        items: [...prev.items, emptyItem()],
      }));
    }
  };

  const removeItem = (itemId: string, isTemplate: boolean = false) => {
    if (isTemplate) {
      setTemplateFormData(prev => ({
        ...prev,
        items: prev.items.filter(i => i.id !== itemId),
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        items: prev.items.filter(i => i.id !== itemId),
      }));
    }
  };

  const updateItem = (itemId: string, field: keyof ProposalItem, value: string | number, isTemplate: boolean = false) => {
    if (isTemplate) {
      setTemplateFormData(prev => ({
        ...prev,
        items: prev.items.map(i => i.id === itemId ? { ...i, [field]: value } : i),
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        items: prev.items.map(i => i.id === itemId ? { ...i, [field]: value } : i),
      }));
    }
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
      items: [emptyItem()],
    });
  };

  const resetTemplateForm = () => {
    setEditingTemplate(null);
    setTemplateFormData({
      name: '',
      description: '',
      items: [emptyItem()],
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
      items: template.items.length > 0 ? template.items : [emptyItem()],
    });
    setTemplateDialogOpen(true);
  };

  // Status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <Badge variant="outline">Rascunho</Badge>;
      case 'sent':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800">Enviada</Badge>;
      case 'viewed':
        return <Badge variant="secondary" className="bg-purple-100 text-purple-800">Visualizada</Badge>;
      case 'accepted':
        return <Badge variant="secondary" className="bg-green-100 text-green-800">Aceita</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejeitada</Badge>;
      case 'negotiating':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Negociando</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
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
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <PageHeader
          title="Propostas"
          description="Gerencie propostas comerciais e templates"
        />

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
              <div className="grid gap-4">
                {filteredProposals.map((proposal) => (
                  <Card key={proposal.id} className="group">
                    <CardContent className="py-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-foreground">{proposal.title}</h3>
                            {getStatusBadge(proposal.status)}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {proposal.recipient_name} • {proposal.recipient_email}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {proposal.total_hours}h • {proposal.total_value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Criada em {format(parseISO(proposal.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                          </p>
                        </div>
                        
                        <div className="flex items-center gap-2">
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
                  <Card key={template.id} className="group">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-lg">{template.name}</CardTitle>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="sm" variant="ghost">
                              <MoreVertical className="w-4 h-4" />
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
                      {template.description && (
                        <CardDescription>{template.description}</CardDescription>
                      )}
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        {template.items.length} {template.items.length === 1 ? 'item' : 'itens'}
                      </p>
                    </CardContent>
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
              {/* Template selector */}
              {!editingProposal && templates.length > 0 && (
                <div className="space-y-2">
                  <Label>Aplicar Template</Label>
                  <Select onValueChange={(id) => {
                    const template = templates.find(t => t.id === id);
                    if (template) handleApplyTemplate(template);
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um template (opcional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map(t => (
                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Recipient info */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="recipientName">Nome do Destinatário *</Label>
                  <Input
                    id="recipientName"
                    value={formData.recipientName}
                    onChange={(e) => setFormData(prev => ({ ...prev, recipientName: e.target.value }))}
                    placeholder="Nome do contato"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="recipientEmail">Email *</Label>
                  <Input
                    id="recipientEmail"
                    type="email"
                    value={formData.recipientEmail}
                    onChange={(e) => setFormData(prev => ({ ...prev, recipientEmail: e.target.value }))}
                    placeholder="email@empresa.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="recipientCompany">Empresa</Label>
                  <Input
                    id="recipientCompany"
                    value={formData.recipientCompany}
                    onChange={(e) => setFormData(prev => ({ ...prev, recipientCompany: e.target.value }))}
                    placeholder="Nome da empresa"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="validUntil">Válido até</Label>
                  <Input
                    id="validUntil"
                    type="date"
                    value={formData.validUntil}
                    onChange={(e) => setFormData(prev => ({ ...prev, validUntil: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Título da Proposta *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Ex: Proposta de Desenvolvimento Web"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Descrição geral da proposta..."
                  rows={3}
                />
              </div>

              {/* Items */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Itens / Serviços</Label>
                  <Button type="button" variant="outline" size="sm" onClick={() => addItem()}>
                    <Plus className="w-4 h-4 mr-1" />
                    Adicionar
                  </Button>
                </div>

                {formData.items.map((item, index) => (
                  <Card key={item.id} className="p-4">
                    <div className="grid gap-4 sm:grid-cols-2">
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
                          placeholder="Descrição breve"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Horas</Label>
                        <Input
                          type="number"
                          min="0"
                          value={item.hours}
                          onChange={(e) => updateItem(item.id, 'hours', Number(e.target.value))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Preço/Hora (R$)</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.pricePerHour}
                          onChange={(e) => updateItem(item.id, 'pricePerHour', Number(e.target.value))}
                        />
                      </div>
                    </div>
                    {formData.items.length > 1 && (
                      <div className="flex justify-end mt-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                          onClick={() => removeItem(item.id)}
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Remover
                        </Button>
                      </div>
                    )}
                  </Card>
                ))}

                {/* Totals */}
                <div className="flex justify-end gap-6 text-sm font-medium">
                  <span>Total: {formTotalHours}h</span>
                  <span>{formTotalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                </div>
              </div>
            </div>

            <DialogFooter>
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
                <Label htmlFor="templateName">Nome do Template *</Label>
                <Input
                  id="templateName"
                  value={templateFormData.name}
                  onChange={(e) => setTemplateFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ex: Desenvolvimento Web Básico"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="templateDescription">Descrição</Label>
                <Textarea
                  id="templateDescription"
                  value={templateFormData.description}
                  onChange={(e) => setTemplateFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Descrição do template..."
                  rows={2}
                />
              </div>

              {/* Items */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Itens / Serviços</Label>
                  <Button type="button" variant="outline" size="sm" onClick={() => addItem(true)}>
                    <Plus className="w-4 h-4 mr-1" />
                    Adicionar
                  </Button>
                </div>

                {templateFormData.items.map((item) => (
                  <Card key={item.id} className="p-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Serviço</Label>
                        <Input
                          value={item.service}
                          onChange={(e) => updateItem(item.id, 'service', e.target.value, true)}
                          placeholder="Nome do serviço"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Descrição</Label>
                        <Input
                          value={item.description}
                          onChange={(e) => updateItem(item.id, 'description', e.target.value, true)}
                          placeholder="Descrição breve"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Horas</Label>
                        <Input
                          type="number"
                          min="0"
                          value={item.hours}
                          onChange={(e) => updateItem(item.id, 'hours', Number(e.target.value), true)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Preço/Hora (R$)</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.pricePerHour}
                          onChange={(e) => updateItem(item.id, 'pricePerHour', Number(e.target.value), true)}
                        />
                      </div>
                    </div>
                    {templateFormData.items.length > 1 && (
                      <div className="flex justify-end mt-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                          onClick={() => removeItem(item.id, true)}
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Remover
                        </Button>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            </div>

            <DialogFooter>
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

        {/* Comments Dialog */}
        <Dialog open={viewCommentsDialogOpen} onOpenChange={setViewCommentsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Comentários</DialogTitle>
              <DialogDescription>
                {viewingCommentsFor?.title}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 max-h-[50vh] overflow-y-auto">
              {commentsLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : comments.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nenhum comentário ainda.
                </p>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className="p-3 bg-muted rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-sm">
                        {comment.author_name || 'Cliente'}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {format(parseISO(comment.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                    <p className="text-sm text-foreground">{comment.content}</p>
                  </div>
                ))
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Proposal Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir proposta?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação não pode ser desfeita. A proposta será excluída permanentemente.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteProposal}>Excluir</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Delete Template Dialog */}
        <AlertDialog open={deleteTemplateDialogOpen} onOpenChange={setDeleteTemplateDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir template?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação não pode ser desfeita. O template será excluído permanentemente.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteTemplate}>Excluir</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppLayout>
  );
};
