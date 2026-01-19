import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
  Loader2, 
  Save, 
  Lock, 
  User, 
  Shield, 
  UserCog, 
  Camera, 
  Upload, 
  Globe,
  Palette
} from 'lucide-react';
import { toast } from 'sonner';
import { ThemeSettings } from '@/components/settings/ThemeSettings';

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
      { value: 'America/Anchorage', label: 'Anchorage (UTC-9)' },
      { value: 'America/Mexico_City', label: 'Cidade do México (UTC-6)' },
      { value: 'America/Toronto', label: 'Toronto (UTC-5)' },
      { value: 'America/Vancouver', label: 'Vancouver (UTC-8)' },
      { value: 'America/Lima', label: 'Lima (UTC-5)' },
      { value: 'America/Bogota', label: 'Bogotá (UTC-5)' },
      { value: 'America/Santiago', label: 'Santiago (UTC-4)' },
      { value: 'America/Caracas', label: 'Caracas (UTC-4)' },
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
      { value: 'Europe/Amsterdam', label: 'Amsterdã (UTC+1)' },
      { value: 'Europe/Brussels', label: 'Bruxelas (UTC+1)' },
      { value: 'Europe/Vienna', label: 'Viena (UTC+1)' },
      { value: 'Europe/Stockholm', label: 'Estocolmo (UTC+1)' },
      { value: 'Europe/Warsaw', label: 'Varsóvia (UTC+1)' },
      { value: 'Europe/Athens', label: 'Atenas (UTC+2)' },
      { value: 'Europe/Helsinki', label: 'Helsinque (UTC+2)' },
      { value: 'Europe/Kiev', label: 'Kiev (UTC+2)' },
      { value: 'Europe/Moscow', label: 'Moscou (UTC+3)' },
      { value: 'Europe/Istanbul', label: 'Istambul (UTC+3)' },
    ]
  },
  {
    region: 'Ásia',
    zones: [
      { value: 'Asia/Dubai', label: 'Dubai (UTC+4)' },
      { value: 'Asia/Karachi', label: 'Karachi (UTC+5)' },
      { value: 'Asia/Kolkata', label: 'Mumbai/Nova Délhi (UTC+5:30)' },
      { value: 'Asia/Dhaka', label: 'Daca (UTC+6)' },
      { value: 'Asia/Bangkok', label: 'Bangkok (UTC+7)' },
      { value: 'Asia/Jakarta', label: 'Jacarta (UTC+7)' },
      { value: 'Asia/Ho_Chi_Minh', label: 'Ho Chi Minh (UTC+7)' },
      { value: 'Asia/Singapore', label: 'Singapura (UTC+8)' },
      { value: 'Asia/Hong_Kong', label: 'Hong Kong (UTC+8)' },
      { value: 'Asia/Shanghai', label: 'Xangai/Pequim (UTC+8)' },
      { value: 'Asia/Taipei', label: 'Taipei (UTC+8)' },
      { value: 'Asia/Seoul', label: 'Seul (UTC+9)' },
      { value: 'Asia/Tokyo', label: 'Tóquio (UTC+9)' },
      { value: 'Asia/Jerusalem', label: 'Jerusalém (UTC+2)' },
      { value: 'Asia/Riyadh', label: 'Riade (UTC+3)' },
      { value: 'Asia/Tehran', label: 'Teerã (UTC+3:30)' },
    ]
  },
  {
    region: 'Oceania',
    zones: [
      { value: 'Australia/Perth', label: 'Perth (UTC+8)' },
      { value: 'Australia/Adelaide', label: 'Adelaide (UTC+9:30)' },
      { value: 'Australia/Brisbane', label: 'Brisbane (UTC+10)' },
      { value: 'Australia/Sydney', label: 'Sydney (UTC+10)' },
      { value: 'Australia/Melbourne', label: 'Melbourne (UTC+10)' },
      { value: 'Pacific/Auckland', label: 'Auckland (UTC+12)' },
      { value: 'Pacific/Fiji', label: 'Fiji (UTC+12)' },
      { value: 'Pacific/Honolulu', label: 'Honolulu (UTC-10)' },
    ]
  },
  {
    region: 'África',
    zones: [
      { value: 'Africa/Casablanca', label: 'Casablanca (UTC+0)' },
      { value: 'Africa/Lagos', label: 'Lagos (UTC+1)' },
      { value: 'Africa/Cairo', label: 'Cairo (UTC+2)' },
      { value: 'Africa/Johannesburg', label: 'Joanesburgo (UTC+2)' },
      { value: 'Africa/Nairobi', label: 'Nairóbi (UTC+3)' },
    ]
  },
];

