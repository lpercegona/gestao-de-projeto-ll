import React, { useState, useEffect } from 'react';
import { useEditingLock } from '@/hooks/useEditingLock';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FormSheet } from '@/components/ui/form-sheet';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

type AppRole = 'master_admin' | 'admin' | 'collaborator' | 'client';

interface Client {
  id: string;
  name: string;
  company: string | null;
}

interface UserCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
  defaultRole?: AppRole | 'none';
  defaultClientId?: string;
  title?: string;
  description?: string;
}

export const UserCreateDialog: React.FC<UserCreateDialogProps> = ({
  open,
  onOpenChange,
  onCreated,
  defaultRole = 'none',
  defaultClientId,
  title = 'Novo Usuário',
  description = 'Crie um novo usuário preenchendo as informações abaixo.',
}) => {
  const { isMasterAdmin } = useAuth();
  useEditingLock(open);
  const [creating, setCreating] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<AppRole | 'none'>(defaultRole);
  const [selectedClientId, setSelectedClientId] = useState<string>(defaultClientId || '');
  const [clients, setClients] = useState<Client[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);

  // Load clients when role is 'client' and no defaultClientId
  useEffect(() => {
    if (role === 'client' && !defaultClientId) {
      loadClients();
    }
  }, [role, defaultClientId]);

  // Reset selectedClientId when defaultClientId changes
  useEffect(() => {
    if (defaultClientId) {
      setSelectedClientId(defaultClientId);
    }
  }, [defaultClientId]);

  const loadClients = async () => {
    setLoadingClients(true);
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('id, name, company')
        .order('name');
      
      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Error loading clients:', error);
    } finally {
      setLoadingClients(false);
    }
  };

  const resetForm = () => {
    setFullName('');
    setEmail('');
    setPassword('');
    setRole(defaultRole);
    setSelectedClientId(defaultClientId || '');
  };

  const getAvailableRoles = (): Array<{ value: string; label: string }> => {
    const baseRoles = [
      { value: 'none', label: 'Sem função' },
      { value: 'client', label: 'Cliente' },
      { value: 'collaborator', label: 'Colaborador' },
    ];

    if (isMasterAdmin) {
      return [
        ...baseRoles,
        { value: 'admin', label: 'Admin' },
      ];
    }

    return baseRoles;
  };

  const handleCreate = async () => {
    if (!fullName.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }
    if (!email.trim()) {
      toast.error('Email é obrigatório');
      return;
    }
    if (!password || password.length < 6) {
      toast.error('Senha deve ter no mínimo 6 caracteres');
      return;
    }
    // Validação: cliente requer empresa selecionada
    if (role === 'client' && !selectedClientId) {
      toast.error('Selecione uma empresa para vincular o usuário cliente');
      return;
    }

    setCreating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Sessão expirada. Faça login novamente.');
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            email: email.trim(),
            password,
            fullName: fullName.trim(),
            role: role !== 'none' ? role : null,
            clientId: role === 'client' ? selectedClientId : null,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao criar usuário');
      }

      toast.success('Usuário criado com sucesso!');
      resetForm();
      onOpenChange(false);
      onCreated?.();
    } catch (error: any) {
      console.error('Error creating user:', error);
      if (error.message?.includes('already registered') || error.message?.includes('already been registered')) {
        toast.error('Este email já está cadastrado');
      } else {
        toast.error('Erro ao criar usuário: ' + (error.message || 'Erro desconhecido'));
      }
    } finally {
      setCreating(false);
    }
  };

  return (
    <FormSheet
      open={open}
      onOpenChange={(value) => {
        if (!value) resetForm();
        onOpenChange(value);
      }}
      title={title}
      description={description}
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={creating}>
            Cancelar
          </Button>
          <Button onClick={handleCreate} disabled={creating}>
            {creating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Criando...
              </>
            ) : (
              'Criar Usuário'
            )}
          </Button>
        </>
      }
    >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="create-name">Nome Completo *</Label>
            <Input
              id="create-name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Nome do usuário"
              disabled={creating}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="create-email">Email *</Label>
            <Input
              id="create-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@exemplo.com"
              disabled={creating}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="create-password">Senha *</Label>
            <Input
              id="create-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              disabled={creating}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="create-role">Função</Label>
            <Select
              value={role}
              onValueChange={(value) => {
                setRole(value as AppRole | 'none');
                if (value !== 'client') {
                  setSelectedClientId('');
                }
              }}
              disabled={creating || !!defaultClientId}
            >
              <SelectTrigger id="create-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {getAvailableRoles().map(r => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {role === 'client' && !defaultClientId && (
            <div className="space-y-2">
              <Label htmlFor="create-client">Empresa Vinculada *</Label>
              <Select
                value={selectedClientId}
                onValueChange={setSelectedClientId}
                disabled={creating || loadingClients}
              >
                <SelectTrigger id="create-client">
                  <SelectValue placeholder={loadingClients ? "Carregando..." : "Selecione uma empresa"} />
                </SelectTrigger>
                <SelectContent>
                  {clients.map(client => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.company || client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                O usuário terá acesso aos dados desta empresa
              </p>
            </div>
          )}

          {role === 'client' && defaultClientId && (
            <div className="space-y-2">
              <Label>Empresa Vinculada</Label>
              <div className="p-2 bg-muted rounded text-sm text-muted-foreground">
                O usuário será vinculado automaticamente a esta empresa
              </div>
            </div>
          )}
        </div>
    </FormSheet>
  );
};
