import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Palette, Type, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
}

const FONT_OPTIONS = [
  // Sans-serif
  { value: 'Roboto', label: 'Roboto', category: 'Sans-serif' },
  { value: 'Open Sans', label: 'Open Sans', category: 'Sans-serif' },
  { value: 'Inter', label: 'Inter', category: 'Sans-serif' },
  { value: 'Montserrat', label: 'Montserrat', category: 'Sans-serif' },
  { value: 'Lato', label: 'Lato', category: 'Sans-serif' },
  { value: 'Poppins', label: 'Poppins', category: 'Sans-serif' },
  { value: 'Noto Sans', label: 'Noto Sans', category: 'Sans-serif' },
  { value: 'Raleway', label: 'Raleway', category: 'Sans-serif' },
  { value: 'Oswald', label: 'Oswald', category: 'Sans-serif' },
  { value: 'DM Sans', label: 'DM Sans', category: 'Sans-serif' },
  { value: 'Space Grotesk', label: 'Space Grotesk', category: 'Sans-serif' },
  { value: 'Nunito Sans', label: 'Nunito Sans', category: 'Sans-serif' },
  { value: 'Stack Sans Text', label: 'Stack Sans Text', category: 'Sans-serif' },
  // Serif
  { value: 'Lora', label: 'Lora', category: 'Serif' },
  // Monospace
  { value: 'Roboto Mono', label: 'Roboto Mono', category: 'Monospace' },
  { value: 'Source Code Pro', label: 'Source Code Pro', category: 'Monospace' },
  { value: 'Space Mono', label: 'Space Mono', category: 'Monospace' },
];

// Map font names to their Google Fonts import parameters
const GOOGLE_FONTS_PREVIEW: Record<string, string> = {
  'Inter': 'Inter:wght@400;500;600;700',
  'Roboto': 'Roboto:wght@400;500;700',
  'Open Sans': 'Open+Sans:wght@400;500;600;700',
  'Montserrat': 'Montserrat:wght@400;500;600;700',
  'Lato': 'Lato:wght@400;700',
  'Poppins': 'Poppins:wght@400;500;600;700',
  'Noto Sans': 'Noto+Sans:wght@400;500;600;700',
  'Raleway': 'Raleway:wght@400;500;600;700',
  'Oswald': 'Oswald:wght@400;500;600;700',
  'DM Sans': 'DM+Sans:wght@400;500;600;700',
  'Space Grotesk': 'Space+Grotesk:wght@400;500;600;700',
  'Nunito Sans': 'Nunito+Sans:wght@400;500;600;700',
  'Stack Sans Text': 'Stack+Sans+Text:wght@400;500;600;700',
  'Lora': 'Lora:wght@400;500;600;700',
  'Roboto Mono': 'Roboto+Mono:wght@400;500;700',
  'Source Code Pro': 'Source+Code+Pro:wght@400;500;600;700',
  'Space Mono': 'Space+Mono:wght@400;700',
};

const COLOR_PRESETS = [
  { name: 'Padrão (Cinza)', primary: '266 4% 20.8%', secondary: '248 0.7% 96.8%', accent: '248 0.7% 96.8%' },
  { name: 'Azul Profissional', primary: '221 83% 53%', secondary: '210 40% 96%', accent: '210 40% 96%' },
  { name: 'Verde Natureza', primary: '142 76% 36%', secondary: '138 76% 97%', accent: '138 76% 97%' },
  { name: 'Roxo Elegante', primary: '262 83% 58%', secondary: '270 100% 98%', accent: '270 100% 98%' },
  { name: 'Laranja Energia', primary: '24 95% 53%', secondary: '33 100% 96%', accent: '33 100% 96%' },
  { name: 'Rosa Moderno', primary: '330 81% 60%', secondary: '330 100% 98%', accent: '330 100% 98%' },
];

