import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, User, Globe, Shield } from 'lucide-react';
import { toast } from 'sonner';

type AppRole = 'master_admin' | 'admin' | 'collaborator' | 'client';

interface UserProfile {
  user_id: string;
  full_name: string | null;
  email: string | null;
  role: string | null;
}

interface UserEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserProfile | null;
  onSaved?: () => void;
  showRoleEdit?: boolean;
  showPreferences?: boolean;
}

const WORLD_TIMEZONES = [
  {
    region: 'América',
    zones: [
      { value: 'America/Sao_Paulo', label: 'São Paulo (UTC-3)' },
      { value: 'America/Noronha', label: 'Fernando de Noronha (UTC-2)' },
      { value: 'America/Manaus', label: 'Manaus (UTC-4)' },
      { value: 'America/Rio_Branco', label: 'Rio Branco (UTC-5)' },
      { value: 'America/Buenos_Aires', label: 'Buenos Aires (UTC-3)' },
      { value: 'America/New_York', label: 'Nova York (UTC-5)' },
      { value: 'America/Chicago', label: 'Chicago (UTC-6)' },
      { value: 'America/Denver', label: 'Denver (UTC-7)' },
      { value: 'America/Los_Angeles', label: 'Los Angeles (UTC-8)' },
      { value: 'America/Mexico_City', label: 'Cidade do México (UTC-6)' },
      { value: 'America/Toronto', label: 'Toronto (UTC-5)' },
    ]
  },
  {
    region: 'Europa',
    zones: [
      { value: 'Europe/London', label: 'Londres (UTC+0)' },
      { value: 'Europe/Lisbon', label: 'Lisboa (UTC+0)' },
      { value: 'Europe/Paris', label: 'Paris (UTC+1)' },
      { value: 'Europe/Berlin', label: 'Berlim (UTC+1)' },
      { value: 'Europe/Madrid', label: 'Madrid (UTC+1)' },
      { value: 'Europe/Rome', label: 'Roma (UTC+1)' },
      { value: 'Europe/Moscow', label: 'Moscou (UTC+3)' },
    ]
  },
  {
    region: 'Ásia/Pacífico',
    zones: [
      { value: 'Asia/Dubai', label: 'Dubai (UTC+4)' },
      { value: 'Asia/Kolkata', label: 'Mumbai/Nova Délhi (UTC+5:30)' },
      { value: 'Asia/Singapore', label: 'Singapura (UTC+8)' },
      { value: 'Asia/Tokyo', label: 'Tóquio (UTC+9)' },
      { value: 'Australia/Sydney', label: 'Sydney (UTC+10)' },
    ]
  },
];

