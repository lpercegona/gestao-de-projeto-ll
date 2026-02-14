import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  CheckCircle,
  XCircle,
  MessageSquare,
  Loader2,
  FileText,
  Clock,
  DollarSign,
  Calendar,
  Building2,
  Mail,
  User,
  Send,
} from 'lucide-react';
import { format, parseISO, isPast } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import LogoOras from '@/assets/logo-oras.svg';
import { formatHours } from '@/lib/formatHours';

interface ProposalItem {
  id: string;
  service: string;
  description: string;
  hours: number;
  pricePerHour: number;
}

interface RawProposalItem {
  id?: string;
  service?: string | null;
  description?: string | null;
  hours?: number | string | null;
  pricePerHour?: number | string | null;
  price_per_hour?: number | string | null;
}

interface ProposalData {
  proposal_id: string;
  template_id?: string | null;
  template_content?: string | null;
  title: string;
  description: string | null;
  recipient_name: string;
  recipient_email: string;
  recipient_company: string | null;
  items: ProposalItem[];
  total_hours: number;
  total_value: number;
  status: string;
  valid_until: string | null;
  created_at: string;
}

const parseNumericValue = (value: unknown): number => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === 'string') {
    const normalized = value
      .trim()
      .replace(/\s/g, '')
      .replace(/R\$/gi, '')
      .replace(/\./g, '')
      .replace(',', '.');

    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
};

const normalizeProposalItems = (items: unknown): ProposalItem[] => {
  if (!Array.isArray(items)) return [];

  return items.map((rawItem, index) => {
    const item = rawItem as RawProposalItem;
    return {
      id: item.id || `item-${index}`,
      service: item.service || '',
      description: item.description || '',
      hours: parseNumericValue(item.hours),
      pricePerHour: parseNumericValue(item.pricePerHour ?? item.price_per_hour),
    };
  });
};

interface Comment {
  comment_id: string;
  author_type: string;
  author_name: string | null;
  content: string;
  created_at: string;
}

