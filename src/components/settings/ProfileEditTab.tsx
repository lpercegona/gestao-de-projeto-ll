import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { WysiwygEditor } from '@/components/ui/wysiwyg-editor';
import { formatHours } from '@/lib/formatHours';
import {
  Loader2,
  Save,
  User,
  Camera,
  Upload,
  Building2,
  FileText,
  Paperclip,
  Download,
  CalendarClock,
  Globe,
  ImagePlus,
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

  const [fullName, setFullName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [adminCnpj, setAdminCnpj] = useState('');
  const [adminCpf, setAdminCpf] = useState('');
  const [adminCompanyName, setAdminCompanyName] = useState('');
  const [adminCompanyAddress, setAdminCompanyAddress] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverFileInputRef = useRef<HTMLInputElement>(null);

  // Public profile state
  const [publicProfileEnabled, setPublicProfileEnabled] = useState(false);
  const [publicProfileSlug, setPublicProfileSlug] = useState('');
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [uploadingCover, setUploadingCover] = useState(false);

  const [identityGuidelines, setIdentityGuidelines] = useState('');
  const [identityAttachments, setIdentityAttachments] = useState<IdentityAttachment[]>([]);
  const [savingIdentity, setSavingIdentity] = useState(false);
  const [uploadingIdentityFile, setUploadingIdentityFile] = useState(false);
  const identityFileInputRef = useRef<HTMLInputElement>(null);

  const [companyDraft, setCompanyDraft] = useState<CompanyDraft>({
    name: '', company: '', email: '', phone: '',
    contract_type: 'one_time', contracted_hours: 0,
    contract_start_date: '', contract_end_date: '',
  });
  const [editingField, setEditingField] = useState<keyof CompanyDraft | null>(null);
  const [savingCompany, setSavingCompany] = useState(false);

  const client = data.clients[0];

  useEffect(() => {
    const loadData = async () => {
      if (!user) { setLoading(false); return; }
      try {
        const { data: extProfile } = await supabase
          .from('profiles').select('*').eq('user_id', user.id).maybeSingle();
        if (extProfile) {
          setFullName(extProfile.full_name || '');
          setAvatarUrl(extProfile.avatar_url || null);
          setAdminCnpj((extProfile as any)?.cnpj || '');
          setAdminCpf((extProfile as any)?.cpf || '');
          setAdminCompanyName((extProfile as any)?.company_name || '');
          setAdminCompanyAddress((extProfile as any)?.company_address || '');
          setPublicProfileEnabled((extProfile as any)?.public_profile_enabled || false);
          setPublicProfileSlug((extProfile as any)?.public_profile_slug || '');
          setCoverUrl((extProfile as any)?.cover_url || null);
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
      name: client.name || '', company: client.company || '',
      email: client.email || '', phone: client.phone || '',
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
      const { error } = await supabase.rpc('update_client_company_settings' as any, {
        p_client_id: client.id, p_name: companyDraft.name,
        p_company: companyDraft.company || null, p_email: companyDraft.email,
        p_phone: companyDraft.phone || null, p_contract_type: companyDraft.contract_type,
        p_contracted_hours: Number(companyDraft.contracted_hours || 0),
        p_contract_start_date: companyDraft.contract_start_date || null,
        p_contract_end_date: companyDraft.contract_end_date || null,
      });
      if (error) throw error;
      setEditingField(null);
      toast.success('Informações da empresa atualizadas!');
    } catch (err) {
      toast.error((err as Error).message || 'Erro ao salvar');
    } finally {
      setSavingCompany(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (!file.type.startsWith('image/')) { toast.error('Selecione uma imagem válida.'); return; }
    if (file.size > 2 * 1024 * 1024) { toast.error('Máximo 2MB.'); return; }
    setUploadingAvatar(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/avatar.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);
      const urlWithCacheBuster = `${publicUrl}?t=${Date.now()}`;
      const { error: updateError } = await supabase.from('profiles').update({ avatar_url: urlWithCacheBuster }).eq('user_id', user.id);
      if (updateError) throw updateError;
      setAvatarUrl(urlWithCacheBuster);
      toast.success('Foto atualizada!');
    } catch (err) {
      toast.error('Erro ao fazer upload da foto');
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
      const updateData: Record<string, unknown> = { full_name: fullName.trim() };
      if (!isClient) {
        updateData.cnpj = adminCnpj || null;
        updateData.cpf = adminCpf || null;
        updateData.company_name = adminCompanyName || null;
        updateData.company_address = adminCompanyAddress || null;
        updateData.public_profile_enabled = publicProfileEnabled;
        updateData.public_profile_slug = publicProfileSlug.trim() || null;
        updateData.cover_url = coverUrl || null;
      }
      const { error } = await supabase.from('profiles').update(updateData as any).eq('user_id', user.id);
      if (error) toast.error('Erro ao salvar perfil: ' + error.message);
      else toast.success('Perfil atualizado!');
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
      const { error: uploadError } = await supabase.storage.from('client-identity-files').upload(filePath, file, { upsert: false });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('client-identity-files').getPublicUrl(filePath);
      const nextAttachments = [{ name: file.name, url: publicUrl, created_at: new Date().toISOString() }, ...identityAttachments];
      setIdentityAttachments(nextAttachments);
      const { error: updateError } = await supabase.rpc('update_client_identity_settings' as any, {
        p_client_id: client.id, p_identity_guidelines: identityGuidelines,
        p_identity_attachments: nextAttachments as unknown as Json,
      });
      if (updateError) throw updateError;
      toast.success('Anexo enviado!');
    } catch (err) {
      toast.error((err as Error).message || 'Erro ao enviar anexo');
    } finally {
      setUploadingIdentityFile(false);
      if (identityFileInputRef.current) identityFileInputRef.current.value = '';
    }
  };

  const handleSaveIdentity = async () => {
    if (!client) return;
    setSavingIdentity(true);
    try {
      const { error } = await supabase.rpc('update_client_identity_settings' as any, {
        p_client_id: client.id, p_identity_guidelines: identityGuidelines,
        p_identity_attachments: identityAttachments as unknown as Json,
      });
      if (error) throw error;
      toast.success('Definições de identidade atualizadas!');
    } catch (err) {
      toast.error((err as Error).message || 'Erro ao salvar');
    } finally {
      setSavingIdentity(false);
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

  if (loading) return <div className="flex items-center justify-center h-32"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-4">
      {/* Informações Pessoais */}
      <div>
        <h3 className="text-sm font-medium text-foreground">Informações Pessoais</h3>
        <p className="text-xs text-muted-foreground mt-0.5">Atualize suas informações de perfil</p>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative group">
          <Avatar className="h-14 w-14">
            <AvatarImage src={avatarUrl || undefined} alt="Avatar" />
            <AvatarFallback className="text-sm bg-primary/10 text-primary">{getUserInitials()}</AvatarFallback>
          </Avatar>
          <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploadingAvatar}
            className="absolute inset-0 flex items-center justify-center rounded-full bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer disabled:cursor-not-allowed">
            {uploadingAvatar ? <Loader2 className="h-4 w-4 animate-spin text-foreground" /> : <Camera className="h-4 w-4 text-foreground" />}
          </button>
        </div>
        <div>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
          <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploadingAvatar} className="h-7 text-xs">
            {uploadingAvatar ? (<><Loader2 className="w-3 h-3 mr-1 animate-spin" />Enviando...</>) : (<><Upload className="w-3 h-3 mr-1" />Alterar foto</>)}
          </Button>
          <p className="text-[10px] text-muted-foreground mt-0.5">JPG, PNG ou GIF. Máx 2MB.</p>
        </div>
      </div>

      <form onSubmit={handleSaveProfile} className="space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label htmlFor="fullName" className="text-xs">Nome Completo</Label>
            <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Seu nome" disabled={savingProfile} className="h-8 text-xs" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Email</Label>
            <Input value={user?.email || ''} disabled className="bg-muted h-8 text-xs" />
          </div>
        </div>

        {/* Informações Fiscais — admin/collaborator only */}
        {!isClient && (
          <>
            <Separator className="my-3" />
            <div>
              <h3 className="text-sm font-medium text-foreground flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5" />Informações Fiscais
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">Dados da empresa e responsável</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor="adminCompanyName" className="text-xs">Nome da Empresa</Label>
                <Input id="adminCompanyName" value={adminCompanyName} onChange={(e) => setAdminCompanyName(e.target.value)} placeholder="Razão social" disabled={savingProfile} className="h-8 text-xs" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="adminCnpj" className="text-xs">CNPJ</Label>
                <Input id="adminCnpj" value={adminCnpj} onChange={(e) => setAdminCnpj(e.target.value)} placeholder="00.000.000/0000-00" disabled={savingProfile} className="h-8 text-xs" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="adminCpf" className="text-xs">CPF do Responsável</Label>
                <Input id="adminCpf" value={adminCpf} onChange={(e) => setAdminCpf(e.target.value)} placeholder="000.000.000-00" disabled={savingProfile} className="h-8 text-xs" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="adminCompanyAddress" className="text-xs">Endereço da Empresa</Label>
                <Input id="adminCompanyAddress" value={adminCompanyAddress} onChange={(e) => setAdminCompanyAddress(e.target.value)} placeholder="Endereço completo" disabled={savingProfile} className="h-8 text-xs" />
              </div>
            </div>
          </>
        )}

        <Button type="submit" size="sm" disabled={savingProfile} className="mt-1">
          {savingProfile ? (<><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Salvando...</>) : (<><Save className="w-3.5 h-3.5 mr-1.5" />Salvar Alterações</>)}
        </Button>
      </form>

      {/* Client-specific: Company info */}
      {isClient && client && (
        <>
          <Separator className="my-3" />
          <div>
            <h3 className="text-sm font-medium text-foreground flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5" />Informações da Empresa
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">Clique em um campo para editar</p>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            {(['company', 'name', 'email', 'phone'] as const).map((field) => {
              const labels: Record<string, string> = { company: 'Empresa', name: 'Contato', email: 'Email', phone: 'Telefone' };
              return (
                <div key={field}>
                  <p className="text-[10px] text-muted-foreground">{labels[field]}</p>
                  {editingField === field ? (
                    <Input autoFocus value={companyDraft[field]} onChange={(e) => setCompanyDraft((prev) => ({ ...prev, [field]: e.target.value }))} onBlur={() => setEditingField(null)} className="h-7 text-xs" />
                  ) : (
                    <button type="button" onClick={() => setEditingField(field)} className="w-full truncate text-xs font-medium text-left hover:underline">
                      {companyDraft[field] || '-'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          {companyDirty && (
            <Button type="button" size="sm" onClick={handleSaveCompany} disabled={savingCompany}>
              {savingCompany ? (<><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Salvando...</>) : (<><Save className="w-3.5 h-3.5 mr-1.5" />Salvar</>)}
            </Button>
          )}

          <Separator className="my-3" />
          <div>
            <h3 className="text-sm font-medium text-foreground flex items-center gap-1.5">
              <CalendarClock className="w-3.5 h-3.5" />Contrato
            </h3>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            <div>
              <p className="text-[10px] text-muted-foreground">Tipo</p>
              <p className="text-xs font-medium">{companyDraft.contract_type === 'monthly' ? 'Mensal' : 'Único'}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">Horas contratadas</p>
              <p className="text-xs font-medium">{formatHours(companyDraft.contracted_hours || 0)}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">Início</p>
              <p className="text-xs font-medium">{companyDraft.contract_start_date ? format(parseISO(companyDraft.contract_start_date), 'dd/MM/yyyy') : '-'}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">Término</p>
              <p className="text-xs font-medium">{companyDraft.contract_end_date ? format(parseISO(companyDraft.contract_end_date), 'dd/MM/yyyy') : '-'}</p>
            </div>
          </div>

          <Separator className="my-3" />
          <div>
            <h3 className="text-sm font-medium text-foreground flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" />Identidade
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">Diretrizes e materiais de marca</p>
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Diretrizes</Label>
            <WysiwygEditor value={identityGuidelines} onChange={setIdentityGuidelines} placeholder="Tom de voz, referências visuais..." minHeight="100px" />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <input ref={identityFileInputRef} type="file" className="hidden" onChange={handleIdentityUpload} />
              <Button type="button" variant="outline" size="sm" onClick={() => identityFileInputRef.current?.click()} disabled={uploadingIdentityFile} className="h-7 text-xs">
                {uploadingIdentityFile ? (<><Loader2 className="w-3 h-3 mr-1 animate-spin" />Enviando...</>) : (<><Paperclip className="w-3 h-3 mr-1" />Anexar</>)}
              </Button>
            </div>
            {identityAttachments.length > 0 && (
              <div className="space-y-1">
                {identityAttachments.map((att) => (
                  <a key={`${att.url}-${att.created_at}`} href={att.url} target="_blank" rel="noreferrer" className="flex items-center justify-between p-2 rounded-md border text-xs hover:bg-muted/40 transition-colors">
                    <div>
                      <p className="font-medium text-foreground">{att.name}</p>
                      <p className="text-[10px] text-muted-foreground">{format(parseISO(att.created_at), 'dd/MM/yyyy HH:mm')}</p>
                    </div>
                    <Download className="w-3.5 h-3.5 text-muted-foreground" />
                  </a>
                ))}
              </div>
            )}
          </div>
          <Button type="button" size="sm" onClick={handleSaveIdentity} disabled={savingIdentity}>
            {savingIdentity ? (<><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Salvando...</>) : (<><Save className="w-3.5 h-3.5 mr-1.5" />Salvar identidade</>)}
          </Button>
        </>
      )}
    </div>
  );
};
