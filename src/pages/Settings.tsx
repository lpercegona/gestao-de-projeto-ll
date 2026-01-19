import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from '@/components/ui/select';
import { Loader2, Globe } from 'lucide-react';
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

export const Settings: React.FC = () => {
  const { user, isMasterAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  
  // Timezone preferences
  const [timezone, setTimezone] = useState('America/Sao_Paulo');
  const [savingTimezone, setSavingTimezone] = useState(false);

  // Fetch user preferences
  useEffect(() => {
    const fetchPreferences = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      const { data: prefs } = await supabase
        .from('user_preferences')
        .select('timezone')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (prefs?.timezone) {
        setTimezone(prefs.timezone);
      }
      setLoading(false);
    };
    fetchPreferences();
  }, [user]);

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

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-6">
      <PageHeader title="Configurações" description="Personalize suas preferências" />
      
      {/* Theme Settings - Only for Master Admin */}
      {isMasterAdmin && <ThemeSettings />}
      
      {/* Preferências Pessoais */}
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
    </div>
  );
};
