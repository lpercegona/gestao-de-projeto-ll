import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface CustomMetric {
  id?: string;
  label: string;
  entity_type: string;
  category_source: string;
  category_field_id: string | null;
  category_value: string;
  display_type: string;
  sort_order: number;
  block_title: string;
}

interface ProjectColumn {
  id: string;
  name: string;
  type: string;
  options: string[] | null;
}

interface KanbanStage {
  id: string;
  name: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  ownerId: string;
  projectColumns: ProjectColumn[];
  kanbanStages: KanbanStage[];
  onMetricsChange?: () => void;
}

const PROJECT_STATUSES = [
  { value: 'active', label: 'Ativo' },
  { value: 'completed', label: 'Concluído' },
  { value: 'paused', label: 'Pausado' },
  { value: 'cancelled', label: 'Cancelado' },
];

const TASK_STATUSES = [
  { value: 'pending', label: 'Pendente' },
  { value: 'in_progress', label: 'Em andamento' },
  { value: 'completed', label: 'Concluída' },
  { value: 'cancelled', label: 'Cancelada' },
];

export const CustomMetricsConfigDialog: React.FC<Props> = ({
  open,
  onOpenChange,
  clientId,
  ownerId,
  projectColumns,
  kanbanStages,
  onMetricsChange,
}) => {
  const [metrics, setMetrics] = useState<CustomMetric[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) fetchMetrics();
  }, [open, clientId]);

  const fetchMetrics = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('report_custom_metrics')
      .select('*')
      .eq('client_id', clientId)
      .order('sort_order');

    if (!error && data) {
      setMetrics(data.map(m => ({
        id: m.id,
        label: m.label,
        entity_type: m.entity_type,
        category_source: m.category_source,
        category_field_id: m.category_field_id,
        category_value: m.category_value,
        display_type: m.display_type,
        sort_order: m.sort_order,
        block_title: (m as any).block_title || '',
      })));
    }
    setLoading(false);
  };

  const addMetric = () => {
    setMetrics(prev => [...prev, {
      label: '',
      entity_type: 'projects',
      category_source: 'status',
      category_field_id: null,
      category_value: '',
      display_type: 'count',
      sort_order: prev.length,
      block_title: prev.length > 0 ? prev[prev.length - 1].block_title : '',
    }]);
  };

  const removeMetric = (index: number) => {
    setMetrics(prev => prev.filter((_, i) => i !== index));
  };

  const updateMetric = (index: number, field: keyof CustomMetric, value: string | null) => {
    setMetrics(prev => prev.map((m, i) => {
      if (i !== index) return m;
      const updated = { ...m, [field]: value };
      // Reset dependent fields when source changes
      if (field === 'category_source') {
        updated.category_value = '';
        updated.category_field_id = null;
      }
      if (field === 'entity_type') {
        updated.category_value = '';
      }
      return updated;
    }));
  };

  const getCategoryOptions = (metric: CustomMetric) => {
    if (metric.category_source === 'status') {
      return metric.entity_type === 'projects' ? PROJECT_STATUSES : TASK_STATUSES;
    }
    if (metric.category_source === 'kanban_stage') {
      return kanbanStages.map(s => ({ value: s.name, label: s.name }));
    }
    if (metric.category_source === 'custom_field' && metric.category_field_id) {
      const col = projectColumns.find(c => c.id === metric.category_field_id);
      return (col?.options || []).map(o => ({ value: o, label: o }));
    }
    return [];
  };

  const selectColumns = projectColumns.filter(c => c.type === 'select' && c.options?.length);

  const handleSave = async () => {
    const invalid = metrics.some(m => !m.label || !m.category_value);
    if (invalid) {
      toast.error('Preencha todos os campos de cada métrica.');
      return;
    }

    setSaving(true);
    try {
      // Delete existing
      await supabase.from('report_custom_metrics').delete().eq('client_id', clientId);

      if (metrics.length > 0) {
        const rows = metrics.map((m, i) => ({
          client_id: clientId,
          owner_id: ownerId,
          label: m.label,
          entity_type: m.entity_type,
          category_source: m.category_source,
          category_field_id: m.category_source === 'custom_field' ? m.category_field_id : null,
          category_value: m.category_value,
          display_type: m.display_type,
          sort_order: i,
          block_title: m.block_title || '',
        }));

        const { error } = await supabase.from('report_custom_metrics').insert(rows);
        if (error) throw error;
      }

      toast.success('Métricas personalizadas salvas.');
      onMetricsChange?.();
      onOpenChange(false);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao salvar métricas.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Métricas Personalizadas</DialogTitle>
          <DialogDescription>Configure indicadores personalizados que aparecerão nos relatórios deste cliente.</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            {metrics.map((metric, index) => (
              <div key={index} className="rounded-lg border border-border p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">Métrica {index + 1}</span>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeMetric(index)}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <Label className="text-xs">Título do bloco</Label>
                    <Input
                      value={metric.block_title}
                      onChange={e => updateMetric(index, 'block_title', e.target.value)}
                      placeholder="Ex: Indicadores de desempenho"
                      className="h-8 text-sm"
                    />
                  </div>

                  <div>
                    <Label className="text-xs">Label</Label>
                    <Input
                      value={metric.label}
                      onChange={e => updateMetric(index, 'label', e.target.value)}
                      placeholder="Ex: Projetos ativos"
                      className="h-8 text-sm"
                    />
                  </div>

                  <div>
                    <Label className="text-xs">Tipo de exibição</Label>
                    <Select value={metric.display_type} onValueChange={v => updateMetric(index, 'display_type', v)}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="count">Contagem</SelectItem>
                        <SelectItem value="percentage">Porcentagem</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs">Entidade</Label>
                    <Select value={metric.entity_type} onValueChange={v => updateMetric(index, 'entity_type', v)}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="projects">Projetos</SelectItem>
                        <SelectItem value="tasks">Tarefas</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs">Fonte da categoria</Label>
                    <Select value={metric.category_source} onValueChange={v => updateMetric(index, 'category_source', v)}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="status">Status</SelectItem>
                        {selectColumns.length > 0 && <SelectItem value="custom_field">Campo personalizado</SelectItem>}
                        {kanbanStages.length > 0 && <SelectItem value="kanban_stage">Estágio Kanban</SelectItem>}
                      </SelectContent>
                    </Select>
                  </div>

                  {metric.category_source === 'custom_field' && (
                    <div>
                      <Label className="text-xs">Campo</Label>
                      <Select value={metric.category_field_id || ''} onValueChange={v => updateMetric(index, 'category_field_id', v)}>
                        <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Selecionar campo" /></SelectTrigger>
                        <SelectContent>
                          {selectColumns.map(col => (
                            <SelectItem key={col.id} value={col.id}>{col.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div>
                    <Label className="text-xs">Valor da categoria</Label>
                    <Select value={metric.category_value} onValueChange={v => updateMetric(index, 'category_value', v)}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Selecionar valor" /></SelectTrigger>
                      <SelectContent>
                        {getCategoryOptions(metric).map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            ))}

            <Button variant="outline" size="sm" onClick={addMetric} className="w-full">
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Adicionar métrica
            </Button>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button size="sm" onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                Salvar
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