export const UserEditDialog: React.FC<UserEditDialogProps> = ({
  open,
  onOpenChange,
  user,
  onSaved,
  showRoleEdit = true,
  showPreferences = true,
}) => {
  const { isMasterAdmin, isAdmin } = useAuth();
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  
  // Profile form
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<AppRole | 'none'>('none');
  
  // Preferences form
  const [timezone, setTimezone] = useState('America/Sao_Paulo');
  const [preferencesLoading, setPreferencesLoading] = useState(false);

  useEffect(() => {
    if (user && open) {
      setFullName(user.full_name || '');
      setEmail(user.email || '');
      setRole((user.role as AppRole) || 'none');
      setActiveTab('profile');
      
      // Load user preferences
      if (showPreferences) {
        loadPreferences();
      }
    }
  }, [user, open]);

  const loadPreferences = async () => {
    if (!user) return;
    setPreferencesLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('timezone')
        .eq('user_id', user.user_id)
        .maybeSingle();
      
      if (data) {
        setTimezone(data.timezone || 'America/Sao_Paulo');
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    } finally {
      setPreferencesLoading(false);
    }
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

  const handleSave = async () => {
    if (!user) return;
    
    if (!fullName.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }

    setSaving(true);
    try {
      // Update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: fullName.trim(),
          email: email.trim(),
        })
        .eq('user_id', user.user_id);

      if (profileError) throw profileError;

      // Update role if changed
      if (showRoleEdit && role !== (user.role || 'none')) {
        if (role === 'none') {
          await supabase
            .from('user_roles')
            .delete()
            .eq('user_id', user.user_id);
        } else {
          const { data: existingRole } = await supabase
            .from('user_roles')
            .select('id')
            .eq('user_id', user.user_id)
            .maybeSingle();

          if (existingRole) {
            await supabase
              .from('user_roles')
              .update({ role })
              .eq('user_id', user.user_id);
          } else {
            await supabase
              .from('user_roles')
              .insert({ user_id: user.user_id, role });
          }
        }
      }

      // Update preferences
      if (showPreferences) {
        const { data: existingPref } = await supabase
          .from('user_preferences')
          .select('id')
          .eq('user_id', user.user_id)
          .maybeSingle();

        if (existingPref) {
          await supabase
            .from('user_preferences')
            .update({ timezone })
            .eq('user_id', user.user_id);
        } else {
          await supabase
            .from('user_preferences')
            .insert({ user_id: user.user_id, timezone });
        }
      }

      toast.success('Usuário atualizado com sucesso!');
      onOpenChange(false);
      onSaved?.();
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error('Erro ao atualizar usuário');
    } finally {
      setSaving(false);
    }
  };

  const canEditRole = (): boolean => {
    if (!user) return false;
    if (user.role === 'master_admin') return false;
    return isMasterAdmin || isAdmin;
  };

  if (!user) return null;

  const showTabs = showPreferences && (showRoleEdit && canEditRole());

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Usuário</DialogTitle>
          <DialogDescription>
            Atualize as informações e preferências do usuário.
          </DialogDescription>
        </DialogHeader>

        {showTabs ? (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="profile" className="flex items-center gap-2">
                <User className="w-4 h-4" />
                Perfil
              </TabsTrigger>
              <TabsTrigger value="preferences" className="flex items-center gap-2">
                <Globe className="w-4 h-4" />
                Preferências
              </TabsTrigger>
            </TabsList>

            <TabsContent value="profile" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="user-name">Nome Completo</Label>
                <Input
                  id="user-name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Nome do usuário"
                  disabled={saving}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="user-email">Email</Label>
                <Input
                  id="user-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@exemplo.com"
                  disabled={saving}
                />
              </div>

              {showRoleEdit && canEditRole() && (
                <div className="space-y-2">
                  <Label htmlFor="user-role">Função</Label>
                  <Select value={role} onValueChange={(v) => setRole(v as AppRole | 'none')} disabled={saving}>
                    <SelectTrigger id="user-role">
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
              )}
            </TabsContent>

            <TabsContent value="preferences" className="space-y-4 mt-4">
              {preferencesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="user-timezone">Fuso Horário</Label>
                  <Select value={timezone} onValueChange={setTimezone} disabled={saving}>
                    <SelectTrigger id="user-timezone">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      {WORLD_TIMEZONES.map((group) => (
                        <SelectGroup key={group.region}>
                          <SelectLabel>{group.region}</SelectLabel>
                          {group.zones.map((zone) => (
                            <SelectItem key={zone.value} value={zone.value}>
                              {zone.label}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </TabsContent>
          </Tabs>
        ) : (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="user-name">Nome Completo</Label>
              <Input
                id="user-name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Nome do usuário"
                disabled={saving}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="user-email">Email</Label>
              <Input
                id="user-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@exemplo.com"
                disabled={saving}
              />
            </div>

            {showRoleEdit && canEditRole() && (
              <div className="space-y-2">
                <Label htmlFor="user-role">Função</Label>
                <Select value={role} onValueChange={(v) => setRole(v as AppRole | 'none')} disabled={saving}>
                  <SelectTrigger id="user-role">
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
            )}

            {showPreferences && !preferencesLoading && (
              <div className="space-y-2">
                <Label htmlFor="user-timezone">Fuso Horário</Label>
                <Select value={timezone} onValueChange={setTimezone} disabled={saving}>
                  <SelectTrigger id="user-timezone">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {WORLD_TIMEZONES.map((group) => (
                      <SelectGroup key={group.region}>
                        <SelectLabel>{group.region}</SelectLabel>
                        {group.zones.map((zone) => (
                          <SelectItem key={zone.value} value={zone.value}>
                            {zone.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
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
  );
};
