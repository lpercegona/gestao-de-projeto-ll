import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  ArrowLeft,
  Info,
  Link as LinkIcon,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { WysiwygEditor } from '@/components/ui/wysiwyg-editor';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TemplateSectionEditor, type TemplateSection } from '@/components/proposals/TemplateSectionEditor';

interface ProposalItem {
  id: string;
  service: string;
  description: string;
  hours: number;
  pricePerHour: number;
  catalogItemId?: string;
}

interface ServiceCatalogItem {
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
  share_static_html?: string | null;
}

interface ProposalTemplate {
  id: string;
  name: string;
  description: string | null;
  items: ProposalItem[];
  sections?: TemplateSection[];
}

const MANUAL_ITEMS_STORAGE_KEY = 'services:manual-items';

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

const formatHours = (hours: number): string => {
  const normalizedHours = Number.isFinite(hours) ? hours : 0;
  return `${normalizedHours.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}h`;
};

const calculateTotals = (items: ProposalItem[]) => {
  const totalHours = items.reduce((sum, item) => sum + parseNumericValue(item.hours), 0);
  const totalValue = items.reduce((sum, item) => sum + (parseNumericValue(item.hours) * parseNumericValue(item.pricePerHour)), 0);
  return { totalHours, totalValue };
};

const getProposalTotals = (proposal: Proposal) => {
  if (proposal.items.length > 0) {
    return calculateTotals(proposal.items);
  }

  return {
    totalHours: parseNumericValue(proposal.total_hours),
    totalValue: parseNumericValue(proposal.total_value),
  };
};

const buildTemplateServicesList = (items: ProposalItem[]) => {
  const validItems = items.filter((item) => item.service?.trim());

  if (validItems.length === 0) return '';

  const listItems = validItems
    .map((item) => `<li>${item.service}${item.description ? `: ${item.description}` : ''}</li>`)
    .join('');

  return `<ul>${listItems}</ul>`;
};

const renderTemplateContent = (templateContent: string, proposal: Proposal) => {
  const totals = getProposalTotals(proposal);

  return templateContent
    .replace(/\{\{nome_cliente\}\}/g, proposal.recipient_name || '')
    .replace(/\{\{email_cliente\}\}/g, proposal.recipient_email || '')
    .replace(/\{\{empresa_cliente\}\}/g, proposal.recipient_company || '')
    .replace(/\{\{data_envio\}\}/g, format(parseISO(proposal.created_at), 'dd/MM/yyyy'))
    .replace(
      /\{\{valor_total\}\}/g,
      Number(totals.totalValue).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      }),
    )
    .replace(/\{\{descricao_proposta\}\}/g, proposal.description || '')
    .replace(/\{\{listagem_servicos\}\}/g, buildTemplateServicesList(proposal.items));
};


