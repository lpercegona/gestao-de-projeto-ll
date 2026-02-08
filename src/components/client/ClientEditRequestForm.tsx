import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface ClientEditRequestFormProps {
  entityType: 'project' | 'project_request';
  entityId: string;
  clientId: string;
  currentData: {
    title?: string;
    name?: string;
    description?: string;
    briefing?: string;
    due_date?: string | null;
    desired_deadline?: string | null;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export const ClientEditRequestForm: React.FC<ClientEditRequestFormProps> = ({
  entityType,
  entityId,
  clientId,
  currentData,
  open,
  onOpenChange,
  onSuccess,
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  
  // Form state based on entity type
  const [formData, setFormData] = useState({
    title: currentData.title || currentData.name || '',
    description: currentData.description || currentData.briefing || '',
    deadline: currentData.due_date || currentData.desired_deadline 
      ? parseISO(currentData.due_date || currentData.desired_deadline || '')
      : undefined,
  });

  // Reset form when dialog opens
  React.useEffect(() => {
    if (open) {
      setFormData({
        title: currentData.title || currentData.name || '',
        description: currentData.description || currentData.briefing || '',
        deadline: currentData.due_date || currentData.desired_deadline 
          ? parseISO(currentData.due_date || currentData.desired_deadline || '')
          : undefined,
      });
    }
  }, [open, currentData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      // Build proposed data based on entity type
      let proposedData: Record<string, unknown> = {};
      let originalData: Record<string, unknown> = {};

      if (entityType === 'project') {
        proposedData = {
          description: formData.description,
          due_date: formData.deadline ? format(formData.deadline, 'yyyy-MM-dd') : null,
        };
        originalData = {
          description: currentData.description || null,
          due_date: currentData.due_date || null,
        };
      } else {
        // project_request
        proposedData = {
          title: formData.title,
          briefing: formData.description,
          desired_deadline: formData.deadline ? format(formData.deadline, 'yyyy-MM-dd') : null,
        };
        originalData = {
          title: currentData.title || '',
          briefing: currentData.briefing || '',
          desired_deadline: currentData.desired_deadline || null,
        };
      }

      // Check if any changes were made
      const hasChanges = JSON.stringify(proposedData) !== JSON.stringify(originalData);
      if (!hasChanges) {
        toast.info('Nenhuma alteração foi feita');
        onOpenChange(false);
        return;
      }

      const { error } = await supabase.from('edit_requests').insert([{
        entity_type: entityType,
        entity_id: entityId,
        client_id: clientId,
        requested_by: user.id,
        original_data: originalData as unknown as Record<string, string | number | boolean | null>,
        proposed_data: proposedData as unknown as Record<string, string | number | boolean | null>,
      }]);

      if (error) throw error;

      toast.success('Solicitação de edição enviada! Aguarde aprovação do administrador.');
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Error creating edit request:', error);
      toast.error('Erro ao enviar solicitação de edição');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>
            Solicitar Edição - {entityType === 'project' ? 'Projeto' : 'Solicitação'}
          </DialogTitle>
          <DialogDescription>
            Suas alterações serão enviadas para aprovação do administrador.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
          {/* Title - only for project_request */}
          {entityType === 'project_request' && (
            <div className="space-y-2">
              <Label htmlFor="title">Título</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Título da solicitação"
                required
              />
            </div>
          )}

          {/* Description/Briefing */}
          <div className="space-y-2">
            <Label htmlFor="description">
              {entityType === 'project' ? 'Descrição' : 'Briefing'}
            </Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder={entityType === 'project' ? 'Descrição do projeto' : 'Descreva sua necessidade'}
              rows={4}
            />
          </div>

          {/* Deadline */}
          <div className="space-y-2">
            <Label>
              {entityType === 'project' ? 'Prazo' : 'Prazo Desejado'}
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !formData.deadline && "text-muted-foreground"
                  )}
                  type="button"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.deadline ? (
                    format(formData.deadline, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
                  ) : (
                    <span>Selecionar data</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={formData.deadline}
                  onSelect={(date) => setFormData(prev => ({ ...prev, deadline: date }))}
                  locale={ptBR}
                  disabled={(date) => date < new Date()}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Enviar Solicitação
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
