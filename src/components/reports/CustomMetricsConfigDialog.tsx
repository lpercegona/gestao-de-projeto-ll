import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { FormSheet } from '@/components/ui/form-sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Loader2, LayoutGrid } from 'lucide-react';
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

interface Block {
  title: string;
  metrics: CustomMetric[];
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

const createEmptyMetric = (blockTitle: string, sortOrder: number): CustomMetric => ({
  label: '',
  entity_type: 'projects',
  category_source: 'status',
  category_field_id: null,
  category_value: '',
  display_type: 'count',
  sort_order: sortOrder,
  block_title: blockTitle,
});

export const CustomMetricsConfigDialog: React.FC<Props> = ({
  open,
  onOpenChange,
  clientId,
  ownerId,
  projectColumns,
  kanbanStages,
  onMetricsChange,
}) => {
  const [blocks, setBlocks] = useState<Block[]>([]);
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
      const metricsData: CustomMetric[] = data.map(m => ({
        id: m.id,
        label: m.label,
        entity_type: m.entity_type,
        category_source: m.category_source,
        category_field_id: m.category_field_id,
        category_value: m.category_value,
        display_type: m.display_type,
        sort_order: m.sort_order,
        block_title: (m as any).block_title || '',
      }));

      // Group into blocks preserving order
      const blockMap = new Map<string, CustomMetric[]>();
      const blockOrder: string[] = [];
      metricsData.forEach(m => {
        const key = m.block_title;
        if (!blockMap.has(key)) {
          blockMap.set(key, []);
          blockOrder.push(key);
        }
        blockMap.get(key)!.push(m);
      });

      setBlocks(blockOrder.map(title => ({ title, metrics: blockMap.get(title)! })));
    } else {
      setBlocks([]);
    }
    setLoading(false);
  };

  const addBlock = () => {
    const newTitle = `Bloco ${blocks.length + 1}`;
    setBlocks(prev => [...prev, { title: newTitle, metrics: [createEmptyMetric(newTitle, 0)] }]);
  };

  const removeBlock = (blockIndex: number) => {
    setBlocks(prev => prev.filter((_, i) => i !== blockIndex));
  };

  const updateBlockTitle = (blockIndex: number, newTitle: string) => {
    setBlocks(prev => prev.map((b, i) => {
      if (i !== blockIndex) return b;
      return { title: newTitle, metrics: b.metrics.map(m => ({ ...m, block_title: newTitle })) };
    }));
  };

  const addMetricToBlock = (blockIndex: number) => {
    setBlocks(prev => prev.map((b, i) => {
      if (i !== blockIndex) return b;
      return { ...b, metrics: [...b.metrics, createEmptyMetric(b.title, b.metrics.length)] };
    }));
  };

  const removeMetric = (blockIndex: number, metricIndex: number) => {
    setBlocks(prev => prev.map((b, i) => {
      if (i !== blockIndex) return b;
      const newMetrics = b.metrics.filter((_, mi) => mi !== metricIndex);
      return { ...b, metrics: newMetrics };
    }).filter(b => b.metrics.length > 0));
  };

  const updateMetric = (blockIndex: number, metricIndex: number, field: keyof CustomMetric, value: string | null) => {
    setBlocks(prev => prev.map((b, i) => {
      if (i !== blockIndex) return b;
      const newMetrics = b.metrics.map((m, mi) => {
        if (mi !== metricIndex) return m;
        const updated = { ...m, [field]: value };
        if (field === 'category_source') {
          updated.category_value = '';
          updated.category_field_id = null;
        }
        if (field === 'entity_type') {
          updated.category_value = '';
        }
        return updated;
      });
      return { ...b, metrics: newMetrics };
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
    const allMetrics = blocks.flatMap(b => b.metrics);
    const invalid = allMetrics.some(m => !m.label || !m.category_value);
    if (invalid) {
      toast.error('Preencha todos os campos de cada métrica.');
      return;
    }

    setSaving(true);
    try {
      await supabase.from('report_custom_metrics').delete().eq('client_id', clientId);

      if (allMetrics.length > 0) {
        let sortCounter = 0;
        const rows = blocks.flatMap(b =>
          b.metrics.map(m => ({
            client_id: clientId,
            owner_id: ownerId,
            label: m.label,
            entity_type: m.entity_type,
            category_source: m.category_source,
            category_field_id: m.category_source === 'custom_field' ? m.category_field_id : null,
            category_value: m.category_value,
            display_type: m.display_type,
            sort_order: sortCounter++,
            block_title: b.title,
          }))
        );

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
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Métricas Personalizadas"
      description="Crie blocos com indicadores personalizados para os relatórios deste cliente."
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
            Salvar
          </Button>
        </>
      }
    >
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            {blocks.map((block, blockIndex) => (
              <div key={blockIndex} className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
                {/* Block header */}
                <div className="flex items-center gap-2">
                  <LayoutGrid className="h-4 w-4 text-muted-foreground shrink-0" />
                  <Input
                    value={block.title}
                    onChange={e => updateBlockTitle(blockIndex, e.target.value)}
                    placeholder="Título do bloco"
                    className="h-8 text-sm font-semibold flex-1"
                  />
                  <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => removeBlock(blockIndex)}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>

                {/* Metrics inside block */}
                {block.metrics.map((metric, metricIndex) => (
                  <MetricRow
                    key={metricIndex}
                    metric={metric}
                    index={metricIndex}
                    selectColumns={selectColumns}
                    kanbanStages={kanbanStages}
                    getCategoryOptions={getCategoryOptions}
                    onUpdate={(field, value) => updateMetric(blockIndex, metricIndex, field, value)}
                    onRemove={() => removeMetric(blockIndex, metricIndex)}
                  />
                ))}

                <Button variant="outline" size="sm" onClick={() => addMetricToBlock(blockIndex)} className="w-full text-xs">
                  <Plus className="mr-1 h-3 w-3" />
                  Adicionar métrica ao bloco
                </Button>
              </div>
            ))}

            <Button variant="outline" size="sm" onClick={addBlock} className="w-full">
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Adicionar bloco
            </Button>

          </div>
        )}
    </FormSheet>
  );
};

