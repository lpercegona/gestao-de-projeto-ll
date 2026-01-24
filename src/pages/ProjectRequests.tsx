import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { supabase } from '@/integrations/supabase/client';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { 
  FileText, 
  Loader2, 
  Eye, 
  CheckCircle, 
  XCircle, 
  FolderPlus,
  Clock,
  Search,
  Calendar
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ProjectRequest {
  id: string;
  client_id: string;
  title: string;
  briefing: string;
  status: string;
  admin_notes: string | null;
  converted_project_id: string | null;
  desired_deadline: string | null;
  created_at: string;
  updated_at: string;
}

export const ProjectRequests: React.FC = () => {
  const { user } = useAuth();
  const { data, createProject, refreshData } = useData();
  const [requests, setRequests] = useState<ProjectRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterClient, setFilterClient] = useState<string>('all');
  
  // Dialog states
  const [viewRequest, setViewRequest] = useState<ProjectRequest | null>(null);
  const [convertRequest, setConvertRequest] = useState<ProjectRequest | null>(null);
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Fetch project requests
  useEffect(() => {
    const fetchRequests = async () => {
      try {
        const { data: requestsData, error } = await supabase
          .from('project_requests')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setRequests(requestsData || []);
      } catch (error) {
        console.error('Error fetching requests:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRequests();
  }, []);

  const getClientName = (clientId: string) => {
    const client = data.clients.find(c => c.id === clientId);
    return client?.company || client?.name || 'Cliente desconhecido';
  };

  const updateRequestStatus = async (requestId: string, status: string, notes?: string) => {
    setSubmitting(true);
    try {
      const updateData: { status: string; admin_notes?: string } = { status };
      if (notes !== undefined) {
        updateData.admin_notes = notes;
      }

      const { error } = await supabase
        .from('project_requests')
        .update(updateData)
        .eq('id', requestId);

      if (error) throw error;

      setRequests(prev => prev.map(r => 
        r.id === requestId ? { ...r, status, admin_notes: notes ?? r.admin_notes } : r
      ));
      
      toast.success(`Status atualizado para: ${getStatusLabel(status)}`);
    } catch (error) {
      console.error('Error updating request:', error);
      toast.error('Erro ao atualizar status');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConvertToProject = async () => {
    if (!convertRequest || !projectName.trim()) return;

    setSubmitting(true);
    try {
      // Create the project
      const newProject = await createProject({
        client_id: convertRequest.client_id,
        name: projectName.trim(),
        description: projectDescription.trim() || convertRequest.briefing,
        status: 'active',
        custom_fields: {},
      });

      if (!newProject) {
        throw new Error('Failed to create project');
      }

      // Update request status
      const { error } = await supabase
        .from('project_requests')
        .update({
          status: 'converted',
          converted_project_id: newProject.id,
          admin_notes: adminNotes.trim() || null,
        })
        .eq('id', convertRequest.id);

      if (error) throw error;

      setRequests(prev => prev.map(r => 
        r.id === convertRequest.id 
          ? { ...r, status: 'converted', converted_project_id: newProject.id, admin_notes: adminNotes.trim() || null } 
          : r
      ));

      await refreshData();
      toast.success('Projeto criado com sucesso!');
      setConvertRequest(null);
      setProjectName('');
      setProjectDescription('');
      setAdminNotes('');
    } catch (error) {
      console.error('Error converting request:', error);
      toast.error('Erro ao criar projeto');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'Aguardando';
      case 'in_review': return 'Em análise';
      case 'approved': return 'Aprovado';
      case 'rejected': return 'Rejeitado';
      case 'converted': return 'Convertido';
      default: return status;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Aguardando</Badge>;
      case 'in_review':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800">Em análise</Badge>;
      case 'approved':
        return <Badge variant="secondary" className="bg-green-100 text-green-800">Aprovado</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejeitado</Badge>;
      case 'converted':
        return <Badge variant="default">Convertido</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Filter requests
  const filteredRequests = requests.filter(r => {
    if (filterStatus !== 'all' && r.status !== filterStatus) return false;
    if (filterClient !== 'all' && r.client_id !== filterClient) return false;
    return true;
  });

  // Get unique clients from requests
  const requestClients = [...new Set(requests.map(r => r.client_id))];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Solicitações de Projetos"
        description="Gerencie as solicitações de projetos enviadas pelos clientes"
      />

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="py-4">
          <div className="flex flex-wrap gap-4">
            <div className="w-48">
              <Label className="mb-2 block">Status</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="pending">Aguardando</SelectItem>
                  <SelectItem value="in_review">Em análise</SelectItem>
                  <SelectItem value="approved">Aprovado</SelectItem>
                  <SelectItem value="rejected">Rejeitado</SelectItem>
                  <SelectItem value="converted">Convertido</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-64">
              <Label className="mb-2 block">Cliente</Label>
              <Select value={filterClient} onValueChange={setFilterClient}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os clientes</SelectItem>
                  {requestClients.map(clientId => (
                    <SelectItem key={clientId} value={clientId}>
                      {getClientName(clientId)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <div className="grid gap-4 md:grid-cols-5 mb-6">
        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-muted-foreground">Total</p>
            <p className="text-2xl font-bold text-foreground">{requests.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-muted-foreground">Aguardando</p>
            <p className="text-2xl font-bold text-yellow-600">
              {requests.filter(r => r.status === 'pending').length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-muted-foreground">Em análise</p>
            <p className="text-2xl font-bold text-blue-600">
              {requests.filter(r => r.status === 'in_review').length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-muted-foreground">Aprovados</p>
            <p className="text-2xl font-bold text-green-600">
              {requests.filter(r => r.status === 'approved').length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-muted-foreground">Convertidos</p>
            <p className="text-2xl font-bold text-primary">
              {requests.filter(r => r.status === 'converted').length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Requests List */}
      {filteredRequests.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">
              {requests.length === 0 
                ? 'Nenhuma solicitação recebida ainda.'
                : 'Nenhuma solicitação encontrada com os filtros selecionados.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredRequests.map((request) => (
            <Card key={request.id}>
              <CardContent className="py-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-medium text-foreground">{request.title}</h3>
                      {getStatusBadge(request.status)}
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      <strong>Cliente:</strong> {getClientName(request.client_id)}
                    </p>
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                      {request.briefing}
                    </p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span>
                        Enviado em {format(new Date(request.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </span>
                      {request.desired_deadline && (
                        <span className="flex items-center gap-1 font-medium text-foreground">
                          <Calendar className="w-3 h-3" />
                          Prazo desejado: {format(new Date(request.desired_deadline), "dd/MM/yyyy", { locale: ptBR })}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setViewRequest(request)}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      Ver
                    </Button>
                    
                    {request.status === 'pending' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => updateRequestStatus(request.id, 'in_review')}
                        disabled={submitting}
                      >
                        <Search className="w-4 h-4 mr-1" />
                        Analisar
                      </Button>
                    )}
                    
                    {(request.status === 'pending' || request.status === 'in_review') && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-green-600 hover:text-green-600 hover:bg-green-100"
                          onClick={() => {
                            setConvertRequest(request);
                            setProjectName(request.title);
                            setProjectDescription(request.briefing);
                          }}
                          disabled={submitting}
                        >
                          <FolderPlus className="w-4 h-4 mr-1" />
                          Converter
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => updateRequestStatus(request.id, 'rejected')}
                          disabled={submitting}
                        >
                          <XCircle className="w-4 h-4 mr-1" />
                          Rejeitar
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* View Request Dialog */}
      <Dialog open={!!viewRequest} onOpenChange={(open) => !open && setViewRequest(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{viewRequest?.title}</DialogTitle>
            <DialogDescription>
              Solicitação de {viewRequest && getClientName(viewRequest.client_id)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-muted-foreground">Status</Label>
              <div className="mt-1">
                {viewRequest && getStatusBadge(viewRequest.status)}
              </div>
            </div>
            <div>
              <Label className="text-muted-foreground">Briefing</Label>
              <p className="mt-1 text-foreground whitespace-pre-wrap">{viewRequest?.briefing}</p>
            </div>
            {viewRequest?.admin_notes && (
              <div>
                <Label className="text-muted-foreground">Notas do Admin</Label>
                <p className="mt-1 text-foreground">{viewRequest.admin_notes}</p>
              </div>
            )}
            {viewRequest?.desired_deadline && (
              <div>
                <Label className="text-muted-foreground">Prazo Desejado</Label>
                <p className="mt-1 text-foreground flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  {format(new Date(viewRequest.desired_deadline), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </p>
              </div>
            )}
            <div>
              <Label className="text-muted-foreground">Data de Envio</Label>
              <p className="mt-1 text-foreground">
                {viewRequest && format(new Date(viewRequest.created_at), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Convert to Project Dialog */}
      <Dialog open={!!convertRequest} onOpenChange={(open) => !open && setConvertRequest(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Converter em Projeto</DialogTitle>
            <DialogDescription>
              Crie um novo projeto a partir desta solicitação.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="projectName">Nome do Projeto *</Label>
              <Input
                id="projectName"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="Nome do projeto"
                required
                disabled={submitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="projectDesc">Descrição</Label>
              <Textarea
                id="projectDesc"
                value={projectDescription}
                onChange={(e) => setProjectDescription(e.target.value)}
                placeholder="Descrição do projeto"
                rows={4}
                disabled={submitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="adminNotes">Notas para o Cliente (opcional)</Label>
              <Textarea
                id="adminNotes"
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Mensagem que será visível para o cliente"
                rows={2}
                disabled={submitting}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConvertRequest(null)}
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConvertToProject}
              disabled={submitting || !projectName.trim()}
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Criar Projeto
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
