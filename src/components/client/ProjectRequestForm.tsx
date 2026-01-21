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

interface ProjectRequestFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (title: string, briefing: string) => Promise<void>;
}

export const ProjectRequestForm: React.FC<ProjectRequestFormProps> = ({
  open,
  onOpenChange,
  onSubmit,
}) => {
  const [title, setTitle] = useState('');
  const [briefing, setBriefing] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !briefing.trim()) return;

    setSubmitting(true);
    try {
      await onSubmit(title.trim(), briefing.trim());
      setTitle('');
      setBriefing('');
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Solicitar Novo Projeto</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
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
