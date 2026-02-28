import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Palette, Type, Loader2, Check } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const FONT_OPTIONS = [
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
  { value: 'Lora', label: 'Lora', category: 'Serif' },
  { value: 'Roboto Mono', label: 'Roboto Mono', category: 'Monospace' },
  { value: 'Source Code Pro', label: 'Source Code Pro', category: 'Monospace' },
  { value: 'Space Mono', label: 'Space Mono', category: 'Monospace' },
];

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

// 22 Tailwind color families with their 500 shade for the swatch
const THEME_COLORS: { value: string; label: string; hex: string }[] = [
  { value: 'slate', label: 'Slate', hex: '#64748b' },
  { value: 'gray', label: 'Gray', hex: '#6b7280' },
  { value: 'zinc', label: 'Zinc', hex: '#71717a' },
  { value: 'neutral', label: 'Neutral', hex: '#737373' },
  { value: 'stone', label: 'Stone', hex: '#78716c' },
  { value: 'red', label: 'Red', hex: '#ef4444' },
  { value: 'orange', label: 'Orange', hex: '#f97316' },
  { value: 'amber', label: 'Amber', hex: '#f59e0b' },
  { value: 'yellow', label: 'Yellow', hex: '#eab308' },
  { value: 'lime', label: 'Lime', hex: '#84cc16' },
  { value: 'green', label: 'Green', hex: '#22c55e' },
  { value: 'emerald', label: 'Emerald', hex: '#10b981' },
  { value: 'teal', label: 'Teal', hex: '#14b8a6' },
  { value: 'cyan', label: 'Cyan', hex: '#06b6d4' },
  { value: 'sky', label: 'Sky', hex: '#0ea5e9' },
  { value: 'blue', label: 'Blue', hex: '#3b82f6' },
  { value: 'indigo', label: 'Indigo', hex: '#6366f1' },
  { value: 'violet', label: 'Violet', hex: '#8b5cf6' },
  { value: 'purple', label: 'Purple', hex: '#a855f7' },
  { value: 'fuchsia', label: 'Fuchsia', hex: '#d946ef' },
  { value: 'pink', label: 'Pink', hex: '#ec4899' },
  { value: 'rose', label: 'Rose', hex: '#f43f5e' },
];

const VALID_THEME_COLORS = new Set(THEME_COLORS.map((color) => color.value));

function applyThemeColorClass(color: string) {
  const classes = document.documentElement.classList;
  classes.forEach((cls) => {
    if (cls.startsWith('theme-')) classes.remove(cls);
  });

  if (VALID_THEME_COLORS.has(color)) {
    classes.add(`theme-${color}`);
  } else {
    classes.add('theme-slate');
  }
}

export const ThemeSettings: React.FC = () => {
  const { isMasterAdmin } = useAuth();
  const { refreshTheme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fontFamily, setFontFamily] = useState('Inter');
  const [themeColor, setThemeColor] = useState('slate');

  useEffect(() => {
    const fetchTheme = async () => {
      const { data } = await supabase
        .from('theme_settings')
        .select('*')
        .single();
      
      if (data) {
        setThemeColor((data as any).theme_color ?? 'slate');
        setFontFamily(data.font_family);
      }
      setLoading(false);
    };
    fetchTheme();
  }, []);

  // Apply preview of theme color immediately
  useEffect(() => {
    applyThemeColorClass(themeColor);
  }, [themeColor]);

  // Load preview font dynamically
  useEffect(() => {
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
    
    let fontStack: string;
    if (['Roboto Mono', 'Source Code Pro', 'Space Mono'].includes(fontFamily)) {
      fontStack = `"${fontFamily}", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`;
    } else if (fontFamily === 'Lora') {
      fontStack = `"${fontFamily}", ui-serif, Georgia, Cambria, "Times New Roman", serif`;
    } else {
      fontStack = `"${fontFamily}", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`;
    }
    document.documentElement.style.setProperty('--font-sans', fontStack);
  }, [fontFamily]);

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('theme_settings')
      .update({
        font_family: fontFamily,
        theme_color: themeColor,
      } as any)
      .eq('id', '00000000-0000-0000-0000-000000000001');

    if (error) {
      console.error('Error saving theme:', error);
      toast.error('Erro ao salvar tema.');
    } else {
      toast.success('Tema atualizado com sucesso!');
      await refreshTheme();
    }
    setSaving(false);
  };

  if (!isMasterAdmin) return null;

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
            <CardDescription>Selecione uma das 22 cores predefinidas do Tailwind para o tema da plataforma</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Theme Color Grid */}
        <div className="space-y-3">
          <Label>Tema Predefinido</Label>
          <p className="text-xs text-muted-foreground">Escolha uma família de cores predefinida para toda a plataforma</p>
          <div className="grid grid-cols-11 gap-2">
            {THEME_COLORS.map((color) => (
              <button
                key={color.value}
                type="button"
                onClick={() => setThemeColor(color.value)}
                className={cn(
                  "group relative flex flex-col items-center gap-1"
                )}
                title={color.label}
              >
                <div
                  className={cn(
                    "h-8 w-8 rounded-full border-2 transition-all flex items-center justify-center",
                    themeColor === color.value
                      ? "border-foreground scale-110 shadow-md"
                      : "border-transparent hover:border-muted-foreground/40 hover:scale-105"
                  )}
                  style={{ backgroundColor: color.hex }}
                >
                  {themeColor === color.value && (
                    <Check className="h-4 w-4 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]" />
                  )}
                </div>
                <span className="text-[9px] text-muted-foreground leading-none">{color.label}</span>
              </button>
            ))}
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
          className="p-4 border rounded-lg space-y-3"
          style={{ 
            borderColor: `hsl(var(--menu-border))`,
            backgroundColor: `hsl(var(--menu-surface))`,
            fontFamily: ['Roboto Mono', 'Source Code Pro', 'Space Mono'].includes(fontFamily)
              ? `"${fontFamily}", monospace`
              : fontFamily === 'Lora'
              ? `"${fontFamily}", serif`
              : `"${fontFamily}", sans-serif`
          }}
        >
          <p className="text-sm font-medium" style={{ color: `hsl(var(--menu-muted))` }}>Prévia do Menu</p>
          <div className="flex gap-2 flex-wrap">
            <Button size="sm" style={{ backgroundColor: `hsl(var(--accent-theme))`, color: `hsl(var(--primary-foreground))` }}>Botão Destaque</Button>
            <Button size="sm" style={{ backgroundColor: `hsl(var(--primary))`, color: 'hsl(var(--primary-foreground))' }}>Primário</Button>
            <Button size="sm" variant="outline" style={{ borderColor: `hsl(var(--menu-border))`, color: `hsl(var(--menu-foreground))` }}>Outline</Button>
          </div>
          <p className="text-sm" style={{ color: `hsl(var(--menu-foreground))` }}>
            Esta é uma prévia de como o texto ficará com a fonte <strong>{fontFamily}</strong>.
          </p>
          <p className="text-xs" style={{ color: `hsl(var(--menu-muted))` }}>
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
