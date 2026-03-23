import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Plus, Trash2, Loader2, GripVertical } from 'lucide-react';
import { toast } from 'sonner';

export interface CustomMetric {
  id?: string;
  client_id: string;
  label: string;
  entity_type: 'projects' | 'tasks';
  category_source: 'status' | 'custom_field' | 'kanban_stage';
  category_field_id: string | null;
  category_value: string;
  display_type: 'count' | 'percentage';
  sort_order: number;
  owner_id: string;
}

interface ProjectColumn {
  id: string;
  name: string;
  type: string;
  options?: string[] | null;
}

interface KanbanStage {
  id: string;
  name: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  projectColumns: ProjectColumn[];
  kanbanStages: KanbanStage[];
  onMetricsChange: () => void;
}

const PROJECT_STATUSES = ['active', 'completed', 'paused', 'cancelled'];
const TASK_STATUSES = ['pending', 'in_progress', 'completed', 'cancelled'];

const STATUS_LABELS: Record<string, string> = {
  active: 'Ativo',
  completed: 'Concluído',
  paused: 'Pausado',
  cancelled: 'Cancelado',
  pending: 'Pendente',
  in_progress: 'Em andamento',
};

export const CustomMetricsConfigDialog: React.FC<Props> = ({
  open, onOpenChange, clientId, projectColumns, kanbanStages, onMetricsChange,
}) => {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<CustomMetric[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !clientId) return;
    const fetchMetrics = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('report_custom_metrics')
        .select('*')
        .eq('client_id', clientId)
        .order('sort_order', { ascending: true });
      setMetrics((data || []).map((m: any) => ({
        id: m.id,
        client_id: m.client_id,
        label: m.label,
        entity_type: m.entity_type as 'projects' | 'tasks',
        category_source: m.category_source as 'status' | 'custom_field' | 'kanban_stage',
        category_field_id: m.category_field_id,
        category_value: m.category_value,
        display_type: m.display_type as 'count' | 'percentage',
        sort_order: m.sort_order,
        owner_id: m.owner_id,
      })));
      setLoading(false);
    };
    fetchMetrics();
  }, [open, clientId]);

  const addMetric = () => {
    if (!user) return;
    setMetrics(prev => [...prev, {
      client_id: clientId,
      label: '',
      entity_type: 'projects',
      category_source: 'status',
      category_field_id: null,
      category_value: '',
      display_type: 'count',
      sort_order: prev.length,
      owner_id: user.id,
    }]);
  };

  const removeMetric = (index: number) => {
    setMetrics(prev => prev.filter((_, i) => i !== index));
  };

  const updateMetric = (index: number, updates: Partial<CustomMetric>) => {
    setMetrics(prev => prev.map((m, i) => {
      if (i !== index) return m;
      const updated = { ...m, ...updates };
      // Reset dependent fields when source changes
      if (updates.category_source) {
        updated.category_field_id = null;
        updated.category_value = '';
      }
      if (updates.entity_type) {
        updated.category_value = '';
      }
      if (updates.category_field_id !== undefined) {
        updated.category_value = '';
      }
      return updated;
    }));
  };

  const getCategoryValueOptions = (metric: CustomMetric): { value: string; label: string }[] => {
    if (metric.category_source === 'status') {
      const statuses = metric.entity_type === 'projects' ? PROJECT_STATUSES : TASK_STATUSES;
      return statuses.map(s => ({ value: s, label: STATUS_LABELS[s] || s }));
    }
    if (metric.category_source === 'custom_field') {
      if (!metric.category_field_id) return [];
      const col = projectColumns.find(c => c.id === metric.category_field_id);
      if (!col?.options) return [];
      return col.options.map(o => ({ value: o, label: o }));
    }
    if (metric.category_source === 'kanban_stage') {
      return kanbanStages.map(s => ({ value: s.name, label: s.name }));
    }
    return [];
  };

  const getSelectFieldOptions = () => {
    return projectColumns.filter(c => c.type === 'select' && c.options && c.options.length > 0);
  };

  const handleSave = async () => {
    if (!user) return;

    // Validate
    const invalid = metrics.some(m => !m.label.trim() || !m.category_value);
    if (invalid) {
      toast.error('Preencha todos os campos de cada métrica.');
      return;
    }

    setSaving(true);
    try {
      // Delete existing
      await supabase
        .from('report_custom_metrics')
        .delete()
        .eq('client_id', clientId);

      // Insert new
      if (metrics.length > 0) {
        const rows = metrics.map((m, i) => ({
          client_id: clientId,
          label: m.label.trim(),
          entity_type: m.entity_type,
          category_source: m.category_source,
          category_field_id: m.category_field_id,
          category_value: m.category_value,
          display_type: m.display_type,
          sort_order: i,
          owner_id: user.id,
        }));

        const { error } = await supabase
          .from('report_custom_metrics')
          .insert(rows);

        if (error) throw error;
      }

      toast.success('Métricas salvas com sucesso!');
      onMetricsChange();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving metrics:', error);
      toast.error('Erro ao salvar métricas.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Métricas Personalizadas</DialogTitle>
          <DialogDescription>
            Configure métricas que serão exibidas nos relatórios deste cliente.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            {metrics.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhuma métrica configurada. Adicione uma métrica abaixo.
              </p>
            )}

            {metrics.map((metric, index) => (
              <div key={index} className="border border-border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <GripVertical className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-muted-foreground">Métrica {index + 1}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => removeMetric(index)}
                  >
                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                  </Button>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Nome da métrica</Label>
                    <Input
                      value={metric.label}
                      onChange={(e) => updateMetric(index, { label: e.target.value })}
                      placeholder="Ex: Projetos ativos"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Exibição</Label>
                    <Select
                      value={metric.display_type}
                      onValueChange={(v) => updateMetric(index, { display_type: v as 'count' | 'percentage' })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="count">Contagem</SelectItem>
                        <SelectItem value="percentage">Porcentagem</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Entidade</Label>
                    <Select
                      value={metric.entity_type}
                      onValueChange={(v) => updateMetric(index, { entity_type: v as 'projects' | 'tasks' })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="projects">Projetos</SelectItem>
                        <SelectItem value="tasks">Tarefas</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Fonte da categoria</Label>
                    <Select
                      value={metric.category_source}
                      onValueChange={(v) => updateMetric(index, { category_source: v as 'status' | 'custom_field' | 'kanban_stage' })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="status">Status</SelectItem>
                        {getSelectFieldOptions().length > 0 && (
                          <SelectItem value="custom_field">Campo personalizado</SelectItem>
                        )}
                        {kanbanStages.length > 0 && (
                          <SelectItem value="kanban_stage">Estágio Kanban</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  {metric.category_source === 'custom_field' && (
                    <div className="space-y-1.5">
                      <Label className="text-xs">Campo</Label>
                      <Select
                        value={metric.category_field_id || ''}
                        onValueChange={(v) => updateMetric(index, { category_field_id: v })}
                      >
                        <SelectTrigger><SelectValue placeholder="Selecione o campo" /></SelectTrigger>
                        <SelectContent>
                          {getSelectFieldOptions().map(col => (
                            <SelectItem key={col.id} value={col.id}>{col.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <Label className="text-xs">Valor da categoria</Label>
                    <Select
                      value={metric.category_value}
                      onValueChange={(v) => updateMetric(index, { category_value: v })}
                    >
                      <SelectTrigger><SelectValue placeholder="Selecione o valor" /></SelectTrigger>
                      <SelectContent>
                        {getCategoryValueOptions(metric).map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            ))}

            <Button variant="outline" className="w-full" onClick={addMetric}>
              <Plus className="w-4 h-4 mr-2" />
              Adicionar métrica
            </Button>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Salvar
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