/* ---- Metric Row sub-component ---- */

interface MetricRowProps {
  metric: CustomMetric;
  index: number;
  selectColumns: { id: string; name: string; type: string; options: string[] | null }[];
  kanbanStages: { id: string; name: string }[];
  getCategoryOptions: (m: CustomMetric) => { value: string; label: string }[];
  onUpdate: (field: keyof CustomMetric, value: string | null) => void;
  onRemove: () => void;
}

const MetricRow: React.FC<MetricRowProps> = ({ metric, index, selectColumns, kanbanStages, getCategoryOptions, onUpdate, onRemove }) => (
  <div className="rounded-md border border-border bg-background p-3 space-y-2">
    <div className="flex items-center justify-between">
      <span className="text-xs font-medium text-muted-foreground">Métrica {index + 1}</span>
      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onRemove}>
        <Trash2 className="h-3 w-3 text-destructive" />
      </Button>
    </div>

    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      <div>
        <Label className="text-xs">Label</Label>
        <Input value={metric.label} onChange={e => onUpdate('label', e.target.value)} placeholder="Ex: Projetos ativos" className="h-8 text-sm" />
      </div>

      <div>
        <Label className="text-xs">Tipo de exibição</Label>
        <Select value={metric.display_type} onValueChange={v => onUpdate('display_type', v)}>
          <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="count">Contagem</SelectItem>
            <SelectItem value="percentage">Porcentagem</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="text-xs">Entidade</Label>
        <Select value={metric.entity_type} onValueChange={v => onUpdate('entity_type', v)}>
          <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="projects">Projetos</SelectItem>
            <SelectItem value="tasks">Tarefas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="text-xs">Fonte da categoria</Label>
        <Select value={metric.category_source} onValueChange={v => onUpdate('category_source', v)}>
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
          <Select value={metric.category_field_id || ''} onValueChange={v => onUpdate('category_field_id', v)}>
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
        <Select value={metric.category_value} onValueChange={v => onUpdate('category_value', v)}>
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
);
