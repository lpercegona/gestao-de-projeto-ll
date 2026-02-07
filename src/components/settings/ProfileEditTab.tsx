import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Loader2, 
  Save, 
  Lock, 
  User, 
  Shield, 
  UserCog, 
  Camera, 
  Upload 
} from 'lucide-react';
import { toast } from 'sonner';

export const ProfileEditTab: React.FC = () => {
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

  useEffect(() => {
    const loadData = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, avatar_url')
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (profile) {
          setFullName(profile.full_name || '');
          setAvatarUrl(profile.avatar_url || null);
        }
      } catch (err) {
        console.error('Error loading profile:', err);
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
    <Tabs value={activeTab} onValueChange={setActiveTab}>
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="profile" className="flex items-center gap-1.5">
          <User className="w-4 h-4" />
          <span className="hidden sm:inline">Perfil</span>
        </TabsTrigger>
        <TabsTrigger value="security" className="flex items-center gap-1.5">
          <Lock className="w-4 h-4" />
          <span className="hidden sm:inline">Segurança</span>
        </TabsTrigger>
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
    </Tabs>
  );
};