// Helper function to convert HSL string to hex
const hslToHex = (hslString: string): string => {
  const [h, s, l] = hslString.split(' ').map(v => parseFloat(v.replace('%', '')));
  const sNorm = s / 100;
  const lNorm = l / 100;
  
  const c = (1 - Math.abs(2 * lNorm - 1)) * sNorm;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = lNorm - c / 2;
  
  let r = 0, g = 0, b = 0;
  if (h >= 0 && h < 60) { r = c; g = x; b = 0; }
  else if (h >= 60 && h < 120) { r = x; g = c; b = 0; }
  else if (h >= 120 && h < 180) { r = 0; g = c; b = x; }
  else if (h >= 180 && h < 240) { r = 0; g = x; b = c; }
  else if (h >= 240 && h < 300) { r = x; g = 0; b = c; }
  else { r = c; g = 0; b = x; }
  
  const toHex = (n: number) => Math.round((n + m) * 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

// Helper function to convert hex to HSL string
const hexToHsl = (hex: string): string => {
  let r = 0, g = 0, b = 0;
  if (hex.length === 4) {
    r = parseInt(hex[1] + hex[1], 16);
    g = parseInt(hex[2] + hex[2], 16);
    b = parseInt(hex[3] + hex[3], 16);
  } else if (hex.length === 7) {
    r = parseInt(hex.slice(1, 3), 16);
    g = parseInt(hex.slice(3, 5), 16);
    b = parseInt(hex.slice(5, 7), 16);
  }
  
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) * 60; break;
      case g: h = ((b - r) / d + 2) * 60; break;
      case b: h = ((r - g) / d + 4) * 60; break;
    }
  }
  
  return `${Math.round(h)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
};

export const ThemeSettings: React.FC = () => {
  const { isMasterAdmin } = useAuth();
  const { refreshTheme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [colors, setColors] = useState<ThemeColors>({
    primary: '266 4% 20.8%',
    secondary: '248 0.7% 96.8%',
    accent: '248 0.7% 96.8%',
  });
  const [fontFamily, setFontFamily] = useState('Inter');
  const [selectedPreset, setSelectedPreset] = useState('');

  useEffect(() => {
    const fetchTheme = async () => {
      const { data } = await supabase
        .from('theme_settings')
        .select('*')
        .single();
      
      if (data) {
        setColors({
          primary: data.primary_color,
          secondary: data.secondary_color,
          accent: data.accent_color,
        });
        setFontFamily(data.font_family);
      }
      setLoading(false);
    };
    fetchTheme();
  }, []);

  // Apply theme to CSS variables and load fonts dynamically
  useEffect(() => {
    document.documentElement.style.setProperty('--primary', colors.primary);
    document.documentElement.style.setProperty('--secondary', colors.secondary);
    document.documentElement.style.setProperty('--accent', colors.accent);
    
    // Load Google Font dynamically for preview
    const fontParam = GOOGLE_FONTS_PREVIEW[fontFamily];
    if (fontParam) {
      const linkId = 'theme-settings-preview-font';
      let linkElement = document.getElementById(linkId) as HTMLLinkElement | null;
      
      if (linkElement) {
        linkElement.href = `https://fonts.googleapis.com/css2?family=${fontParam}&display=swap`;
      } else {
        linkElement = document.createElement('link');
        linkElement.id = linkId;
        linkElement.rel = 'stylesheet';
        linkElement.href = `https://fonts.googleapis.com/css2?family=${fontParam}&display=swap`;
        document.head.appendChild(linkElement);
      }
    }
    
    // Build font stack based on font type
    let fontStack: string;
    if (['Roboto Mono', 'Source Code Pro', 'Space Mono'].includes(fontFamily)) {
      fontStack = `"${fontFamily}", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`;
    } else if (fontFamily === 'Lora') {
      fontStack = `"${fontFamily}", ui-serif, Georgia, Cambria, "Times New Roman", serif`;
    } else {
      fontStack = `"${fontFamily}", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`;
    }
    
    document.documentElement.style.setProperty('--font-sans', fontStack);
  }, [colors, fontFamily]);

  const handlePresetChange = (presetName: string) => {
    const preset = COLOR_PRESETS.find(p => p.name === presetName);
    if (preset) {
      setColors({
        primary: preset.primary,
        secondary: preset.secondary,
        accent: preset.accent,
      });
      setSelectedPreset(presetName);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('theme_settings')
      .update({
        primary_color: colors.primary,
        secondary_color: colors.secondary,
        accent_color: colors.accent,
        font_family: fontFamily,
      })
      .eq('id', '00000000-0000-0000-0000-000000000001');
    
    if (error) {
      console.error('Error saving theme:', error);
      toast.error('Erro ao salvar tema.');
    } else {
      toast.success('Tema atualizado com sucesso!');
      // Refresh theme globally to apply changes immediately
      await refreshTheme();
    }
    setSaving(false);
  };

  if (!isMasterAdmin) {
    return null;
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Palette className="w-5 h-5 text-muted-foreground" />
          <div>
            <CardTitle>Personalização do Tema</CardTitle>
            <CardDescription>Configure cores e fontes da plataforma (apenas Master Admin)</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Preset Colors */}
        <div className="space-y-2">
          <Label>Tema Predefinido</Label>
          <Select value={selectedPreset} onValueChange={handlePresetChange}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione um tema" />
            </SelectTrigger>
            <SelectContent>
              {COLOR_PRESETS.map((preset) => (
                <SelectItem key={preset.name} value={preset.name}>
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-4 h-4 rounded-full border border-border" 
                      style={{ backgroundColor: `hsl(${preset.primary})` }}
                    />
                    {preset.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Custom Primary Color */}
        <div className="space-y-2">
          <Label htmlFor="primary-color">Cor Primária</Label>
          <div className="flex gap-2 items-center">
            <Input
              id="primary-color"
              type="color"
              value={hslToHex(colors.primary)}
              onChange={(e) => {
                setColors({ ...colors, primary: hexToHsl(e.target.value) });
                setSelectedPreset('');
              }}
              className="w-16 h-10 p-1 cursor-pointer"
            />
            <span className="text-sm text-muted-foreground flex-1">
              HSL: {colors.primary}
            </span>
          </div>
        </div>

        {/* Font Family */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Type className="w-4 h-4 text-muted-foreground" />
            <Label>Fonte Principal</Label>
          </div>
          <Select value={fontFamily} onValueChange={setFontFamily}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Sans-serif</div>
              {FONT_OPTIONS.filter(f => f.category === 'Sans-serif').map((font) => (
                <SelectItem key={font.value} value={font.value}>
                  <span style={{ fontFamily: `"${font.value}", sans-serif` }}>{font.label}</span>
                </SelectItem>
              ))}
              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Serif</div>
              {FONT_OPTIONS.filter(f => f.category === 'Serif').map((font) => (
                <SelectItem key={font.value} value={font.value}>
                  <span style={{ fontFamily: `"${font.value}", serif` }}>{font.label}</span>
                </SelectItem>
              ))}
              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Monospace</div>
              {FONT_OPTIONS.filter(f => f.category === 'Monospace').map((font) => (
                <SelectItem key={font.value} value={font.value}>
                  <span style={{ fontFamily: `"${font.value}", monospace` }}>{font.label}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Preview */}
        <div 
          className="p-4 border border-border rounded-lg space-y-3"
          style={{ 
            fontFamily: ['Roboto Mono', 'Source Code Pro', 'Space Mono'].includes(fontFamily)
              ? `"${fontFamily}", monospace`
              : fontFamily === 'Lora'
              ? `"${fontFamily}", serif`
              : `"${fontFamily}", sans-serif`
          }}
        >
          <p className="text-sm font-medium text-muted-foreground">Prévia</p>
          <div className="flex gap-2 flex-wrap">
            <Button size="sm" style={{ backgroundColor: `hsl(${colors.primary})` }}>Botão Primário</Button>
            <Button size="sm" variant="secondary" style={{ backgroundColor: `hsl(${colors.secondary})` }}>Secundário</Button>
            <Button size="sm" variant="outline">Outline</Button>
          </div>
          <p className="text-sm">
            Esta é uma prévia de como o texto ficará com a fonte <strong>{fontFamily}</strong>.
          </p>
          <p className="text-xs text-muted-foreground">
            ABCDEFGHIJKLMNOPQRSTUVWXYZ abcdefghijklmnopqrstuvwxyz 0123456789
          </p>
        </div>

        {/* Save Button */}
        <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
          {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
          Salvar Tema
        </Button>
      </CardContent>
    </Card>
  );
};