export const Preferences: React.FC = () => {
  const { user, userRole, isMasterAdmin, isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('profile');
  
  // Profile data
  const [fullName, setFullName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Password data
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  
  // Timezone preferences
  const [timezone, setTimezone] = useState('America/Sao_Paulo');
  const [savingTimezone, setSavingTimezone] = useState(false);

  // Load profile and preferences
  useEffect(() => {
    const loadData = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      
      try {
        // Fetch profile and preferences in parallel
        const [profileRes, prefsRes] = await Promise.all([
          supabase
            .from('profiles')
            .select('full_name, avatar_url')
            .eq('user_id', user.id)
            .maybeSingle(),
          supabase
            .from('user_preferences')
            .select('timezone')
            .eq('user_id', user.id)
            .maybeSingle(),
        ]);
        
        if (profileRes.data) {
          setFullName(profileRes.data.full_name || '');
          setAvatarUrl(profileRes.data.avatar_url || null);
        }
        
        if (prefsRes.data?.timezone) {
          setTimezone(prefsRes.data.timezone);
        }
      } catch (err) {
        console.error('Error loading data:', err);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [user]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, selecione uma imagem válida.');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error('A imagem deve ter no máximo 2MB.');
      return;
    }

    setUploadingAvatar(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/avatar.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const urlWithCacheBuster = `${publicUrl}?t=${Date.now()}`;

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: urlWithCacheBuster })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      setAvatarUrl(urlWithCacheBuster);
      toast.success('Foto de perfil atualizada com sucesso!');
    } catch (err: any) {
      console.error('Error uploading avatar:', err);
      toast.error('Erro ao fazer upload da foto: ' + (err.message || 'Erro desconhecido'));
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setSavingProfile(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: fullName.trim() })
        .eq('user_id', user.id);
      
      if (error) {
        toast.error('Erro ao salvar perfil: ' + error.message);
      } else {
        toast.success('Perfil atualizado com sucesso!');
      }
    } catch (err) {
      toast.error('Erro ao salvar perfil.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      toast.error('As senhas não coincidem.');
      return;
    }
    
    if (newPassword.length < 6) {
      toast.error('A nova senha deve ter pelo menos 6 caracteres.');
      return;
    }
    
    setSavingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });
      
      if (error) {
        toast.error('Erro ao alterar senha: ' + error.message);
      } else {
        toast.success('Senha alterada com sucesso!');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (err) {
      toast.error('Erro ao alterar senha.');
    } finally {
      setSavingPassword(false);
    }
  };

  const handleSaveTimezone = async (newTimezone: string) => {
    if (!user) return;
    setSavingTimezone(true);
    setTimezone(newTimezone);
    
    const { error } = await supabase
      .from('user_preferences')
      .upsert({
        user_id: user.id,
        timezone: newTimezone,
      }, { onConflict: 'user_id' });
    
    if (error) {
      console.error('Error saving timezone:', error);
      toast.error('Erro ao salvar fuso horário.');
    } else {
      toast.success('Fuso horário atualizado!');
    }
    setSavingTimezone(false);
  };

  const getRoleLabel = () => {
    switch (userRole) {
      case 'master_admin':
        return 'Master Admin';
      case 'admin':
        return 'Administrador';
      case 'collaborator':
        return 'Colaborador';
      case 'client':
        return 'Cliente';
      default:
        return 'Usuário';
    }
  };

  const getRoleBadgeVariant = () => {
    switch (userRole) {
      case 'master_admin':
        return 'default' as const;
      case 'admin':
        return 'secondary' as const;
      default:
        return 'outline' as const;
    }
  };

  const getUserInitials = () => {
    if (fullName) {
      const names = fullName.split(' ');
      if (names.length >= 2) {
        return (names[0][0] + names[names.length - 1][0]).toUpperCase();
      }
      return fullName.substring(0, 2).toUpperCase();
    }
    if (user?.email) {
      return user.email.charAt(0).toUpperCase();
    }
    return 'U';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Preferências" 
        description="Gerencie suas informações pessoais e configurações"
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className={`grid w-full ${isMasterAdmin ? 'grid-cols-4' : 'grid-cols-3'}`}>
          <TabsTrigger value="profile" className="flex items-center gap-1.5">
            <User className="w-4 h-4" />
            <span className="hidden sm:inline">Perfil</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-1.5">
            <Lock className="w-4 h-4" />
            <span className="hidden sm:inline">Segurança</span>
          </TabsTrigger>
          <TabsTrigger value="preferences" className="flex items-center gap-1.5">
            <Globe className="w-4 h-4" />
            <span className="hidden sm:inline">Preferências</span>
          </TabsTrigger>
          {isMasterAdmin && (
            <TabsTrigger value="theme" className="flex items-center gap-1.5">
              <Palette className="w-4 h-4" />
              <span className="hidden sm:inline">Tema</span>
            </TabsTrigger>
          )}
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Informações Pessoais
              </CardTitle>
              <CardDescription>
                Atualize suas informações de perfil
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Avatar upload section */}
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="relative group">
                  <Avatar className="h-20 w-20 sm:h-24 sm:w-24">
                    <AvatarImage src={avatarUrl || undefined} alt="Avatar" />
                    <AvatarFallback className="text-xl sm:text-2xl bg-primary/10 text-primary">
                      {getUserInitials()}
                    </AvatarFallback>
                  </Avatar>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingAvatar}
                    className="absolute inset-0 flex items-center justify-center rounded-full bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer disabled:cursor-not-allowed"
                  >
                    {uploadingAvatar ? (
                      <Loader2 className="h-6 w-6 animate-spin text-foreground" />
                    ) : (
                      <Camera className="h-6 w-6 text-foreground" />
                    )}
                  </button>
                </div>
                <div className="text-center sm:text-left space-y-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingAvatar}
                  >
                    {uploadingAvatar ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Alterar foto
                      </>
                    )}
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    JPG, PNG ou GIF. Máximo 2MB.
                  </p>
                </div>
              </div>

              {/* Profile form */}
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Nome Completo</Label>
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Seu nome completo"
                    disabled={savingProfile}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    value={user?.email || ''}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground">
                    O email não pode ser alterado
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label>Função</Label>
                  <div>
                    <Badge variant={getRoleBadgeVariant()} className="text-sm">
                      {isMasterAdmin && <Shield className="w-3 h-3 mr-1" />}
                      {isAdmin && !isMasterAdmin && <UserCog className="w-3 h-3 mr-1" />}
                      {getRoleLabel()}
                    </Badge>
                  </div>
                </div>
                
                <Button type="submit" disabled={savingProfile}>
                  {savingProfile ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Salvar Alterações
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="w-5 h-5" />
                Segurança
              </CardTitle>
              <CardDescription>
                Altere sua senha de acesso
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="newPassword">Nova Senha</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    disabled={savingPassword}
                    minLength={6}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repita a nova senha"
                    disabled={savingPassword}
                    minLength={6}
                    required
                  />
                </div>
                
                <Button type="submit" disabled={savingPassword}>
                  {savingPassword ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Alterando...
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4 mr-2" />
                      Alterar Senha
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Preferences Tab */}
        <TabsContent value="preferences">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-muted-foreground" />
                <div>
                  <CardTitle>Preferências Pessoais</CardTitle>
                  <CardDescription>Configure seu fuso horário para registro de horas</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="max-w-sm">
                <Label htmlFor="timezone">Fuso Horário</Label>
                <Select 
                  value={timezone} 
                  onValueChange={handleSaveTimezone}
                  disabled={savingTimezone}
                >
                  <SelectTrigger id="timezone" className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {WORLD_TIMEZONES.map((group) => (
                      <SelectGroup key={group.region}>
                        <SelectLabel>{group.region}</SelectLabel>
                        {group.zones.map((tz) => (
                          <SelectItem key={tz.value} value={tz.value}>
                            {tz.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Theme Tab (Master Admin only) */}
        {isMasterAdmin && (
          <TabsContent value="theme">
            <ThemeSettings />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};
