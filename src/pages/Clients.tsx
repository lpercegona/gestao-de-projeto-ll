import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '@/contexts/DataContext';
import { supabase } from '@/integrations/supabase/client';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, Pencil, Trash2, Loader2, UserCheck, Handshake } from 'lucide-react';
import { toast } from 'sonner';

interface Client {
  id: string;
  name: string;
  email: string;
  contracted_hours: number;
  access_token: string;
  pipeline_status?: string;
  company?: string | null;
  phone?: string | null;
  source?: string | null;
  notes?: string | null;
}

export const Clients: React.FC = () => {
  const navigate = useNavigate();
  const { data, loading, createClient, updateClient, deleteClient, getClientHours } = useData();
  const [activeTab, setActiveTab] = useState<'active' | 'negotiation'>('active');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [deletingClient, setDeletingClient] = useState<Client | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    contracted_hours: 0,
  });

  // Filter clients by pipeline status
  const filteredClients = useMemo(() => {
    if (activeTab === 'active') {
      return data.clients.filter(c => c.pipeline_status === 'active');
    } else {
      return data.clients.filter(c => ['lead', 'proposal'].includes(c.pipeline_status || 'lead'));
    }
  }, [data.clients, activeTab]);

  const activeCount = data.clients.filter(c => c.pipeline_status === 'active').length;
  const negotiationCount = data.clients.filter(c => ['lead', 'proposal'].includes(c.pipeline_status || 'lead')).length;

  const handleOpenDialog = (client?: Client) => {
    if (client) {
      setEditingClient(client);
      setFormData({
        name: client.name,
        email: client.email,
        contracted_hours: client.contracted_hours,
      });
    } else {
      setEditingClient(null);
      setFormData({ name: '', email: '', contracted_hours: 0 });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    
    if (editingClient) {
      await updateClient(editingClient.id, formData);
      toast.success('Cliente atualizado com sucesso!');
    } else {
      await createClient(formData);
      toast.success('Cliente criado com sucesso!');
    }
    
    setSubmitting(false);
    setIsDialogOpen(false);
  };

  const handleDelete = async () => {
    if (deletingClient) {
      await deleteClient(deletingClient.id);
      toast.success('Cliente excluído com sucesso!');
      setIsDeleteDialogOpen(false);
      setDeletingClient(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const getPipelineBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800">Ativo</Badge>;
      case 'proposal':
        return <Badge className="bg-blue-100 text-blue-800">Em Negociação</Badge>;
      case 'churned':
        return <Badge variant="destructive">Inativo</Badge>;
      default:
        return <Badge variant="secondary">Lead</Badge>;
    }
  };

  return (
    <div>
      <PageHeader
        title="Clientes"
        description="Gerencie seus clientes e horas contratadas"
      />

      <div className="flex items-center justify-between mb-4">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'active' | 'negotiation')} className="flex-1">
          <TabsList>
            <TabsTrigger value="active" className="flex items-center gap-2">
              <UserCheck className="w-4 h-4" />
              <span className="hidden sm:inline">Ativos</span>
              <Badge variant="secondary" className="ml-1">{activeCount}</Badge>
            </TabsTrigger>
            <TabsTrigger value="negotiation" className="flex items-center gap-2">
              <Handshake className="w-4 h-4" />
              <span className="hidden sm:inline">Em Negociação</span>
              <Badge variant="secondary" className="ml-1">{negotiationCount}</Badge>
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <Button onClick={() => handleOpenDialog()} size="sm" className="px-3 ml-4">
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline ml-2">Novo Cliente</span>
        </Button>
      </div>

      {filteredClients.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">Nenhum cliente cadastrado ainda.</p>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="w-4 h-4 mr-2" />
              Criar primeiro cliente
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredClients.map((client) => {
            const usedHours = getClientHours(client.id);
            const projectCount = data.projects.filter(p => p.client_id === client.id).length;
            return (
              <Card 
                key={client.id} 
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => navigate(`/clients/${client.id}`)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-foreground">{client.name}</h3>
                      <p className="text-sm text-muted-foreground">{client.email}</p>
                    </div>
                    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => handleOpenDialog(client)}
                      >
                        <Pencil className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-destructive hover:text-destructive"
                        onClick={() => {
                          setDeletingClient(client);
                          setIsDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Projetos:</span>
                      <span className="font-medium text-foreground">{projectCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Horas usadas:</span>
                      <span className="font-medium text-foreground">{usedHours}h / {client.contracted_hours}h</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2 mt-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all"
                        style={{ 
                          width: `${client.contracted_hours > 0 
                            ? Math.min((usedHours / client.contracted_hours) * 100, 100) 
                            : 0}%` 
                        }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingClient ? 'Editar Cliente' : 'Novo Cliente'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome da Empresa</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  disabled={submitting}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  disabled={submitting}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contracted_hours">Horas Contratadas</Label>
                <Input
                  id="contracted_hours"
                  type="number"
                  min="0"
                  value={formData.contracted_hours}
                  onChange={(e) => setFormData({ ...formData, contracted_hours: Number(e.target.value) })}
                  required
                  disabled={submitting}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} disabled={submitting}>
                Cancelar
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                {editingClient ? 'Salvar' : 'Criar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir cliente?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso excluirá permanentemente o cliente
              "{deletingClient?.name}" e todos os seus projetos, tarefas e registros de horas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