const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const buildProposalShareStaticHtml = (proposal: Proposal, templateContent: string | null) => {
  const totals = getProposalTotals(proposal);
  const renderedTemplate = templateContent ? renderTemplateContent(templateContent, proposal) : '';

  const rows = proposal.items.map((item) => `
    <tr>
      <td>${escapeHtml(item.service || '-')}</td>
      <td style="text-align:right">${formatHours(item.hours)}</td>
      <td style="text-align:right">${Number(item.pricePerHour).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
      <td style="text-align:right">${(item.hours * item.pricePerHour).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
    </tr>`).join('');

  return `
    <section style="font-family: Inter, Arial, sans-serif; color:#111827; line-height:1.5">
      <h1 style="margin:0 0 8px; font-size:28px">${escapeHtml(proposal.title)}</h1>
      <p style="display:inline-block; border:1px solid #d1d5db; border-radius:9999px; padding:2px 10px; font-size:12px; margin:0 0 16px">${escapeHtml(proposal.status || 'draft')}</p>
      <p style="margin:0">${escapeHtml(proposal.recipient_name)} (${escapeHtml(proposal.recipient_email)})</p>
      ${proposal.recipient_company ? `<p style="margin:4px 0 0">Empresa: ${escapeHtml(proposal.recipient_company)}</p>` : ''}
      ${proposal.valid_until ? `<p style="margin:4px 0 0">Válida até ${format(parseISO(proposal.valid_until), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</p>` : ''}

      ${renderedTemplate ? `<div style="margin-top:20px"><h3 style="margin:0 0 8px">Modelo de proposta</h3><div>${renderedTemplate}</div></div>` : ''}

      ${proposal.description ? `<div style="margin-top:20px"><h3 style="margin:0 0 8px">Descrição</h3><div>${proposal.description}</div></div>` : ''}

      <div style="margin-top:20px">
        <h3 style="margin:0 0 8px">Itens da proposta</h3>
        <table style="width:100%; border-collapse:collapse; border:1px solid #e5e7eb">
          <thead>
            <tr>
              <th style="text-align:left; border-bottom:1px solid #e5e7eb; padding:8px">Item</th>
              <th style="text-align:right; border-bottom:1px solid #e5e7eb; padding:8px">Horas</th>
              <th style="text-align:right; border-bottom:1px solid #e5e7eb; padding:8px">Valor/Hora</th>
              <th style="text-align:right; border-bottom:1px solid #e5e7eb; padding:8px">Subtotal</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>

      <p style="margin-top:16px; text-align:right; font-weight:600">Total: ${Number(totals.totalValue).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
    </section>
  `;
};

interface SupabaseLikeError {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
}

const serializeSupabaseError = (error: unknown): SupabaseLikeError => {
  if (!error || typeof error !== 'object') return {};

  const candidate = error as Record<string, unknown>;

  return {
    code: typeof candidate.code === 'string' ? candidate.code : undefined,
    message: typeof candidate.message === 'string' ? candidate.message : undefined,
    details: typeof candidate.details === 'string' ? candidate.details : undefined,
    hint: typeof candidate.hint === 'string' ? candidate.hint : undefined,
  };
};

const isMissingShareStaticHtmlColumnError = (error: unknown): boolean => {
  const normalizedError = serializeSupabaseError(error);

  if (!normalizedError.code && !normalizedError.message && !normalizedError.details && !normalizedError.hint) {
    return false;
  }

  const message = [normalizedError.message, normalizedError.details, normalizedError.hint]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  const hasShareStaticHtmlReference = message.includes('share_static_html');
  const hasMissingColumnSignal =
    message.includes('column') ||
    message.includes('schema cache') ||
    message.includes('not found') ||
    message.includes('does not exist');

  if (normalizedError.code === '42703') {
    return hasShareStaticHtmlReference || message.length === 0;
  }

  if (normalizedError.code === 'PGRST204') {
    return hasShareStaticHtmlReference;
  }

  return hasShareStaticHtmlReference && hasMissingColumnSignal;
};

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
  const [templateEditorOpen, setTemplateEditorOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTemplateDialogOpen, setDeleteTemplateDialogOpen] = useState(false);
  const [viewCommentsDialogOpen, setViewCommentsDialogOpen] = useState(false);
  const [convertDialogOpen, setConvertDialogOpen] = useState(false);
  
  // Form states
  const [editingProposal, setEditingProposal] = useState<Proposal | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<ProposalTemplate | null>(null);
  const [proposalToDelete, setProposalToDelete] = useState<string | null>(null);
  const [previewingProposal, setPreviewingProposal] = useState<Proposal | null>(null);
  const [templateToDelete, setTemplateToDelete] = useState<string | null>(null);
  const [viewingCommentsFor, setViewingCommentsFor] = useState<Proposal | null>(null);
  const [proposalToConvert, setProposalToConvert] = useState<Proposal | null>(null);
  type ProposalComment = { id: string; author_name: string | null; content: string; created_at: string }
  const [comments, setComments] = useState<ProposalComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  
  // Proposal form
  const [formData, setFormData] = useState({
    templateId: '',
    recipientName: '',
    recipientEmail: '',
    recipientCompany: '',
    title: '',
    description: '',
    validUntil: '',
    clientId: '',
    items: [] as ProposalItem[],
  });
  const [manualServiceItems, setManualServiceItems] = useState<ServiceCatalogItem[]>([]);
  const [selectedCatalogItemId, setSelectedCatalogItemId] = useState<string>('');
  
  // Template form
  const [templateFormData, setTemplateFormData] = useState({
    name: '',
    content: '',
    sections: [] as TemplateSection[],
  });
  
  const [saving, setSaving] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  // Fetch data
  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const storedItems = localStorage.getItem(MANUAL_ITEMS_STORAGE_KEY);

    if (!storedItems) return;

    try {
      const parsedItems = JSON.parse(storedItems) as ServiceCatalogItem[];
      setManualServiceItems(Array.isArray(parsedItems) ? parsedItems : []);
    } catch (error) {
      console.error('Erro ao carregar itens manuais de serviço:', error);
    }
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
          total_hours: parseNumericValue(p.total_hours),
          total_value: parseNumericValue(p.total_value),
          items: ((p.items as unknown as ProposalItem[]) || []).map((item) => ({
            ...item,
            hours: parseNumericValue(item.hours),
            pricePerHour: parseNumericValue(item.pricePerHour),
          })),
        })));
      }
      if (templatesRes.data) {
        setTemplates(templatesRes.data.map(t => ({
          ...t,
          items: (t.items as unknown as ProposalItem[]) || [],
          sections: ((t as any).sections as TemplateSection[]) || [],
        })));
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const buildProposalLink = (shareToken: string) => `${window.location.origin}/proposal/${shareToken}`;

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
        template_id: formData.templateId || null,
        recipient_name: formData.recipientName,
        recipient_email: formData.recipientEmail,
        recipient_company: formData.recipientCompany || null,
        title: formData.title,
        description: formData.description || null,
        valid_until: formData.validUntil || null,
        items: formData.items as unknown as Json,
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
      const normalizedError = serializeSupabaseError(error);
      console.error('Error saving proposal:', {
        proposalId: editingProposal?.id ?? null,
        ...normalizedError,
      });

      const errorCodeSuffix = normalizedError.code ? ` (código: ${normalizedError.code})` : '';
      toast.error(`Erro ao salvar proposta${errorCodeSuffix}`);
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
        description: templateFormData.content || null,
        items: [],
        sections: templateFormData.sections as any,
      };

      if (editingTemplate) {
        const { error } = await supabase
          .from('proposal_templates')
          .update(templateData as any)
          .eq('id', editingTemplate.id);
        if (error) throw error;
        toast.success('Template atualizado!');
      } else {
        const { error } = await supabase
          .from('proposal_templates')
          .insert(templateData as any);
        if (error) throw error;
        toast.success('Template criado!');
      }

      setTemplateEditorOpen(false);
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
      const templateContent = proposal.template_id
        ? templates.find((template) => template.id === proposal.template_id)?.description || null
        : null;

      const shareStaticHtml = buildProposalShareStaticHtml(
        { ...proposal, status: 'sent' },
        templateContent,
      );

      const { error } = await supabase
        .from('proposals')
        .update({ status: 'sent', share_static_html: shareStaticHtml })
        .eq('id', proposal.id);

      if (isMissingShareStaticHtmlColumnError(error)) {
        // Fallback for environments where migration with share_static_html is not applied yet.
        console.warn('Proposal send fallback: share_static_html unavailable, retrying with status-only update.', {
          proposalId: proposal.id,
          ...serializeSupabaseError(error),
        });

        const { error: fallbackError } = await supabase
          .from('proposals')
          .update({ status: 'sent' })
          .eq('id', proposal.id);

        if (fallbackError) throw fallbackError;
        toast.success('Proposta enviada!');
        toast.warning('Compartilhamento estático indisponível até atualizar o banco de dados.');
        fetchData();
        return;
      }

      if (error) throw error;
      
      toast.success('Proposta enviada e página de compartilhamento liberada!');
      fetchData();
    } catch (error) {
      const normalizedError = serializeSupabaseError(error);
      console.error('Error sending proposal:', {
        proposalId: proposal.id,
        ...normalizedError,
      });

      const errorCodeSuffix = normalizedError.code ? ` (código: ${normalizedError.code})` : '';
      toast.error(`Erro ao enviar proposta${errorCodeSuffix}`);
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
  const handleApplyTemplate = (templateId: string) => {
    const template = templates.find((item) => item.id === templateId);

    setFormData((prev) => ({
      ...prev,
      templateId,
    }));

    if (template) {
      toast.success(`Template "${template.name}" vinculado à proposta.`);
    }
  };

  const serviceCatalogItems = useMemo(() => {
    const proposalItems = proposals.flatMap((proposal) =>
      proposal.items
        .filter((item) => item.service?.trim() || item.description?.trim())
        .map((item, index) => ({
          id: item.catalogItemId || item.id || `${proposal.id}-${index}`,
          service: item.service || 'Sem título',
          description: item.description || 'Sem descrição',
          hours: parseNumericValue(item.hours),
          pricePerHour: parseNumericValue(item.pricePerHour),
        })),
    );

    const manualItems = manualServiceItems.map((item, index) => ({
      id: item.id || `manual-${index}`,
      service: item.service || 'Sem título',
      description: item.description || 'Sem descrição',
      hours: parseNumericValue(item.hours),
      pricePerHour: parseNumericValue(item.pricePerHour),
    }));

    const catalogMap = new Map<string, ServiceCatalogItem>();
    [...manualItems, ...proposalItems].forEach((item) => {
      const key = `${item.service}|${item.description}|${item.hours}|${item.pricePerHour}`;
      if (!catalogMap.has(key)) {
        catalogMap.set(key, item);
      }
    });

    return Array.from(catalogMap.values());
  }, [manualServiceItems, proposals]);

  // Item management
  const addCatalogItemToProposal = () => {
    if (!selectedCatalogItemId) return;

    const selectedItem = serviceCatalogItems.find((item) => item.id === selectedCatalogItemId);
    if (!selectedItem) return;

    setFormData((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          id: crypto.randomUUID(),
          service: selectedItem.service,
          description: selectedItem.description,
          hours: selectedItem.hours,
          pricePerHour: selectedItem.pricePerHour,
          catalogItemId: selectedItem.id,
        },
      ],
    }));

    setSelectedCatalogItemId('');
  };

  const removeItem = (itemId: string) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter(i => i.id !== itemId),
    }));
  };

  // Reset forms
  const resetProposalForm = () => {
    setEditingProposal(null);
    setFormData({
      templateId: '',
      recipientName: '',
      recipientEmail: '',
      recipientCompany: '',
      title: '',
      description: '',
      validUntil: '',
      clientId: '',
      items: [],
    });
    setSelectedCatalogItemId('');
  };

  const resetTemplateForm = () => {
    setEditingTemplate(null);
    setTemplateFormData({
      name: '',
      content: '',
      sections: [],
    });
  };

  // Edit proposal
  const openEditProposal = (proposal: Proposal) => {
    setEditingProposal(proposal);
    setFormData({
      recipientName: proposal.recipient_name,
      recipientEmail: proposal.recipient_email,
      recipientCompany: proposal.recipient_company || '',
      templateId: proposal.template_id || '',
      title: proposal.title,
      description: proposal.description || '',
      validUntil: proposal.valid_until || '',
      clientId: proposal.client_id || '',
      items: proposal.items.length > 0
        ? proposal.items.map((item) => ({
            ...item,
            hours: parseNumericValue(item.hours),
            pricePerHour: parseNumericValue(item.pricePerHour),
          }))
        : [],
    });
    setSelectedCatalogItemId('');
    setProposalDialogOpen(true);
  };

  // Edit template
  const openEditTemplate = (template: ProposalTemplate) => {
    setEditingTemplate(template);
    setTemplateFormData({
      name: template.name,
      content: template.description || '',
      sections: template.sections || [],
    });
    setTemplateEditorOpen(true);
  };

  const closeTemplateEditor = () => {
    setTemplateEditorOpen(false);
    resetTemplateForm();
  };

  const getTemplatePreview = (content: string | null) => {
    if (!content) return '';
    return content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
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
    const totals = proposals.reduce(
      (acc, proposal) => {
        const proposalTotals = getProposalTotals(proposal);
        return {
          totalHours: acc.totalHours + proposalTotals.totalHours,
          totalValue: acc.totalValue + proposalTotals.totalValue,
        };
      },
      { totalHours: 0, totalValue: 0 },
    );

    return {
      total: proposals.length,
      pending: proposals.filter(p => ['draft', 'sent', 'viewed'].includes(p.status)).length,
      accepted: proposals.filter(p => p.status === 'accepted').length,
      totalHours: totals.totalHours,
      totalValue: totals.totalValue,
    };
  }, [proposals]);


  const previewTemplate = useMemo(() => {
    if (!previewingProposal?.template_id) return null;
    return templates.find((template) => template.id === previewingProposal.template_id) || null;
  }, [previewingProposal, templates]);

  const previewRenderedTemplateContent = useMemo(() => {
    if (!previewingProposal || !previewTemplate?.description) return '';
    return renderTemplateContent(previewTemplate.description, previewingProposal);
  }, [previewTemplate, previewingProposal]);

  const { totalHours: formTotalHours, totalValue: formTotalValue } = calculateTotals(formData.items);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden">
      <div className={`space-y-6 transition-transform duration-300 ease-out ${templateEditorOpen ? '-translate-x-full' : 'translate-x-0'}`}>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
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
              <Clock className="w-4 h-4" />
              <span className="text-sm">Horas Totais</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{formatHours(stats.totalHours)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <DollarSign className="w-4 h-4" />
              <span className="text-sm">Valor Total</span>
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
              {filteredProposals.map((proposal) => {
                const proposalTotals = getProposalTotals(proposal);

                return (
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
                            {formatHours(proposalTotals.totalHours)}
                          </span>
                          <span className="flex items-center gap-1">
                            <DollarSign className="w-3 h-3" />
                            {proposalTotals.totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Criada em {format(parseISO(proposal.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                        </p>
                        {proposal.status === 'draft' ? (
                          <p className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                            <LinkIcon className="w-3 h-3" />
                            A página de compartilhamento será criada após o envio.
                          </p>
                        ) : (
                          <a
                            href={buildProposalLink(proposal.share_token)}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                          >
                            <LinkIcon className="w-3 h-3" />
                            {buildProposalLink(proposal.share_token)}
                          </a>
                        )}
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
                            <DropdownMenuItem onClick={() => {
                              if (proposal.status === 'draft') {
                                setPreviewingProposal(proposal);
                                return;
                              }

                              window.open(`/proposal/${proposal.share_token}`, '_blank');
                            }}>
                              <Eye className="w-4 h-4 mr-2" />
                              {proposal.status === 'draft' ? 'Visualizar interno' : 'Visualizar compartilhamento'}
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
              )})}
            </div>
          )}
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => { resetTemplateForm(); setTemplateEditorOpen(true); }}>
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
                      <CardDescription>{getTemplatePreview(template.description).slice(0, 120) || 'Template com conteúdo avançado'}</CardDescription>
                    )}
                  </CardHeader>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      </div>

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
              <Label>Descrição da Proposta (WYSIWYG)</Label>
              <WysiwygEditor
                value={formData.description}
                onChange={(value) => setFormData((prev) => ({ ...prev, description: value }))}
                placeholder="Escreva a descrição própria desta proposta..."
                minHeight="180px"
              />
            </div>

            {/* Apply template */}
            {templates.length > 0 && (
              <div className="space-y-2">
                <Label>Aplicar Template</Label>
                <Select value={formData.templateId || 'none'} onValueChange={(id) => {
                  if (id === 'none') {
                    setFormData((prev) => ({ ...prev, templateId: '' }));
                    return;
                  }

                  handleApplyTemplate(id);
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um template..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
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
              </div>

              <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                <Select value={selectedCatalogItemId} onValueChange={setSelectedCatalogItemId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um item da lista de serviços" />
                  </SelectTrigger>
                  <SelectContent>
                    {serviceCatalogItems.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.service} — {item.pricePerHour.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}/h
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  onClick={addCatalogItemToProposal}
                  disabled={!selectedCatalogItemId || serviceCatalogItems.length === 0}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Adicionar item
                </Button>
              </div>

              {serviceCatalogItems.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Nenhum item de serviço disponível. Cadastre itens na página de serviços para selecioná-los aqui.
                </p>
              )}

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
                        <p className="text-sm rounded-md border px-3 py-2 bg-muted/30">{item.service}</p>
                      </div>
                      <div className="space-y-2">
                        <Label>Descrição</Label>
                        <p className="text-sm rounded-md border px-3 py-2 bg-muted/30">{item.description}</p>
                      </div>
                      <div className="space-y-2">
                        <Label>Horas</Label>
                        <p className="text-sm rounded-md border px-3 py-2 bg-muted/30">{item.hours}</p>
                      </div>
                      <div className="space-y-2">
                        <Label>Preço/Hora (R$)</Label>
                        <p className="text-sm rounded-md border px-3 py-2 bg-muted/30">
                          {item.pricePerHour.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </p>
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

      <Dialog open={!!previewingProposal} onOpenChange={(open) => !open && setPreviewingProposal(null)}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto dialog-scrollbar-hide">
          <DialogHeader>
            <DialogTitle>Visualização completa da proposta</DialogTitle>
            <DialogDescription>
              Esta visualização é interna. O compartilhamento externo é liberado somente após o envio.
            </DialogDescription>
          </DialogHeader>

          {previewingProposal && (
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold">{previewingProposal.title}</h3>
                  <Badge variant="outline">Rascunho</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {previewingProposal.recipient_name} ({previewingProposal.recipient_email})
                </p>
                {previewingProposal.recipient_company && (
                  <p className="text-sm text-muted-foreground">Empresa: {previewingProposal.recipient_company}</p>
                )}
                {previewingProposal.valid_until && (
                  <p className="text-sm text-muted-foreground">
                    Válida até {format(parseISO(previewingProposal.valid_until), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </p>
                )}
              </div>

              {previewTemplate && (
                <div className="space-y-2">
                  <h4 className="font-medium">Modelo de proposta</h4>
                  <p className="text-sm text-muted-foreground">Template vinculado: {previewTemplate.name}</p>
                  {previewRenderedTemplateContent ? (
                    <div
                      className="text-sm text-muted-foreground rounded-md border bg-muted/20 p-3 prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: previewRenderedTemplateContent }}
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground">O modelo vinculado não possui conteúdo.</p>
                  )}
                </div>
              )}

              {previewingProposal.description && (
                <div className="space-y-2">
                  <h4 className="font-medium">Descrição</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{previewingProposal.description}</p>
                </div>
              )}

              <div className="space-y-2">
                <h4 className="font-medium">Itens da proposta</h4>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead className="w-28 text-right">Horas</TableHead>
                        <TableHead className="w-40 text-right">Valor/Hora</TableHead>
                        <TableHead className="w-40 text-right">Subtotal</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {previewingProposal.items.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>{item.service}</TableCell>
                          <TableCell className="text-right">{formatHours(item.hours)}</TableCell>
                          <TableCell className="text-right">
                            {item.pricePerHour.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {(item.hours * item.pricePerHour).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <div className="flex justify-end text-sm font-medium">
                Total: {getProposalTotals(previewingProposal).totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Template Dialog */}
      <div className="fixed inset-0 z-50 pointer-events-none" aria-hidden={!templateEditorOpen}>
        <div
          className={`h-full w-full bg-background transition-transform duration-300 ease-out pointer-events-auto ${templateEditorOpen ? 'translate-x-0' : 'translate-x-full'}`}
        >
          <div className="h-full flex flex-col">
            <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
              <div className="max-w-5xl mx-auto px-4 py-3 sm:px-6">
                <div className="flex items-center">
                  <Button variant="ghost" onClick={closeTemplateEditor}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Voltar
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              <div className="max-w-5xl mx-auto px-4 py-6 sm:px-6 space-y-5">
                <div className="space-y-2">
                  <Label>Nome do Template *</Label>
                  <Input
                    value={templateFormData.name}
                    onChange={(e) => setTemplateFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Ex: Proposta de Desenvolvimento Mensal"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Seções do Template</Label>
                  <TemplateSectionEditor
                    sections={templateFormData.sections}
                    onChange={(sections) => setTemplateFormData(prev => ({ ...prev, sections }))}
                  />
                </div>

                <div className="flex justify-start">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="gap-2">
                        <Info className="w-4 h-4" />
                        Consultar campos dinâmicos
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80" align="start">
                      <div className="space-y-2 text-sm">
                        <p className="font-medium">Campos disponíveis</p>
                        <ul className="space-y-1 text-muted-foreground">
                          <li><code>{'{{nome_cliente}}'}</code> - Nome do cliente</li>
                          <li><code>{'{{email_cliente}}'}</code> - Email do cliente</li>
                          <li><code>{'{{empresa_cliente}}'}</code> - Empresa do cliente</li>
                          <li><code>{'{{data_envio}}'}</code> - Data de envio</li>
                          <li><code>{'{{valor_total}}'}</code> - Valor total da proposta</li>
                          <li><code>{'{{descricao_proposta}}'}</code> - Texto preenchido no campo descrição da proposta</li>
                          <li><code>{'{{listagem_servicos}}'}</code> - Lista dos serviços selecionados na criação da proposta</li>
                        </ul>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="flex justify-end pt-2">
                  <Button onClick={handleSaveTemplate} disabled={saving}>
                    {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    {editingTemplate ? 'Salvar' : 'Criar Template'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

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
