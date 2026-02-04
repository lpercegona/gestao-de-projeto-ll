import React, { useState } from 'react';
import { Plus, Users, FileCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useData } from '@/contexts/DataContext';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

export const QuickActionsPanel: React.FC = () => {
  const [clientDialogOpen, setClientDialogOpen] = useState(false);
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const { createClient } = useData();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleCreateClient = async () => {
    if (!clientName || !clientEmail) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha nome e email do cliente.',
        variant: 'destructive',
      });
      return;
    }

    setIsCreating(true);
    try {
      const newClient = await createClient({
        name: clientName,
        email: clientEmail,
        contracted_hours: 0,
      });

      if (newClient) {
        toast({
          title: 'Cliente criado',
          description: `${clientName} foi adicionado com sucesso.`,
        });
        setClientDialogOpen(false);
        setClientName('');
        setClientEmail('');
        navigate(`/clients/${newClient.id}`);
      }
    } catch (error) {
      toast({
        title: 'Erro ao criar cliente',
        description: 'Ocorreu um erro. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Ações Rápidas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button 
            variant="outline" 
            className="w-full justify-start gap-2"
            onClick={() => setClientDialogOpen(true)}
          >
            <Users className="h-4 w-4" />
            Novo Cliente
          </Button>
          <Button 
            variant="outline" 
            className="w-full justify-start gap-2"
            onClick={() => navigate('/proposals')}
          >
            <FileCheck className="h-4 w-4" />
            Nova Proposta
          </Button>
        </CardContent>
      </Card>

      {/* Quick Client Dialog */}
      <Dialog open={clientDialogOpen} onOpenChange={setClientDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Cliente</DialogTitle>
            <DialogDescription>
              Adicione um novo cliente rapidamente. Você pode completar os dados depois.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="client-name">Nome</Label>
              <Input
                id="client-name"
                placeholder="Nome do cliente"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="client-email">Email</Label>
              <Input
                id="client-email"
                type="email"
                placeholder="email@exemplo.com"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setClientDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateClient} disabled={isCreating}>
              {isCreating ? 'Criando...' : 'Criar Cliente'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
