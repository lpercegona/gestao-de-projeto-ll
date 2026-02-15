import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';

interface AutoReportConfigProps {
  clientId: string;
  initialEnabled: boolean;
  initialDay: number;
  initialHour: number;
  initialMinute: number;
  onSaved?: () => void;
}

export const AutoReportConfig: React.FC<AutoReportConfigProps> = ({
  clientId,
  initialEnabled,
  initialDay,
  initialHour,
  initialMinute,
  onSaved,
}) => {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [day, setDay] = useState(initialDay);
  const [hour, setHour] = useState(initialHour);
  const [minute, setMinute] = useState(initialMinute);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const update = (patch: Partial<{ enabled: boolean; day: number; hour: number; minute: number }>) => {
    if (patch.enabled !== undefined) setEnabled(patch.enabled);
    if (patch.day !== undefined) setDay(patch.day);
    if (patch.hour !== undefined) setHour(patch.hour);
    if (patch.minute !== undefined) setMinute(patch.minute);
    setDirty(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('clients')
        .update({
          auto_report_enabled: enabled,
          auto_report_day: day,
          auto_report_hour: hour,
          auto_report_minute: minute,
        } as any)
        .eq('id', clientId);

      if (error) throw error;
      toast.success('Configuração de relatório automático salva!');
      setDirty(false);
      onSaved?.();
    } catch (err) {
      console.error(err);
      toast.error('Erro ao salvar configuração');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-medium">Relatório Automático</h4>
            <p className="text-xs text-muted-foreground">
              O relatório do mês anterior será enviado automaticamente para o email do cliente na data e hora configurados.
            </p>
          </div>
          <Switch
            checked={enabled}
            onCheckedChange={(checked) => update({ enabled: checked })}
            disabled={saving}
          />
        </div>

        {enabled && (
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Dia do mês</Label>
              <Select value={String(day)} onValueChange={(v) => update({ day: Number(v) })} disabled={saving}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                    <SelectItem key={d} value={String(d)}>Dia {d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Hora</Label>
              <Select value={String(hour)} onValueChange={(v) => update({ hour: Number(v) })} disabled={saving}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 24 }, (_, i) => i).map((h) => (
                    <SelectItem key={h} value={String(h)}>{String(h).padStart(2, '0')}h</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Minuto</Label>
              <Select value={String(minute)} onValueChange={(v) => update({ minute: Number(v) })} disabled={saving}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[0, 15, 30, 45].map((m) => (
                    <SelectItem key={m} value={String(m)}>{String(m).padStart(2, '0')}min</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {dirty && (
          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving} size="sm">
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Salvar
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
