import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { supabase } from '@/integrations/supabase/client';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ProjectRequestForm } from '@/components/client/ProjectRequestForm';
import { ClientEditRequestForm } from '@/components/client/ClientEditRequestForm';
import { Plus, FolderKanban, Clock, Loader2, FileText, CheckCircle, XCircle, Search, ArrowRight, MoreVertical, Pencil, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ProjectRequest {
  id: string;
  client_id: string;
  title: string;
  briefing: string;
  status: string;
  admin_notes: string | null;
  converted_project_id: string | null;
  created_at: string;
}

export const ClientProjects: React.FC = () => {
  const { user } = useAuth();
  const { data, getProjectHours } = useData();
  const [requests, setRequests] = useState<ProjectRequest[]>([]);
  const [clientId, setClientId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  
  // Edit request form state
  const [editFormOpen, setEditFormOpen] = useState(false);
  const [editEntity, setEditEntity] = useState<{
    type: 'project' | 'project_request';
    id: string;
    data: Record<string, unknown>;
  } | null>(null);

  // Get client's projects from DataContext
  const clientProjects = data.projects;

  // Fetch project requests and client ID
  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      
      try {
        // Get client_id
        const { data: clientData } = await supabase
          .from('clients')
          .select('id')
          .eq('user_id', user.id)
          .single();
        
        if (clientData) {
          setClientId(clientData.id);
        }
        
        // Fetch requests
        const { data: requestsData, error } = await supabase
          .from('project_requests')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setRequests(requestsData || []);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const handleSubmitRequest = async (title: string, briefing: string, desiredDeadline?: string) => {
    if (!user) return;

    // Get client_id from the clients table using user_id
    const { data: clientData } = await supabase
      .from('clients')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!clientData) {
      toast.error('Erro: Cliente não encontrado');
      return;
    }

    const { data: newRequest, error } = await supabase
      .from('project_requests')
      .insert({
        client_id: clientData.id,
        title,
        briefing,
        desired_deadline: desiredDeadline || null,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating request:', error);
      toast.error('Erro ao enviar solicitação');
      return;
    }

    setRequests(prev => [newRequest, ...prev]);
    toast.success('Solicitação enviada com sucesso!');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Aguardando análise</Badge>;
      case 'in_review':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800">Em análise</Badge>;
      case 'approved':
        return <Badge variant="secondary" className="bg-green-100 text-green-800">Aprovado</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Não aprovado</Badge>;
      case 'converted':
        return <Badge variant="default">Projeto criado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-600" />;
      case 'in_review':
        return <Search className="w-5 h-5 text-blue-600" />;
      case 'approved':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'rejected':
        return <XCircle className="w-5 h-5 text-destructive" />;
      case 'converted':
        return <ArrowRight className="w-5 h-5 text-primary" />;
      default:
        return <FileText className="w-5 h-5 text-muted-foreground" />;
    }
  };

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
        title="Meus Projetos"
        description="Visualize seus projetos e solicite novos"
        actions={
          <Button onClick={() => setIsFormOpen(true)} className="px-3 sm:px-4">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline ml-2">Solicitar Novo Projeto</span>
          </Button>
        }
      />

      {/* Pending Requests Section */}
      {requests.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-foreground mb-4">Solicitações</h2>
          <div className="space-y-4">
            {requests.map((request) => {
              const canEdit = request.status === 'pending' || request.status === 'in_review';
              
              return (
                <Card key={request.id}>
                  <CardContent className="py-4">
                    <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4">
                      <div className="flex items-start gap-3 sm:gap-4 flex-1 min-w-0">
                        <div className="mt-0.5 flex-shrink-0">
                          {getStatusIcon(request.status)}
                        </div>
                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-medium text-foreground">{request.title}</h3>
                            <div className="sm:hidden">{getStatusBadge(request.status)}</div>
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2">{request.briefing}</p>
                          <p className="text-xs text-muted-foreground">
                            Enviado em {format(new Date(request.created_at), "dd 'de' MMM 'de' yyyy", { locale: ptBR })}
                          </p>
                          {request.admin_notes && (
                            <div className="mt-2 p-2 bg-muted rounded-md">
                              <p className="text-xs font-medium text-muted-foreground">Observação:</p>
                              <p className="text-sm text-foreground">{request.admin_notes}</p>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <div className="hidden sm:block">
                          {getStatusBadge(request.status)}
                        </div>
                        {canEdit && clientId && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => {
                                setEditEntity({
                                  type: 'project_request',
                                  id: request.id,
                                  data: {
                                    title: request.title,
                                    briefing: request.briefing,
                                    desired_deadline: (request as unknown as { desired_deadline?: string }).desired_deadline || null,
                                  },
                                });
                                setEditFormOpen(true);
                              }}>
                                <Pencil className="h-4 w-4 mr-2" />
                                Solicitar Edição
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Active Projects Section */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">Projetos em Andamento</h2>
        
        {clientProjects.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FolderKanban className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground mb-4">Você ainda não possui projetos.</p>
              <Button onClick={() => setIsFormOpen(true)} className="px-3 sm:px-4">
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline ml-2">Solicitar Primeiro Projeto</span>
                <span className="sm:hidden ml-2">Solicitar</span>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {clientProjects.map((project) => {
              const projectHours = getProjectHours(project.id);
              const projectTasks = data.tasks.filter(t => t.project_id === project.id);
              const completedTasks = projectTasks.filter(t => t.status === 'completed').length;
              
              return (
                <Card key={project.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-base">{project.name}</CardTitle>
                      <div className="flex items-center gap-2">
                        <Badge variant={project.status === 'active' ? 'default' : 'secondary'}>
                          {project.status === 'active' ? 'Ativo' : project.status}
                        </Badge>
                        {clientId && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => {
                                setEditEntity({
                                  type: 'project',
                                  id: project.id,
                                  data: {
                                    name: project.name,
                                    description: project.description || '',
                                    due_date: project.due_date || null,
                                  },
                                });
                                setEditFormOpen(true);
                              }}>
                                <Pencil className="h-4 w-4 mr-2" />
                                Solicitar Edição
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </div>
                    {project.due_date && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                        <Calendar className="w-3 h-3" />
                        Prazo: {format(parseISO(project.due_date), "dd/MM/yyyy", { locale: ptBR })}
                      </div>
                    )}
                  </CardHeader>
                  <CardContent>
                    {project.description && (
                      <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                        {project.description}
                      </p>
                    )}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Horas</p>
                        <p className="font-medium text-foreground">{projectHours}h</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Tarefas</p>
                        <p className="font-medium text-foreground">
                          {completedTasks}/{projectTasks.length} concluídas
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Request Form Dialog */}
      <ProjectRequestForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSubmit={handleSubmitRequest}
      />
      
      {/* Edit Request Form Dialog */}
      {editEntity && clientId && (
        <ClientEditRequestForm
          entityType={editEntity.type}
          entityId={editEntity.id}
          clientId={clientId}
          currentData={editEntity.data}
          open={editFormOpen}
          onOpenChange={(open) => {
            setEditFormOpen(open);
            if (!open) setEditEntity(null);
          }}
          onSuccess={() => {
            // Optionally refresh data
          }}
        />
      )}
    </div>
  );
};
