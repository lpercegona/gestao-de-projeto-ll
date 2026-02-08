import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import { format } from 'date-fns';

interface ProjectRequestFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (title: string, briefing: string, desiredDeadline?: string) => Promise<void>;
}

export const ProjectRequestForm: React.FC<ProjectRequestFormProps> = ({
  open,
  onOpenChange,
  onSubmit,
}) => {
  const [title, setTitle] = useState('');
  const [briefing, setBriefing] = useState('');
  const [desiredDeadline, setDesiredDeadline] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !briefing.trim()) return;

    setSubmitting(true);
    try {
      await onSubmit(title.trim(), briefing.trim(), desiredDeadline || undefined);
      setTitle('');
      setBriefing('');
      setDesiredDeadline('');
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  // Minimum date is tomorrow
  const minDate = format(new Date(Date.now() + 86400000), 'yyyy-MM-dd');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Solicitar Novo Projeto</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="max-h-[60vh] overflow-y-auto pr-1">
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Título do Projeto *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Redesign do site institucional"
                required
                disabled={submitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="briefing">Briefing Detalhado *</Label>
              <Textarea
                id="briefing"
                value={briefing}
                onChange={(e) => setBriefing(e.target.value)}
                placeholder="Descreva o projeto em detalhes: objetivos, escopo, prazo desejado, referências, etc."
                rows={6}
                required
                disabled={submitting}
              />
              <p className="text-xs text-muted-foreground">
                Quanto mais detalhes você fornecer, melhor conseguiremos entender suas necessidades.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="deadline">Prazo Desejado (opcional)</Label>
              <Input
                id="deadline"
                type="date"
                value={desiredDeadline}
                onChange={(e) => setDesiredDeadline(e.target.value)}
                min={minDate}
                disabled={submitting}
              />
              <p className="text-xs text-muted-foreground">
                Se você tem uma data limite, informe aqui.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting || !title.trim() || !briefing.trim()}>
              {submitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Enviar Solicitação
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
