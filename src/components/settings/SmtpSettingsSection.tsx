import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Save, CheckCircle2, XCircle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface SmtpSettings {
  id?: string;
  smtp_host: string;
  smtp_port: number;
  smtp_user: string;
  smtp_pass: string;
  smtp_from_name: string;
}

export const SmtpSettingsSection: React.FC = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<SmtpSettings>({
    smtp_host: '',
    smtp_port: 587,
    smtp_user: '',
    smtp_pass: '',
    smtp_from_name: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'connected' | 'error'>('unknown');
  const [existingId, setExistingId] = useState<string | null>(null);

  useEffect(() => {
    if (user) fetchSettings();
  }, [user]);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      // Fetch global SMTP settings (owner_id IS NULL)
      const { data, error } = await supabase
        .from('smtp_settings')
        .select('*')
        .is('owner_id', null)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setExistingId(data.id);
        setSettings({
          smtp_host: (data as any).smtp_host || '',
          smtp_port: (data as any).smtp_port || 587,
          smtp_user: (data as any).smtp_user || '',
          smtp_pass: (data as any).smtp_pass || '',
          smtp_from_name: (data as any).smtp_from_name || '',
        });
        if ((data as any).smtp_host) {
          setConnectionStatus('connected');
        }
      }
    } catch (err) {
      console.error('Error fetching SMTP settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (existingId) {
        const { error } = await supabase
          .from('smtp_settings')
          .update({
            smtp_host: settings.smtp_host,
            smtp_port: settings.smtp_port,
            smtp_user: settings.smtp_user,
            smtp_pass: settings.smtp_pass,
            smtp_from_name: settings.smtp_from_name,
          } as any)
          .eq('id', existingId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('smtp_settings')
          .insert({
            owner_id: null,
            smtp_host: settings.smtp_host,
            smtp_port: settings.smtp_port,
            smtp_user: settings.smtp_user,
            smtp_pass: settings.smtp_pass,
            smtp_from_name: settings.smtp_from_name,
          } as any)
          .select('id')
          .single();
        if (error) throw error;
        setExistingId(data.id);
      }
      toast.success('Credenciais SMTP salvas!');
      setConnectionStatus(settings.smtp_host ? 'connected' : 'unknown');
    } catch (err) {
      console.error('Error saving SMTP settings:', err);
      toast.error('Erro ao salvar credenciais');
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    if (!settings.smtp_host || !settings.smtp_user) {
      toast.error('Preencha host e usuário SMTP antes de testar');
      return;
    }
    setTesting(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const response = await supabase.functions.invoke('test-smtp-connection', {
        body: {
          smtp_host: settings.smtp_host,
          smtp_port: settings.smtp_port,
          smtp_user: settings.smtp_user,
          smtp_pass: settings.smtp_pass,
        },
        headers: {
          Authorization: `Bearer ${session.session?.access_token}`,
        },
      });

      if (response.error) throw response.error;
      const result = response.data;
      if (result?.success) {
        setConnectionStatus('connected');
        toast.success('Conexão SMTP validada com sucesso!');
      } else {
        setConnectionStatus('error');
        toast.error(result?.error || 'Falha na conexão SMTP');
      }
    } catch (err: any) {
      console.error('SMTP test error:', err);
      setConnectionStatus('error');
      toast.error('Erro ao testar conexão SMTP');
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-6 flex justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">Credenciais SMTP</CardTitle>
            <CardDescription>
              Configure as credenciais SMTP padrão da plataforma. Essas credenciais serão herdadas por todos os administradores; apenas o nome do remetente pode ser personalizado por admin.
            </CardDescription>
          </div>
          {connectionStatus === 'connected' && settings.smtp_host && (
            <Badge variant="outline" className="gap-1 shrink-0">
              <CheckCircle2 className="w-3 h-3 text-green-600" />
              Conectado: {settings.smtp_host}
            </Badge>
          )}
          {connectionStatus === 'error' && (
            <Badge variant="destructive" className="gap-1 shrink-0">
              <XCircle className="w-3 h-3" />
              Falha na conexão
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Host SMTP</Label>
            <Input
              value={settings.smtp_host}
              onChange={(e) => setSettings({ ...settings, smtp_host: e.target.value })}
              placeholder="mail.dominio.com"
            />
          </div>
          <div className="space-y-2">
            <Label>Porta</Label>
            <Input
              type="number"
              value={settings.smtp_port}
              onChange={(e) => setSettings({ ...settings, smtp_port: Number(e.target.value) })}
              placeholder="587"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Usuário / Email</Label>
            <Input
              value={settings.smtp_user}
              onChange={(e) => setSettings({ ...settings, smtp_user: e.target.value })}
              placeholder="usuario@dominio.com"
            />
          </div>
          <div className="space-y-2">
            <Label>Senha</Label>
            <Input
              type="password"
              value={settings.smtp_pass}
              onChange={(e) => setSettings({ ...settings, smtp_pass: e.target.value })}
              placeholder="••••••••"
            />
          </div>
        </div>
        <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:items-center sm:justify-between">
          <Button className="w-full sm:w-auto" variant="outline" size="sm" onClick={handleTestConnection} disabled={testing}>
            {testing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
            Testar Conexão
          </Button>
          <Button className="w-full sm:w-auto" size="sm" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Salvar Credenciais
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
