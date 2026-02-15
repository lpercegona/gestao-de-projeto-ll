import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';

export const SenderNameSection: React.FC = () => {
  const { user } = useAuth();
  const [fromName, setFromName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [existingId, setExistingId] = useState<string | null>(null);

  useEffect(() => {
    if (user) fetchSenderName();
  }, [user]);

  const fetchSenderName = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('smtp_settings')
        .select('*')
        .eq('owner_id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setExistingId(data.id);
        setFromName((data as any).smtp_from_name || '');
      }
    } catch (err) {
      console.error('Error fetching sender name:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      if (existingId) {
        const { error } = await supabase
          .from('smtp_settings')
          .update({ smtp_from_name: fromName } as any)
          .eq('id', existingId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('smtp_settings')
          .insert({
            owner_id: user.id,
            smtp_from_name: fromName,
          } as any)
          .select('id')
          .single();
        if (error) throw error;
        setExistingId(data.id);
      }
      toast.success('Nome de remetente salvo!');
    } catch (err) {
      console.error('Error saving sender name:', err);
      toast.error('Erro ao salvar nome de remetente');
    } finally {
      setSaving(false);
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
        <CardTitle className="text-base">Nome do Remetente</CardTitle>
        <CardDescription>
          Este nome será exibido como remetente nos emails enviados por você. Cada administrador pode definir seu próprio nome.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Nome do Remetente</Label>
          <Input
            value={fromName}
            onChange={(e) => setFromName(e.target.value)}
            placeholder="Ex: João Silva - Agência XYZ"
          />
        </div>
        <div className="flex justify-end">
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Salvar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
