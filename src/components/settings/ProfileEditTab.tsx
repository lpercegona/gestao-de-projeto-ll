import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { WysiwygEditor } from '@/components/ui/wysiwyg-editor';
import { formatHours } from '@/lib/formatHours';
import {
  Loader2,
  Save,
  Lock,
  User,
  Camera,
  Upload,
  Building2,
  FileText,
  Paperclip,
  Download,
  CalendarClock,
} from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';

interface IdentityAttachment {
  name: string;
  url: string;
  created_at: string;
}

interface CompanyDraft {
  name: string;
  company: string;
  email: string;
  phone: string;
  contract_type: 'one_time' | 'monthly';
  contracted_hours: number;
  contract_start_date: string;
  contract_end_date: string;
}

export const ProfileEditTab: React.FC = () => {
  const { user, isClient } = useAuth();
  const { data } = useData();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('profile');

  const [fullName, setFullName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [identityGuidelines, setIdentityGuidelines] = useState('');
  const [identityAttachments, setIdentityAttachments] = useState<IdentityAttachment[]>([]);
  const [savingIdentity, setSavingIdentity] = useState(false);
  const [uploadingIdentityFile, setUploadingIdentityFile] = useState(false);
  const identityFileInputRef = useRef<HTMLInputElement>(null);

  const [companyDraft, setCompanyDraft] = useState<CompanyDraft>({
    name: '',
    company: '',
    email: '',
    phone: '',
    contract_type: 'one_time',
    contracted_hours: 0,
    contract_start_date: '',
    contract_end_date: '',
  });
  const [editingField, setEditingField] = useState<keyof CompanyDraft | null>(null);
  const [savingCompany, setSavingCompany] = useState(false);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  const client = data.clients[0];

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

  useEffect(() => {
    if (!client) return;

    setIdentityGuidelines((client as { identity_guidelines?: string | null }).identity_guidelines || '');
    setIdentityAttachments((client as { identity_attachments?: IdentityAttachment[] | null }).identity_attachments || []);
    setCompanyDraft({
      name: client.name || '',
      company: client.company || '',
      email: client.email || '',
      phone: client.phone || '',
      contract_type: client.contract_type === 'monthly' ? 'monthly' : 'one_time',
      contracted_hours: Number(client.contracted_hours || 0),
      contract_start_date: client.contract_start_date || '',
      contract_end_date: client.contract_end_date || '',
    });
  }, [client]);

  const companyDirty = !!client && (
    companyDraft.name !== (client.name || '') ||
    companyDraft.company !== (client.company || '') ||
    companyDraft.email !== (client.email || '') ||
    companyDraft.phone !== (client.phone || '')
  );

  const handleSaveCompany = async () => {
    if (!client) return;

    setSavingCompany(true);
    try {
      const { error } = await supabase.rpc('update_client_company_settings', {
        p_client_id: client.id,
        p_name: companyDraft.name,
        p_company: companyDraft.company || null,
        p_email: companyDraft.email,
        p_phone: companyDraft.phone || null,
        p_contract_type: companyDraft.contract_type,
        p_contracted_hours: Number(companyDraft.contracted_hours || 0),
        p_contract_start_date: companyDraft.contract_start_date || null,
        p_contract_end_date: companyDraft.contract_end_date || null,
      });

      if (error) throw error;
      setEditingField(null);
      toast.success('Informações da empresa atualizadas com sucesso!');
    } catch (err) {
      const error = err as Error;
      toast.error(error.message || 'Erro ao salvar informações da empresa');
    } finally {
      setSavingCompany(false);
    }
  };

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

      const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);
      const urlWithCacheBuster = `${publicUrl}?t=${Date.now()}`;

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: urlWithCacheBuster })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      setAvatarUrl(urlWithCacheBuster);
      toast.success('Foto de perfil atualizada com sucesso!');
    } catch (err) {
      const error = err as Error;
      console.error('Error uploading avatar:', error);
      toast.error('Erro ao fazer upload da foto: ' + (error.message || 'Erro desconhecido'));
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSavingProfile(true);
    try {
      const { error } = await supabase.from('profiles').update({ full_name: fullName.trim() }).eq('user_id', user.id);
      if (error) toast.error('Erro ao salvar perfil: ' + error.message);
      else toast.success('Perfil atualizado com sucesso!');
    } catch {
      toast.error('Erro ao salvar perfil.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleIdentityUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !client || !user) return;

    setUploadingIdentityFile(true);
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const filePath = `${client.id}/${Date.now()}-${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from('client-identity-files')
        .upload(filePath, file, { upsert: false });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('client-identity-files').getPublicUrl(filePath);

      const nextAttachments = [{ name: file.name, url: publicUrl, created_at: new Date().toISOString() }, ...identityAttachments];
      setIdentityAttachments(nextAttachments);

      const { error: updateError } = await supabase.rpc('update_client_identity_settings', {
        p_client_id: client.id,
        p_identity_guidelines: identityGuidelines,
        p_identity_attachments: nextAttachments,
      });

      if (updateError) throw updateError;
      toast.success('Anexo enviado com sucesso!');
    } catch (err) {
      const error = err as Error;
      console.error('Error uploading identity file:', error);
      toast.error(error.message || 'Erro ao enviar anexo');
    } finally {
      setUploadingIdentityFile(false);
      if (identityFileInputRef.current) identityFileInputRef.current.value = '';
    }
  };

  const handleSaveIdentity = async () => {
    if (!client) return;

    setSavingIdentity(true);
    try {
      const { error } = await supabase.rpc('update_client_identity_settings', {
        p_client_id: client.id,
        p_identity_guidelines: identityGuidelines,
        p_identity_attachments: identityAttachments,
      });
      if (error) throw error;
      toast.success('Definições de identidade atualizadas com sucesso!');
    } catch (err) {
      const error = err as Error;
      toast.error(error.message || 'Erro ao salvar definições de identidade');
    } finally {
      setSavingIdentity(false);
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
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) toast.error('Erro ao alterar senha: ' + error.message);
      else {
        toast.success('Senha alterada com sucesso!');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch {
      toast.error('Erro ao alterar senha.');
    } finally {
      setSavingPassword(false);
    }
  };

  const getUserInitials = () => {
    if (fullName) {
      const names = fullName.split(' ');
      if (names.length >= 2) return (names[0][0] + names[names.length - 1][0]).toUpperCase();
      return fullName.substring(0, 2).toUpperCase();
    }
    if (user?.email) return user.email.charAt(0).toUpperCase();
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
      <TabsList className={`grid w-full ${isClient ? 'grid-cols-3' : 'grid-cols-2'}`}>
        <TabsTrigger value="profile" className="flex items-center gap-1.5"><User className="w-4 h-4" /><span>Perfil</span></TabsTrigger>
        <TabsTrigger value="security" className="flex items-center gap-1.5"><Lock className="w-4 h-4" /><span>Segurança</span></TabsTrigger>
        {isClient && (
          <TabsTrigger value="company" className="flex items-center gap-1.5"><Building2 className="w-4 h-4" /><span>Empresa</span></TabsTrigger>
        )}
      </TabsList>

      <TabsContent value="profile">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><User className="w-5 h-5" />Informações Pessoais</CardTitle>
            <CardDescription>Atualize suas informações de perfil</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="relative group">
                <Avatar className="h-20 w-20 sm:h-24 sm:w-24">
                  <AvatarImage src={avatarUrl || undefined} alt="Avatar" />
                  <AvatarFallback className="text-xl sm:text-2xl bg-primary/10 text-primary">{getUserInitials()}</AvatarFallback>
                </Avatar>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="absolute inset-0 flex items-center justify-center rounded-full bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer disabled:cursor-not-allowed"
                >
                  {uploadingAvatar ? <Loader2 className="h-6 w-6 animate-spin text-foreground" /> : <Camera className="h-6 w-6 text-foreground" />}
                </button>
              </div>
              <div className="text-center sm:text-left space-y-2">
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
                <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploadingAvatar}>
                  {uploadingAvatar ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" />Enviando...</>) : (<><Upload className="w-4 h-4 mr-2" />Alterar foto</>)}
                </Button>
                <p className="text-xs text-muted-foreground">JPG, PNG ou GIF. Máximo 2MB.</p>
              </div>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Nome Completo</Label>
                <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Seu nome completo" disabled={savingProfile} />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={user?.email || ''} disabled className="bg-muted" />
                <p className="text-xs text-muted-foreground">O email não pode ser alterado</p>
              </div>
              <Button type="submit" disabled={savingProfile}>
                {savingProfile ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" />Salvando...</>) : (<><Save className="w-4 h-4 mr-2" />Salvar Alterações</>)}
              </Button>
            </form>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="security">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Lock className="w-5 h-5" />Segurança</CardTitle>
            <CardDescription>Altere sua senha de acesso</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword">Nova Senha</Label>
                <Input id="newPassword" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Mínimo 6 caracteres" disabled={savingPassword} minLength={6} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
                <Input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Repita a nova senha" disabled={savingPassword} minLength={6} required />
              </div>
              <Button type="submit" disabled={savingPassword}>
                {savingPassword ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" />Alterando...</>) : (<><Lock className="w-4 h-4 mr-2" />Alterar Senha</>)}
              </Button>
            </form>
          </CardContent>
        </Card>
      </TabsContent>

      {isClient && (
        <TabsContent value="company" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Building2 className="w-5 h-5" />Informações da Empresa</CardTitle>
              <CardDescription>Clique em um campo para editar inline, sem abrir modal.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                <div>
                  <p className="text-xs text-muted-foreground">Empresa</p>
                  {editingField === 'company' ? (
                    <Input autoFocus value={companyDraft.company} onChange={(e) => setCompanyDraft((prev) => ({ ...prev, company: e.target.value }))} onBlur={() => setEditingField(null)} />
                  ) : (
                    <button
                      type="button"
                      onClick={() => setEditingField('company')}
                      className="w-full truncate text-sm font-medium text-left hover:underline"
                      title={companyDraft.company || '-'}
                    >
                      {companyDraft.company || '-'}
                    </button>
                  )}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Contato</p>
                  {editingField === 'name' ? (
                    <Input autoFocus value={companyDraft.name} onChange={(e) => setCompanyDraft((prev) => ({ ...prev, name: e.target.value }))} onBlur={() => setEditingField(null)} />
                  ) : (
                    <button
                      type="button"
                      onClick={() => setEditingField('name')}
                      className="w-full truncate text-sm font-medium text-left hover:underline"
                      title={companyDraft.name || '-'}
                    >
                      {companyDraft.name || '-'}
                    </button>
                  )}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  {editingField === 'email' ? (
                    <Input autoFocus type="email" value={companyDraft.email} onChange={(e) => setCompanyDraft((prev) => ({ ...prev, email: e.target.value }))} onBlur={() => setEditingField(null)} />
                  ) : (
                    <button
                      type="button"
                      onClick={() => setEditingField('email')}
                      className="w-full truncate text-sm font-medium text-left hover:underline"
                      title={companyDraft.email || '-'}
                    >
                      {companyDraft.email || '-'}
                    </button>
                  )}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Telefone</p>
                  {editingField === 'phone' ? (
                    <Input autoFocus value={companyDraft.phone} onChange={(e) => setCompanyDraft((prev) => ({ ...prev, phone: e.target.value }))} onBlur={() => setEditingField(null)} />
                  ) : (
                    <button
                      type="button"
                      onClick={() => setEditingField('phone')}
                      className="w-full truncate text-sm font-medium text-left hover:underline"
                      title={companyDraft.phone || '-'}
                    >
                      {companyDraft.phone || '-'}
                    </button>
                  )}
                </div>
              </div>

              {companyDirty && (
                <Button type="button" onClick={handleSaveCompany} disabled={savingCompany}>
                  {savingCompany ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" />Salvando...</>) : (<><Save className="w-4 h-4 mr-2" />Salvar informações da empresa</>)}
                </Button>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><CalendarClock className="w-5 h-5" />Informações de Contrato</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                <div>
                  <p className="text-xs text-muted-foreground">Tipo de contrato</p>
                  <p className="text-sm font-medium">{companyDraft.contract_type === 'monthly' ? 'Mensal' : 'Único'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Horas contratadas</p>
                  <p className="text-sm font-medium">{formatHours(companyDraft.contracted_hours || 0)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Início</p>
                  <p className="text-sm font-medium">{companyDraft.contract_start_date ? format(parseISO(companyDraft.contract_start_date), 'dd/MM/yyyy') : 'Não definido'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Término</p>
                  <p className="text-sm font-medium">{companyDraft.contract_end_date ? format(parseISO(companyDraft.contract_end_date), 'dd/MM/yyyy') : 'Não definido'}</p>
                </div>
              </div>

              <Button type="button" variant="outline">
                {companyDraft.contract_type === 'monthly' ? 'Contratar mais horas' : 'Contratar novo serviço'}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><FileText className="w-5 h-5" />Definições de Identidade</CardTitle>
              <CardDescription>Descreva diretrizes de identidade da empresa e anexe materiais necessários.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Diretrizes de identidade</Label>
                <WysiwygEditor value={identityGuidelines} onChange={setIdentityGuidelines} placeholder="Ex.: tom de voz, diretrizes visuais, referências de marca, restrições e orientações gerais." minHeight="140px" />
              </div>

              <div className="space-y-2">
                <Label>Anexos</Label>
                <div className="flex items-center gap-2">
                  <input ref={identityFileInputRef} type="file" className="hidden" onChange={handleIdentityUpload} />
                  <Button type="button" variant="outline" onClick={() => identityFileInputRef.current?.click()} disabled={uploadingIdentityFile}>
                    {uploadingIdentityFile ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" />Enviando anexo...</>) : (<><Paperclip className="w-4 h-4 mr-2" />Adicionar anexo</>)}
                  </Button>
                </div>

                {identityAttachments.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum anexo enviado.</p>
                ) : (
                  <div className="space-y-2">
                    {identityAttachments.map((attachment) => (
                      <a key={`${attachment.url}-${attachment.created_at}`} href={attachment.url} target="_blank" rel="noreferrer" className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/40 transition-colors">
                        <div>
                          <p className="text-sm font-medium text-foreground">{attachment.name}</p>
                          <p className="text-xs text-muted-foreground">{format(parseISO(attachment.created_at), 'dd/MM/yyyy HH:mm')}</p>
                        </div>
                        <Download className="w-4 h-4 text-muted-foreground" />
                      </a>
                    ))}
                  </div>
                )}
              </div>

              <Button type="button" onClick={handleSaveIdentity} disabled={savingIdentity}>
                {savingIdentity ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" />Salvando...</>) : (<><Save className="w-4 h-4 mr-2" />Salvar definições da empresa</>)}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      )}
    </Tabs>
  );
};
