import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { WysiwygEditor } from '@/components/ui/wysiwyg-editor';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Info } from 'lucide-react';

interface EmailTemplate {
  id: string;
  slug: string;
  subject: string;
  body_html: string;
}

const TEMPLATE_META: Record<string, { label: string; fields: { key: string; desc: string }[] }> = {
  proposal_sent: {
    label: 'Envio de Proposta',
    fields: [
      { key: '{{nome_cliente}}', desc: 'Nome do destinatário' },
      { key: '{{email_cliente}}', desc: 'Email do destinatário' },
      { key: '{{titulo_proposta}}', desc: 'Título da proposta' },
      { key: '{{link_proposta}}', desc: 'Link público da proposta' },
    ],
  },
  contract_sent: {
    label: 'Envio de Contrato',
    fields: [
      { key: '{{nome_cliente}}', desc: 'Nome do contratado' },
      { key: '{{titulo_contrato}}', desc: 'Título do contrato' },
      { key: '{{link_contrato}}', desc: 'Link público do contrato' },
    ],
  },
  monthly_report_sent: {
    label: 'Envio de Relatório Mensal',
    fields: [
      { key: '{{nome_cliente}}', desc: 'Nome do cliente' },
      { key: '{{periodo_relatorio}}', desc: 'Período de referência do relatório' },
      { key: '{{link_relatorio}}', desc: 'Link para visualizar o relatório' },
      { key: '{{horas_totais}}', desc: 'Total de horas registradas no período' },
    ],
  },
};

export const NotificationTemplatesTab: React.FC = () => {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [editedTemplates, setEditedTemplates] = useState<Record<string, Partial<EmailTemplate>>>({});

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('email_templates' as any)
        .select('*')
        .order('slug');

      if (error) throw error;
      setTemplates((data as any) || []);
    } catch (err) {
      console.error('Error fetching email templates:', err);
      toast.error('Erro ao carregar templates de email');
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (id: string, field: string, value: string) => {
    setEditedTemplates((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }));
  };

  const handleSave = async (template: EmailTemplate) => {
    const edits = editedTemplates[template.id];
    if (!edits) return;

    setSavingId(template.id);
    try {
      const { error } = await supabase
        .from('email_templates' as any)
        .update({
          subject: edits.subject ?? template.subject,
          body_html: edits.body_html ?? template.body_html,
        } as any)
        .eq('id', template.id);

      if (error) throw error;

      toast.success('Template salvo!');
      setEditedTemplates((prev) => {
        const copy = { ...prev };
        delete copy[template.id];
        return copy;
      });
      fetchTemplates();
    } catch (err) {
      console.error('Error saving email template:', err);
      toast.error('Erro ao salvar template');
    } finally {
      setSavingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Templates de Notificação por Email</h3>
        <p className="text-sm text-muted-foreground">
          Configure o conteúdo dos emails enviados automaticamente pela plataforma.
        </p>
      </div>

      {templates.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <Accordion type="single" collapsible className="w-full">
              {templates.map((template) => {
                const meta = TEMPLATE_META[template.slug];
                const edits = editedTemplates[template.id] || {};
                const hasChanges = Object.keys(edits).length > 0;

                return (
                  <AccordionItem key={template.id} value={template.id} className="px-4">
                    <div className="flex items-center justify-between gap-4 py-1">
                      <AccordionTrigger className="py-3 hover:no-underline">
                        <div className="text-left">
                          <p className="text-base font-medium">{meta?.label || template.slug}</p>
                          <p className="text-xs text-muted-foreground">Slug: {template.slug}</p>
                        </div>
                      </AccordionTrigger>

                      {meta && (
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 shrink-0"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Info className="w-4 h-4 mr-1" />
                              Campos
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-72" align="end">
                            <div className="space-y-1 text-sm">
                              <p className="font-medium mb-2">Campos dinâmicos</p>
                              {meta.fields.map((f) => (
                                <div key={f.key} className="flex gap-2">
                                  <code className="text-xs bg-muted px-1 rounded">{f.key}</code>
                                  <span className="text-muted-foreground text-xs">{f.desc}</span>
                                </div>
                              ))}
                            </div>
                          </PopoverContent>
                        </Popover>
                      )}
                    </div>

                    <AccordionContent>
                      <div className="space-y-4 pb-4">
                        <div className="space-y-2">
                          <Label>Assunto</Label>
                          <Input
                            value={edits.subject ?? template.subject}
                            onChange={(e) => handleFieldChange(template.id, 'subject', e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Corpo do Email</Label>
                          <WysiwygEditor
                            value={edits.body_html ?? template.body_html}
                            onChange={(val) => handleFieldChange(template.id, 'body_html', val)}
                            minHeight="160px"
                          />
                        </div>
                        <div className="flex justify-end">
                          <Button
                            onClick={() => handleSave(template)}
                            disabled={!hasChanges || savingId === template.id}
                            size="sm"
                          >
                            {savingId === template.id ? (
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                              <Save className="w-4 h-4 mr-2" />
                            )}
                            Salvar
                          </Button>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          </CardContent>
        </Card>
      )}

      {templates.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Nenhum template de email configurado.
          </CardContent>
        </Card>
      )}
    </div>
  );
};
