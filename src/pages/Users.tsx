import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Loader2, Shield, User, UserCog, Users as UsersIcon } from 'lucide-react';
import { toast } from 'sonner';

type AppRole = 'master_admin' | 'admin' | 'collaborator' | 'client';

interface UserProfile {
  user_id: string;
  full_name: string | null;
  email: string | null;
  role: AppRole | null;
  owner_id: string | null;
  owner_name?: string | null;
}

export const Users: React.FC = () => {
  const { user, isMasterAdmin, isAdmin } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // Fetch profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, full_name, email, owner_id');

      if (profilesError) throw profilesError;

      // Fetch roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      // Combine data
      const combinedUsers = profiles?.map(profile => {
        const userRole = roles?.find(r => r.user_id === profile.user_id);
        const owner = profiles?.find(p => p.user_id === profile.owner_id);
        return {
          ...profile,
          role: userRole?.role as AppRole | null || null,
          owner_name: owner?.full_name || null,
        };
      }) || [];

      // Filter based on role
      let filteredUsers = combinedUsers;
      
      if (!isMasterAdmin && isAdmin && user) {
        // Admin can only see users they own + themselves
        filteredUsers = combinedUsers.filter(
          u => u.owner_id === user.id || u.user_id === user.id
        );
      }

      setUsers(filteredUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Erro ao carregar usuários');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [isMasterAdmin, isAdmin, user]);

  const handleRoleChange = async (userId: string, newRole: AppRole | 'none') => {
    // Prevent changing master_admin role (except by master_admin)
    const targetUser = users.find(u => u.user_id === userId);
    if (targetUser?.role === 'master_admin' && !isMasterAdmin) {
      toast.error('Apenas o Master Admin pode alterar essa função');
      return;
    }

    // Admin can only assign collaborator or client roles
    if (isAdmin && !isMasterAdmin && (newRole === 'admin' || newRole === 'master_admin')) {
      toast.error('Você não pode atribuir essa função');
      return;
    }

    setUpdating(userId);
    try {
      if (newRole === 'none') {
        // Remove role
        const { error } = await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', userId);

        if (error) throw error;
      } else {
        // Check if role exists
        const { data: existingRole } = await supabase
          .from('user_roles')
          .select('id')
          .eq('user_id', userId)
          .maybeSingle();

        if (existingRole) {
          // Update existing role
          const { error } = await supabase
            .from('user_roles')
            .update({ role: newRole })
            .eq('user_id', userId);

          if (error) throw error;
        } else {
          // Insert new role
          const { error } = await supabase
            .from('user_roles')
            .insert({ user_id: userId, role: newRole });

          if (error) throw error;
        }
      }

      toast.success('Função atualizada com sucesso!');
      fetchUsers();
    } catch (error) {
      console.error('Error updating role:', error);
      toast.error('Erro ao atualizar função');
    } finally {
      setUpdating(null);
    }
  };

  const getRoleBadge = (role: AppRole | null) => {
    switch (role) {
      case 'master_admin':
        return <Badge className="bg-primary"><Shield className="w-3 h-3 mr-1" />Master Admin</Badge>;
      case 'admin':
        return <Badge variant="secondary"><UserCog className="w-3 h-3 mr-1" />Admin</Badge>;
      case 'collaborator':
        return <Badge variant="outline"><UsersIcon className="w-3 h-3 mr-1" />Colaborador</Badge>;
      case 'client':
        return <Badge variant="outline"><User className="w-3 h-3 mr-1" />Cliente</Badge>;
      default:
        return <Badge variant="outline">Sem função</Badge>;
    }
  };

  // Get available roles based on current user's role
  const getAvailableRoles = (targetRole: AppRole | null): Array<{ value: string; label: string }> => {
    const baseRoles = [
      { value: 'none', label: 'Sem função' },
      { value: 'client', label: 'Cliente' },
      { value: 'collaborator', label: 'Colaborador' },
    ];

    if (isMasterAdmin) {
      return [
        ...baseRoles,
        { value: 'admin', label: 'Admin' },
        { value: 'master_admin', label: 'Master Admin' },
      ];
    }

    // Admin can only manage collaborator and client
    return baseRoles;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Gestão de Usuários"
        description={isMasterAdmin 
          ? "Gerencie todos os usuários e suas permissões" 
          : "Gerencie usuários da sua equipe"}
      />

      {users.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              Nenhum usuário cadastrado ainda.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Função Atual</TableHead>
                  {isMasterAdmin && <TableHead>Proprietário</TableHead>}
                  <TableHead>Alterar Função</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => {
                  const isCurrentUser = u.user_id === user?.id;
                  const canEdit = isMasterAdmin || 
                    (isAdmin && u.owner_id === user?.id && u.role !== 'master_admin' && u.role !== 'admin');
                  
                  return (
                    <TableRow key={u.user_id}>
                      <TableCell className="font-medium">
                        {u.full_name || 'Sem nome'}
                        {isCurrentUser && (
                          <Badge variant="outline" className="ml-2 text-xs">Você</Badge>
                        )}
                      </TableCell>
                      <TableCell>{u.email}</TableCell>
                      <TableCell>{getRoleBadge(u.role)}</TableCell>
                      {isMasterAdmin && (
                        <TableCell className="text-muted-foreground">
                          {u.owner_name || (u.role === 'master_admin' ? '-' : 'Sistema')}
                        </TableCell>
                      )}
                      <TableCell>
                        {canEdit && !isCurrentUser ? (
                          <Select
                            value={u.role || 'none'}
                            onValueChange={(value) => 
                              handleRoleChange(u.user_id, value as AppRole | 'none')
                            }
                            disabled={updating === u.user_id}
                          >
                            <SelectTrigger className="w-40">
                              {updating === u.user_id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <SelectValue />
                              )}
                            </SelectTrigger>
                            <SelectContent>
                              {getAvailableRoles(u.role).map(role => (
                                <SelectItem key={role.value} value={role.value}>
                                  {role.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <span className="text-muted-foreground text-sm">
                            {isCurrentUser ? 'Próprio usuário' : 'Sem permissão'}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