export const PublicProposal: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  
  const [proposal, setProposal] = useState<ProposalData | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Response dialog
  const [responseDialogOpen, setResponseDialogOpen] = useState(false);
  const [responseAction, setResponseAction] = useState<'accepted' | 'rejected' | 'negotiating' | null>(null);
  const [responseComment, setResponseComment] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  // Comment dialog
  const [commentDialogOpen, setCommentDialogOpen] = useState(false);
  const [newComment, setNewComment] = useState('');

  // Access validation
  const [accessEmail, setAccessEmail] = useState('');
  const [accessValidated, setAccessValidated] = useState(false);
  const [accessError, setAccessError] = useState<string | null>(null);

  const buildServicesList = (items: ProposalItem[]) => {
    const validItems = items.filter((item) => item.service?.trim());

    if (validItems.length === 0) return '';

    const listItems = validItems
      .map(
        (item) =>
          `<li>${item.service}${item.description ? `: ${item.description}` : ''}</li>`,
      )
      .join('');

    return `<ul>${listItems}</ul>`;
  };

  const renderProposalContent = (data: ProposalData) => {
    if (!data.template_content?.trim()) {
      return data.description || '';
    }

    return data.template_content
      .replace(/\{\{nome_cliente\}\}/g, data.recipient_name || '')
      .replace(/\{\{email_cliente\}\}/g, data.recipient_email || '')
      .replace(/\{\{empresa_cliente\}\}/g, data.recipient_company || '')
      .replace(/\{\{data_envio\}\}/g, format(parseISO(data.created_at), 'dd/MM/yyyy'))
      .replace(
        /\{\{valor_total\}\}/g,
        Number(data.total_value).toLocaleString('pt-BR', {
          style: 'currency',
          currency: 'BRL',
        }),
      )
      .replace(/\{\{descricao_proposta\}\}/g, data.description || '')
      .replace(/\{\{listagem_servicos\}\}/g, buildServicesList(data.items));
  };

  useEffect(() => {
    setAccessValidated(false);
    setAccessEmail('');
    setAccessError(null);
    fetchProposal();
  }, [token]);

  const fetchProposal = async () => {
    if (!token) {
      setError('Token inválido');
      setLoading(false);
      return;
    }

    try {
      // Fetch proposal
      const { data: proposalData, error: proposalError } = await supabase
        .rpc('get_proposal_by_token', { p_token: token });

      if (proposalError) throw proposalError;
      
      if (!proposalData || proposalData.length === 0) {
        setError('Proposta não encontrada');
        setLoading(false);
        return;
      }

      const rawProposal = proposalData[0];
      setProposal({
        ...rawProposal,
        total_hours: parseNumericValue(rawProposal.total_hours),
        total_value: parseNumericValue(rawProposal.total_value),
        items: normalizeProposalItems(rawProposal.items),
      });

      // Fetch comments
      const { data: commentsData } = await supabase
        .rpc('get_proposal_comments_by_token', { p_token: token });
      
      setComments(commentsData || []);
    } catch (err) {
      console.error('Error fetching proposal:', err);
      setError('Erro ao carregar proposta');
    } finally {
      setLoading(false);
    }
  };

  const handleResponse = async () => {
    if (!token || !responseAction) return;
    
    setSubmitting(true);
    try {
      const { data, error } = await supabase
        .rpc('respond_to_proposal', {
          p_token: token,
          p_action: responseAction,
          p_comment: responseComment || null,
          p_author_name: authorName || null,
        });

      if (error) throw error;
      
      if (data) {
        toast.success(
          responseAction === 'accepted' ? 'Proposta aceita!' :
          responseAction === 'rejected' ? 'Proposta recusada.' :
          'Solicitação enviada!'
        );
        setResponseDialogOpen(false);
        setResponseComment('');
        setAuthorName('');
        fetchProposal();
      }
    } catch (err) {
      console.error('Error responding to proposal:', err);
      toast.error('Erro ao enviar resposta');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendComment = async () => {
    if (!token || !newComment.trim()) return;
    
    setSubmitting(true);
    try {
      const { error } = await supabase
        .rpc('respond_to_proposal', {
          p_token: token,
          p_action: 'comment',
          p_comment: newComment,
          p_author_name: authorName || null,
        });

      if (error) throw error;
      
      toast.success('Comentário enviado!');
      setCommentDialogOpen(false);
      setNewComment('');
      fetchProposal();
    } catch (err) {
      console.error('Error sending comment:', err);
      toast.error('Erro ao enviar comentário');
    } finally {
      setSubmitting(false);
    }
  };

  const openResponseDialog = (action: 'accepted' | 'rejected' | 'negotiating') => {
    setResponseAction(action);
    setResponseDialogOpen(true);
  };

  const normalizeEmail = (email: string) => email.trim().toLowerCase();

  const handleAccessValidation = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!proposal) return;

    const typedEmail = normalizeEmail(accessEmail);
    const expectedEmail = normalizeEmail(proposal.recipient_email || '');

    if (!typedEmail) {
      setAccessError('Informe o email para acessar a proposta.');
      return;
    }

    if (typedEmail !== expectedEmail) {
      setAccessValidated(false);
      setAccessError('Email inválido para este link de proposta.');
      return;
    }

    setAccessError(null);
    setAccessValidated(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800">Enviada</Badge>;
      case 'viewed':
        return <Badge variant="secondary" className="bg-purple-100 text-purple-800">Visualizada</Badge>;
      case 'accepted':
        return <Badge variant="secondary" className="bg-green-100 text-green-800">Aceita</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Recusada</Badge>;
      case 'negotiating':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Em Negociação</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const isExpired = proposal?.valid_until ? isPast(parseISO(proposal.valid_until)) : false;
  const canRespond = proposal && !['accepted', 'rejected'].includes(proposal.status) && !isExpired;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !proposal) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="py-12 text-center">
            <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold text-foreground mb-2">
              {error || 'Proposta não encontrada'}
            </h2>
            <p className="text-muted-foreground">
              Verifique se o link está correto e tente novamente.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!accessValidated) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="space-y-2 text-center">
            <CardTitle>Validar acesso à proposta</CardTitle>
            <CardDescription>
              Para visualizar os detalhes, informe o email do destinatário desta proposta.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAccessValidation} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="accessEmail">Email do cliente</Label>
                <Input
                  id="accessEmail"
                  type="email"
                  value={accessEmail}
                  onChange={(event) => {
                    setAccessEmail(event.target.value);
                    if (accessError) setAccessError(null);
                  }}
                  placeholder="cliente@empresa.com"
                  autoComplete="email"
                  required
                />
              </div>

              {accessError && (
                <p className="text-sm text-destructive">{accessError}</p>
              )}

              <Button type="submit" className="w-full">
                Acessar proposta
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <header className="bg-background border-b border-border py-4 px-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <img src={LogoOras} alt="ORAS" className="h-8" />
          {getStatusBadge(proposal.status)}
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
        {/* Expired warning */}
        {isExpired && (
          <Card className="border-destructive bg-destructive/10">
            <CardContent className="py-4">
              <p className="text-destructive font-medium text-center">
                Esta proposta expirou em {format(parseISO(proposal.valid_until!), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Proposal Header */}
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">{proposal.title}</CardTitle>
            {renderProposalContent(proposal) && (
              <CardDescription className="text-base mt-2">
                <div
                  className="prose prose-sm max-w-none dark:prose-invert"
                  dangerouslySetInnerHTML={{ __html: renderProposalContent(proposal) }}
                />
              </CardDescription>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex items-center gap-3">
                <User className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Destinatário</p>
                  <p className="font-medium">{proposal.recipient_name}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{proposal.recipient_email}</p>
                </div>
              </div>
              {proposal.recipient_company && (
                <div className="flex items-center gap-3">
                  <Building2 className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Empresa</p>
                    <p className="font-medium">{proposal.recipient_company}</p>
                  </div>
                </div>
              )}
              {proposal.valid_until && (
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Válido até</p>
                    <p className="font-medium">
                      {format(parseISO(proposal.valid_until), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Items */}
        <Card>
          <CardHeader>
            <CardTitle>Serviços Incluídos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {proposal.items.map((item, index) => (
              <div key={item.id || index} className="p-4 bg-muted/50 rounded-lg">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                  <h4 className="font-semibold text-foreground">{item.service}</h4>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      {item.hours}h
                    </span>
                    <span className="flex items-center gap-1">
                      <DollarSign className="w-4 h-4 text-muted-foreground" />
                      {Number(item.pricePerHour).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}/h
                    </span>
                  </div>
                </div>
                {item.description && (
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                )}
                <div className="mt-2 text-right">
                  <span className="font-medium">
                    Subtotal: {(item.hours * item.pricePerHour).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                </div>
              </div>
            ))}

            <Separator />

            {/* Totals */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-primary/5 rounded-lg">
              <div className="flex items-center gap-6">
                <div>
                  <p className="text-sm text-muted-foreground">Total de Horas</p>
                  <p className="text-xl font-bold text-foreground">{formatHours(proposal.total_hours)}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Valor Total</p>
                <p className="text-2xl font-bold text-primary">
                  {Number(proposal.total_value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Comments */}
        {comments.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Comentários
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {comments.map((comment) => (
                <div
                  key={comment.comment_id}
                  className={`p-3 rounded-lg ${
                    comment.author_type === 'admin' ? 'bg-primary/5 ml-4' : 'bg-muted mr-4'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm">
                      {comment.author_name || (comment.author_type === 'admin' ? 'Equipe' : 'Você')}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {format(parseISO(comment.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </span>
                  </div>
                  <p className="text-sm text-foreground">{comment.content}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        {canRespond && (
          <Card>
            <CardContent className="py-6">
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  size="lg"
                  className="bg-green-600 hover:bg-green-700"
                  onClick={() => openResponseDialog('accepted')}
                >
                  <CheckCircle className="w-5 h-5 mr-2" />
                  Aceitar Proposta
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => openResponseDialog('negotiating')}
                >
                  <MessageSquare className="w-5 h-5 mr-2" />
                  Solicitar Alterações
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="text-destructive border-destructive hover:bg-destructive/10"
                  onClick={() => openResponseDialog('rejected')}
                >
                  <XCircle className="w-5 h-5 mr-2" />
                  Recusar
                </Button>
              </div>
              
              <div className="text-center mt-4">
                <Button variant="link" onClick={() => setCommentDialogOpen(true)}>
                  Enviar apenas um comentário
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Response Dialog */}
        <Dialog open={responseDialogOpen} onOpenChange={setResponseDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {responseAction === 'accepted' && 'Aceitar Proposta'}
                {responseAction === 'rejected' && 'Recusar Proposta'}
                {responseAction === 'negotiating' && 'Solicitar Alterações'}
              </DialogTitle>
              <DialogDescription>
                {responseAction === 'accepted' && 'Confirme que deseja aceitar esta proposta.'}
                {responseAction === 'rejected' && 'Informe o motivo da recusa (opcional).'}
                {responseAction === 'negotiating' && 'Descreva as alterações desejadas.'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="authorName">Seu Nome</Label>
                <Input
                  id="authorName"
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  placeholder="Nome para identificação"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="comment">
                  {responseAction === 'negotiating' ? 'Descreva as alterações *' : 'Comentário (opcional)'}
                </Label>
                <Textarea
                  id="comment"
                  value={responseComment}
                  onChange={(e) => setResponseComment(e.target.value)}
                  placeholder={
                    responseAction === 'accepted' ? 'Alguma observação adicional?' :
                    responseAction === 'rejected' ? 'Motivo da recusa...' :
                    'Descreva as alterações que deseja...'
                  }
                  rows={4}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setResponseDialogOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleResponse}
                disabled={submitting || (responseAction === 'negotiating' && !responseComment.trim())}
                className={
                  responseAction === 'accepted' ? 'bg-green-600 hover:bg-green-700' :
                  responseAction === 'rejected' ? 'bg-destructive hover:bg-destructive/90' :
                  ''
                }
              >
                {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Confirmar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Comment Dialog */}
        <Dialog open={commentDialogOpen} onOpenChange={setCommentDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Enviar Comentário</DialogTitle>
              <DialogDescription>
                Envie uma mensagem ou dúvida sobre a proposta.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="commentAuthor">Seu Nome</Label>
                <Input
                  id="commentAuthor"
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  placeholder="Nome para identificação"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="newComment">Mensagem *</Label>
                <Textarea
                  id="newComment"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Sua mensagem..."
                  rows={4}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setCommentDialogOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleSendComment}
                disabled={submitting || !newComment.trim()}
              >
                {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                <Send className="w-4 h-4 mr-2" />
                Enviar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-6 mt-12">
        <div className="max-w-4xl mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>
            Proposta gerada em {format(parseISO(proposal.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </p>
        </div>
      </footer>
    </div>
  );
};
