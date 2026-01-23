import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ProjectRequestForm } from '@/components/client/ProjectRequestForm';
import { toast } from 'sonner';
import { FileText, Plus } from 'lucide-react';

interface QuickRequestCardProps {
  pendingCount?: number;
}

export const QuickRequestCard: React.FC<QuickRequestCardProps> = ({ pendingCount = 0 }) => {
  const { user } = useAuth();
  const [isFormOpen, setIsFormOpen] = useState(false);

  const handleSubmitRequest = async (title: string, briefing: string) => {
    if (!user) return;

    try {
      // Get client_id from client_users
      const { data: clientUserData, error: clientUserError } = await supabase
        .from('client_users')
        .select('client_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (clientUserError || !clientUserData?.client_id) {
        throw new Error('Cliente não encontrado');
      }

      // Insert new project request
      const { error } = await supabase
        .from('project_requests')
        .insert({
          client_id: clientUserData.client_id,
          title,
          briefing,
          created_by: user.id,
          status: 'pending',
        });

      if (error) throw error;

      toast.success('Solicitação enviada com sucesso!');
      setIsFormOpen(false);
      
      // Reload the page to refresh the data
      window.location.reload();
    } catch (error) {
      console.error('Error submitting request:', error);
      toast.error('Erro ao enviar solicitação');
    }
  };

  return (
    <>
      <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-primary/20">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/20 rounded-xl">
                <FileText className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Solicitação Rápida</h3>
                <p className="text-sm text-muted-foreground">
                  Solicite um novo projeto ou serviço
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {pendingCount > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {pendingCount} pendente{pendingCount > 1 ? 's' : ''}
                </Badge>
              )}
              <Button onClick={() => setIsFormOpen(true)} className="gap-2">
                <Plus className="w-4 h-4" />
                Nova Solicitação
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <ProjectRequestForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSubmit={handleSubmitRequest}
      />
    </>
  );
};
