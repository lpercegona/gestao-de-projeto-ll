import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Loader2, Shield, User, UserCog, Users as UsersIcon, Pencil, Trash2, Plus } from 'lucide-react';
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

interface EditFormData {
  full_name: string;
  email: string;
  role: AppRole | 'none';
}

interface CreateFormData {
  full_name: string;
  email: string;
  password: string;
  role: AppRole | 'none';
}

export const Users: React.FC = () => {
  const { user, isMasterAdmin, isAdmin } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Create dialog state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateFormData>({ 
    full_name: '', 
    email: '', 
    password: '',
    role: 'none' 
  });
  const [creating, setCreating] = useState(false);
  
  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [editForm, setEditForm] = useState<EditFormData>({ full_name: '', email: '', role: 'none' });
  const [saving, setSaving] = useState(false);
  
  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingUser, setDeletingUser] = useState<UserProfile | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // Fetch profiles, roles, and clients in parallel
      const [profilesRes, rolesRes, clientsRes] = await Promise.all([
        supabase.from('profiles').select('user_id, full_name, email, owner_id'),
        supabase.from('user_roles').select('user_id, role'),
        supabase.from('clients').select('email, created_by'),
      ]);

      if (profilesRes.error) throw profilesRes.error;
      if (rolesRes.error) throw rolesRes.error;
      // clients query may fail for non-admin users, that's ok
      
      const profiles = profilesRes.data || [];
      const roles = rolesRes.data || [];
      const clients = clientsRes.data || [];

      const combinedUsers = profiles.map(profile => {
        const userRole = roles.find(r => r.user_id === profile.user_id);
        const role = userRole?.role as AppRole | null || null;
        
        let owner_name: string | null = null;
        
        if (role === 'client') {
          // For clients, find the admin who created the client record (by email match)
          const clientRecord = clients.find(c => c.email?.toLowerCase() === profile.email?.toLowerCase());
          if (clientRecord?.created_by) {
            const creator = profiles.find(p => p.user_id === clientRecord.created_by);
            owner_name = creator?.full_name || null;
          }
        } else {
          // For other roles, use the profile's owner_id
          const owner = profiles.find(p => p.user_id === profile.owner_id);
          owner_name = owner?.full_name || null;
        }
        
        return {
          ...profile,
          role,
          owner_name,
        };
      });

      let filteredUsers = combinedUsers;
      
      if (!isMasterAdmin && isAdmin && user) {
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

  // Create user handlers
  const openCreateDialog = () => {
    setCreateForm({ full_name: '', email: '', password: '', role: 'none' });
    setCreateDialogOpen(true);
  };

  const handleCreateUser = async () => {
    if (!createForm.full_name.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }
    if (!createForm.email.trim()) {
      toast.error('Email é obrigatório');
      return;
    }
    if (!createForm.password || createForm.password.length < 6) {
      toast.error('Senha deve ter no mínimo 6 caracteres');
      return;
    }

    setCreating(true);
    try {
      // Get current session token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Sessão expirada. Faça login novamente.');
        return;
      }

      // Call Edge Function to create user without affecting current session
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            email: createForm.email.trim(),
            password: createForm.password,
            fullName: createForm.full_name.trim(),
            role: createForm.role !== 'none' ? createForm.role : null,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao criar usuário');
      }

      toast.success('Usuário criado com sucesso!');
      setCreateDialogOpen(false);
      fetchUsers();
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

  // Edit user handlers
  const openEditDialog = (userProfile: UserProfile) => {
    setEditingUser(userProfile);
    setEditForm({
      full_name: userProfile.full_name || '',
      email: userProfile.email || '',
      role: userProfile.role || 'none',
    });
    setEditDialogOpen(true);
  };

  const handleSaveUser = async () => {
    if (!editingUser) return;

    if (!editForm.full_name.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }
    if (!editForm.email.trim()) {
      toast.error('Email é obrigatório');
      return;
    }

    setSaving(true);
    try {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: editForm.full_name.trim(),
          email: editForm.email.trim(),
        })
        .eq('user_id', editingUser.user_id);

      if (profileError) throw profileError;

      if (editForm.role !== (editingUser.role || 'none')) {
        if (editForm.role === 'none') {
          const { error } = await supabase
            .from('user_roles')
            .delete()
            .eq('user_id', editingUser.user_id);
          if (error) throw error;
        } else {
          const { data: existingRole } = await supabase
            .from('user_roles')
            .select('id')
            .eq('user_id', editingUser.user_id)
            .maybeSingle();

          if (existingRole) {
            const { error } = await supabase
              .from('user_roles')
              .update({ role: editForm.role })
              .eq('user_id', editingUser.user_id);
            if (error) throw error;
          } else {
            const { error } = await supabase
              .from('user_roles')
              .insert({ user_id: editingUser.user_id, role: editForm.role });
            if (error) throw error;
          }
        }
      }

      toast.success('Usuário atualizado com sucesso!');
      setEditDialogOpen(false);
      setEditingUser(null);
      fetchUsers();
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error('Erro ao atualizar usuário');
    } finally {
      setSaving(false);
    }
  };

  // Delete user handlers
  const openDeleteDialog = (userProfile: UserProfile) => {
    setDeletingUser(userProfile);
    setDeleteDialogOpen(true);
  };

  const handleDeleteUser = async () => {
    if (!deletingUser) return;

    setDeleting(true);
    try {
      await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', deletingUser.user_id);

      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('user_id', deletingUser.user_id);

      if (profileError) throw profileError;

      toast.success('Usuário removido com sucesso!');
      setDeleteDialogOpen(false);
      setDeletingUser(null);
      fetchUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('Erro ao remover usuário. O usuário pode ter dados associados.');
    } finally {
      setDeleting(false);
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

  const getAvailableRoles = (forCreate = false): Array<{ value: string; label: string }> => {
    const baseRoles = [
      { value: 'none', label: 'Sem função' },
      { value: 'client', label: 'Cliente' },
      { value: 'collaborator', label: 'Colaborador' },
    ];

    if (isMasterAdmin) {
      return [
        ...baseRoles,
        { value: 'admin', label: 'Admin' },
        ...(forCreate ? [] : [{ value: 'master_admin', label: 'Master Admin' }]),
      ];
    }

    return baseRoles;
  };

  const canCreateUser = (): boolean => {
    return isMasterAdmin || isAdmin;
  };

  const canEditUser = (targetUser: UserProfile): boolean => {
    if (!user) return false;
    const isCurrentUser = targetUser.user_id === user.id;
    if (isCurrentUser) return true;
    
    if (isMasterAdmin) return true;
    if (isAdmin && targetUser.owner_id === user.id) return true;
    
    return false;
  };

  const canDeleteUser = (targetUser: UserProfile): boolean => {
    if (!user) return false;
    const isCurrentUser = targetUser.user_id === user.id;
    if (isCurrentUser) return false;
    
    if (targetUser.role === 'master_admin') return false;
    
    if (isMasterAdmin) return true;
    if (isAdmin && targetUser.owner_id === user.id) return true;
    
    return false;
  };

  const canChangeRole = (targetUser: UserProfile): boolean => {
    if (!user) return false;
    const isCurrentUser = targetUser.user_id === user.id;
    if (isCurrentUser) return false;
    
    if (targetUser.role === 'master_admin' && !isMasterAdmin) return false;
    
    if (isMasterAdmin) return true;
    if (isAdmin && targetUser.owner_id === user.id) return true;
    
    return false;
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

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-foreground">
          {users.length} {users.length === 1 ? 'usuário' : 'usuários'}
        </h2>
        {canCreateUser() && (
          <Button onClick={openCreateDialog} size="sm" className="px-3">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline ml-2">Novo Usuário</span>
          </Button>
        )}
      </div>

      {users.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">
              Nenhum usuário cadastrado ainda.
            </p>
            {canCreateUser() && (
              <Button onClick={openCreateDialog}>
                <Plus className="w-4 h-4 mr-2" />
                Criar primeiro usuário
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Desktop Table View */}
          <Card className="hidden md:block">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Função</TableHead>
                    {isMasterAdmin && <TableHead>Proprietário</TableHead>}
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => {
                    const isCurrentUser = u.user_id === user?.id;
                    
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
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {canEditUser(u) && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openEditDialog(u)}
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                            )}
                            {canDeleteUser(u) && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openDeleteDialog(u)}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Mobile Card View */}
          <div className="space-y-4 md:hidden">
            {users.map((u) => {
              const isCurrentUser = u.user_id === user?.id;
              
              return (
                <Card key={u.user_id} className="relative">
                  <CardContent className="p-4">
                    {/* Ações no canto superior direito */}
                    <div className="absolute top-3 right-3 flex items-center gap-1">
                      {canEditUser(u) && (
                        <Button variant="ghost" size="icon" onClick={() => openEditDialog(u)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                      )}
                      {canDeleteUser(u) && (
                        <Button variant="ghost" size="icon" onClick={() => openDeleteDialog(u)} className="text-destructive hover:text-destructive">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                    
                    <div className="pr-20">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-semibold text-foreground">{u.full_name || 'Sem nome'}</span>
                        {isCurrentUser && (
                          <Badge variant="outline" className="text-xs">Você</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{u.email}</p>
                      <div className="flex flex-wrap items-center gap-2">
                        {getRoleBadge(u.role)}
                        {isMasterAdmin && u.owner_name && (
                          <span className="text-xs text-muted-foreground">• Proprietário: {u.owner_name}</span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}

      {/* Create User Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Usuário</DialogTitle>
            <DialogDescription>
              Crie um novo usuário preenchendo as informações abaixo.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="create-name">Nome Completo *</Label>
              <Input
                id="create-name"
                value={createForm.full_name}
                onChange={(e) => setCreateForm({ ...createForm, full_name: e.target.value })}
                placeholder="Nome do usuário"
                disabled={creating}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="create-email">Email *</Label>
              <Input
                id="create-email"
                type="email"
                value={createForm.email}
                onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                placeholder="email@exemplo.com"
                disabled={creating}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="create-password">Senha *</Label>
              <Input
                id="create-password"
                type="password"
                value={createForm.password}
                onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                placeholder="Mínimo 6 caracteres"
                disabled={creating}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="create-role">Função</Label>
              <Select
                value={createForm.role}
                onValueChange={(value) => setCreateForm({ ...createForm, role: value as AppRole | 'none' })}
                disabled={creating}
              >
                <SelectTrigger id="create-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {getAvailableRoles(true).map(role => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)} disabled={creating}>
              Cancelar
            </Button>
            <Button onClick={handleCreateUser} disabled={creating}>
              {creating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Criando...
                </>
              ) : (
                'Criar Usuário'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Usuário</DialogTitle>
            <DialogDescription>
              Atualize as informações do usuário abaixo.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Nome Completo</Label>
              <Input
                id="edit-name"
                value={editForm.full_name}
                onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                placeholder="Nome do usuário"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                placeholder="email@exemplo.com"
              />
            </div>
            
            {editingUser && canChangeRole(editingUser) && (
              <div className="space-y-2">
                <Label htmlFor="edit-role">Função</Label>
                <Select
                  value={editForm.role}
                  onValueChange={(value) => setEditForm({ ...editForm, role: value as AppRole | 'none' })}
                >
                  <SelectTrigger id="edit-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {getAvailableRoles().map(role => (
                      <SelectItem key={role.value} value={role.value}>
                        {role.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleSaveUser} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover usuário?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover o usuário <strong>{deletingUser?.full_name || deletingUser?.email}</strong>? 
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteUser} 
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Removendo...
                </>
              ) : (
                'Remover'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
