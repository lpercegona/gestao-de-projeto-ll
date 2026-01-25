import React, { useState, useEffect } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Loader2, CheckCircle, XCircle, Clock, FileText, FolderKanban, ArrowRight, Eye } from 'lucide-react';

interface EditRequest {
  id: string;
  entity_type: 'project' | 'project_request';
  entity_id: string;
  client_id: string;
  requested_by: string;
  status: 'pending' | 'approved' | 'rejected';
  original_data: Record<string, unknown>;
  proposed_data: Record<string, unknown>;
  admin_notes: string | null;
  processed_by: string | null;
  processed_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  client?: {
    name: string;
    company: string | null;
  };
}

export const EditRequests: React.FC = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState<EditRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<EditRequest | null>(null);
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('edit_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Fetch client info separately
      const requestsWithClients: EditRequest[] = [];
      for (const req of (data || [])) {
        const { data: clientData } = await supabase
          .from('clients')
          .select('name, company')
          .eq('id', req.client_id)
          .single();
        
        requestsWithClients.push({
          ...req,
          client: clientData || undefined,
        } as EditRequest);
      }
      
      setRequests(requestsWithClients);
    } catch (error) {
      console.error('Error fetching edit requests:', error);
      toast.error('Erro ao carregar solicitações de edição');
    } finally {
      setLoading(false);
    }
  };

  const handleReview = (request: EditRequest) => {
    setSelectedRequest(request);
    setAdminNotes(request.admin_notes || '');
    setIsReviewDialogOpen(true);
  };

  const processRequest = async (action: 'approved' | 'rejected') => {
    if (!selectedRequest || !user) return;
    
    setProcessing(true);
    try {
      // If approving, apply the changes to the original entity
      if (action === 'approved') {
        if (selectedRequest.entity_type === 'project') {
          const { error: updateError } = await supabase
            .from('projects')
            .update(selectedRequest.proposed_data)
            .eq('id', selectedRequest.entity_id);
          
          if (updateError) throw updateError;
        } else if (selectedRequest.entity_type === 'project_request') {
          const { error: updateError } = await supabase
            .from('project_requests')
            .update(selectedRequest.proposed_data)
            .eq('id', selectedRequest.entity_id);
          
          if (updateError) throw updateError;
        }
      }

      // Update the edit request status
      const { error } = await supabase
        .from('edit_requests')
        .update({
          status: action,
          admin_notes: adminNotes,
          processed_by: user.id,
          processed_at: new Date().toISOString(),
        })
        .eq('id', selectedRequest.id);

      if (error) throw error;

      // Create notification for client
      const { data: clientData } = await supabase
        .from('clients')
        .select('user_id')
        .eq('id', selectedRequest.client_id)
        .single();

      if (clientData?.user_id) {
        await supabase.from('notifications').insert({
          user_id: clientData.user_id,
          type: action === 'approved' ? 'edit_approved' : 'edit_rejected',
          title: action === 'approved' ? 'Edição aprovada' : 'Edição rejeitada',
          message: action === 'approved' 
            ? 'Sua solicitação de edição foi aprovada e as alterações foram aplicadas.'
            : `Sua solicitação de edição foi rejeitada. ${adminNotes ? `Motivo: ${adminNotes}` : ''}`,
        });
      }

      toast.success(action === 'approved' ? 'Edição aprovada com sucesso!' : 'Edição rejeitada.');
      setIsReviewDialogOpen(false);
      fetchRequests();
    } catch (error) {
      console.error('Error processing request:', error);
      toast.error('Erro ao processar solicitação');
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Pendente</Badge>;
      case 'approved':
        return <Badge variant="secondary" className="bg-green-100 text-green-800">Aprovada</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejeitada</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-600" />;
      case 'approved':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'rejected':
        return <XCircle className="w-5 h-5 text-destructive" />;
      default:
        return <FileText className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const getEntityIcon = (type: string) => {
    switch (type) {
      case 'project':
        return <FolderKanban className="w-4 h-4" />;
      case 'project_request':
        return <FileText className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  const getEntityLabel = (type: string) => {
    switch (type) {
      case 'project':
        return 'Projeto';
      case 'project_request':
        return 'Solicitação';
      default:
        return type;
    }
  };

  const formatFieldLabel = (key: string) => {
    const labels: Record<string, string> = {
      description: 'Descrição',
      due_date: 'Prazo',
      title: 'Título',
      briefing: 'Briefing',
      desired_deadline: 'Prazo Desejado',
      name: 'Nome',
    };
    return labels[key] || key;
  };

  const formatFieldValue = (key: string, value: unknown) => {
    if (value === null || value === undefined) return '—';
    if (key.includes('date') || key.includes('deadline')) {
      return format(parseISO(value as string), "dd/MM/yyyy", { locale: ptBR });
    }
    return String(value);
  };

  const pendingCount = requests.filter(r => r.status === 'pending').length;

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
        title="Solicitações de Edição"
        description="Gerencie as alterações propostas pelos clientes"
      />

      {requests.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">Nenhuma solicitação de edição encontrada.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Pending requests first */}
          {pendingCount > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-foreground mb-3">
                Pendentes ({pendingCount})
              </h2>
              <div className="space-y-3">
                {requests.filter(r => r.status === 'pending').map((request) => (
                  <Card key={request.id} className="border-yellow-200">
                    <CardContent className="py-4">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                        <div className="flex items-start gap-3 flex-1">
                          {getStatusIcon(request.status)}
                          <div className="space-y-1 flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant="outline" className="flex items-center gap-1">
                                {getEntityIcon(request.entity_type)}
                                {getEntityLabel(request.entity_type)}
                              </Badge>
                              {getStatusBadge(request.status)}
                            </div>
                            <p className="font-medium text-foreground">
                              {request.client?.company || request.client?.name || 'Cliente'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Solicitado em {format(parseISO(request.created_at), "dd 'de' MMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
                            </p>
                          </div>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleReview(request)}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          Revisar
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Processed requests */}
          {requests.filter(r => r.status !== 'pending').length > 0 && (
            <div className="mt-8">
              <h2 className="text-lg font-semibold text-foreground mb-3">
                Processadas
              </h2>
              <div className="space-y-3">
                {requests.filter(r => r.status !== 'pending').map((request) => (
                  <Card key={request.id} className="opacity-75">
                    <CardContent className="py-4">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                        <div className="flex items-start gap-3 flex-1">
                          {getStatusIcon(request.status)}
                          <div className="space-y-1 flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant="outline" className="flex items-center gap-1">
                                {getEntityIcon(request.entity_type)}
                                {getEntityLabel(request.entity_type)}
                              </Badge>
                              {getStatusBadge(request.status)}
                            </div>
                            <p className="font-medium text-foreground">
                              {request.client?.company || request.client?.name || 'Cliente'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Processado em {request.processed_at && format(parseISO(request.processed_at), "dd/MM/yyyy", { locale: ptBR })}
                            </p>
                            {request.admin_notes && (
                              <p className="text-sm text-muted-foreground mt-1">
                                Observação: {request.admin_notes}
                              </p>
                            )}
                          </div>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleReview(request)}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          Ver
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Review Dialog */}
      <Dialog open={isReviewDialogOpen} onOpenChange={setIsReviewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Revisar Solicitação de Edição</DialogTitle>
            <DialogDescription>
              Compare os dados originais com as alterações propostas pelo cliente.
            </DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="flex items-center gap-1">
                  {getEntityIcon(selectedRequest.entity_type)}
                  {getEntityLabel(selectedRequest.entity_type)}
                </Badge>
                {getStatusBadge(selectedRequest.status)}
              </div>

              {/* Changes comparison */}
              <div className="space-y-4">
                <h4 className="font-medium text-sm text-muted-foreground">Alterações Propostas:</h4>
                <div className="space-y-3">
                  {Object.keys(selectedRequest.proposed_data).map((key) => {
                    const originalValue = selectedRequest.original_data[key];
                    const proposedValue = selectedRequest.proposed_data[key];
                    const hasChanged = JSON.stringify(originalValue) !== JSON.stringify(proposedValue);

                    return (
                      <div key={key} className={`p-3 rounded-lg border ${hasChanged ? 'bg-muted/50' : ''}`}>
                        <Label className="text-sm font-medium">{formatFieldLabel(key)}</Label>
                        <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">Original:</p>
                            <p className="text-sm bg-background p-2 rounded border">
                              {formatFieldValue(key, originalValue)}
                            </p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              Proposto: {hasChanged && <ArrowRight className="w-3 h-3 text-primary" />}
                            </p>
                            <p className={`text-sm p-2 rounded border ${hasChanged ? 'bg-primary/10 border-primary/30' : 'bg-background'}`}>
                              {formatFieldValue(key, proposedValue)}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Admin notes */}
              {selectedRequest.status === 'pending' && (
                <div className="space-y-2">
                  <Label htmlFor="adminNotes">Observações (opcional)</Label>
                  <Textarea
                    id="adminNotes"
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="Adicione uma observação para o cliente..."
                    rows={3}
                  />
                </div>
              )}

              {selectedRequest.status !== 'pending' && selectedRequest.admin_notes && (
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm font-medium text-muted-foreground">Observação do Admin:</p>
                  <p className="text-sm mt-1">{selectedRequest.admin_notes}</p>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="flex-col sm:flex-row gap-2">
            {selectedRequest?.status === 'pending' ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => setIsReviewDialogOpen(false)}
                  disabled={processing}
                >
                  Cancelar
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => processRequest('rejected')}
                  disabled={processing}
                >
                  {processing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <XCircle className="w-4 h-4 mr-2" />}
                  Rejeitar
                </Button>
                <Button
                  onClick={() => processRequest('approved')}
                  disabled={processing}
                >
                  {processing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                  Aprovar
                </Button>
              </>
            ) : (
              <Button variant="outline" onClick={() => setIsReviewDialogOpen(false)}>
                Fechar
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
