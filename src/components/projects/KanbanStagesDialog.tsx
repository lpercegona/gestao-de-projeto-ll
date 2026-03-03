import React, { useState, useEffect } from 'react';
import { useEditingLock } from '@/hooks/useEditingLock';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, GripVertical, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface KanbanStage {
  id: string;
  name: string;
  order_position: number;
  color: string;
  is_default: boolean;
}

interface KanbanStagesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stages: KanbanStage[];
  onSave: (stages: Omit<KanbanStage, 'id' | 'is_default'>[]) => Promise<void>;
}

const COLORS = [
  { value: 'bg-yellow-100', label: 'Amarelo' },
  { value: 'bg-blue-100', label: 'Azul' },
  { value: 'bg-green-100', label: 'Verde' },
  { value: 'bg-red-100', label: 'Vermelho' },
  { value: 'bg-purple-100', label: 'Roxo' },
  { value: 'bg-pink-100', label: 'Rosa' },
  { value: 'bg-orange-100', label: 'Laranja' },
  { value: 'bg-muted', label: 'Cinza' },
];

export const KanbanStagesDialog: React.FC<KanbanStagesDialogProps> = ({
  open,
  onOpenChange,
  stages,
  onSave,
}) => {
  const [localStages, setLocalStages] = useState<Omit<KanbanStage, 'id' | 'is_default'>[]>([]);
  const [saving, setSaving] = useState(false);
  useEditingLock(open);

  useEffect(() => {
    if (open) {
      if (stages.length > 0) {
        setLocalStages(stages.map(s => ({
          name: s.name,
          order_position: s.order_position,
          color: s.color,
        })));
      } else {
        setLocalStages([
          { name: 'Pendente', order_position: 0, color: 'bg-yellow-100' },
          { name: 'Em Andamento', order_position: 1, color: 'bg-blue-100' },
          { name: 'Concluída', order_position: 2, color: 'bg-green-100' },
        ]);
      }
    }
  }, [open, stages]);

  const addStage = () => {
    setLocalStages([
      ...localStages,
      { name: '', order_position: localStages.length, color: 'bg-muted' },
    ]);
  };

  const removeStage = (index: number) => {
    if (localStages.length <= 1) {
      toast.error('É necessário ter pelo menos uma etapa.');
      return;
    }
    const updated = localStages.filter((_, i) => i !== index);
    // Reorder positions
    updated.forEach((stage, i) => {
      stage.order_position = i;
    });
    setLocalStages(updated);
  };

  const updateStage = (index: number, field: 'name' | 'color', value: string) => {
    const updated = [...localStages];
    updated[index] = { ...updated[index], [field]: value };
    setLocalStages(updated);
  };

  const moveStage = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= localStages.length) return;

    const updated = [...localStages];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    updated.forEach((stage, i) => {
      stage.order_position = i;
    });
    setLocalStages(updated);
  };

  const handleSave = async () => {
    const hasEmptyNames = localStages.some(s => !s.name.trim());
    if (hasEmptyNames) {
      toast.error('Todas as etapas precisam ter um nome.');
      return;
    }

    setSaving(true);
    try {
      await onSave(localStages);
      toast.success('Etapas salvas com sucesso!');
      onOpenChange(false);
    } catch (error) {
      toast.error('Erro ao salvar etapas.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Gerenciar Etapas do Kanban</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4 max-h-[50vh] overflow-y-auto">
          {localStages.map((stage, index) => (
            <div key={index} className="flex items-center gap-2 p-3 border rounded-lg bg-muted/30">
              <div className="flex flex-col gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => moveStage(index, 'up')}
                  disabled={index === 0}
                >
                  <GripVertical className="w-4 h-4" />
                </Button>
              </div>

              <div className="flex-1 grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs text-muted-foreground">Nome</Label>
                  <Input
                    value={stage.name}
                    onChange={(e) => updateStage(index, 'name', e.target.value)}
                    placeholder="Nome da etapa"
                    className="h-9"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Cor</Label>
                  <Select value={stage.color} onValueChange={(v) => updateStage(index, 'color', v)}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COLORS.map((color) => (
                        <SelectItem key={color.value} value={color.value}>
                          <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded ${color.value}`} />
                            {color.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-destructive hover:text-destructive"
                onClick={() => removeStage(index)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}

          <Button variant="outline" onClick={addStage} className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            Adicionar Etapa
          </Button>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
