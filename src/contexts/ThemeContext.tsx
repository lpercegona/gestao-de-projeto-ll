import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ThemeSettings {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  fontFamily: string;
}

interface ThemeContextType {
  theme: ThemeSettings;
  loading: boolean;
  refreshTheme: () => Promise<void>;
}

const defaultTheme: ThemeSettings = {
  primaryColor: '266 4% 20.8%',
  secondaryColor: '248 0.7% 96.8%',
  accentColor: '248 0.7% 96.8%',
  fontFamily: 'Inter',
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Map font names to their Google Fonts import parameters
const GOOGLE_FONTS_MAP: Record<string, string> = {
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

function loadGoogleFont(fontFamily: string) {
  const fontParam = GOOGLE_FONTS_MAP[fontFamily];
  if (!fontParam) return;

  const linkId = 'dynamic-google-font';
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

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<ThemeSettings>(defaultTheme);
  const [loading, setLoading] = useState(true);

  const applyTheme = (settings: ThemeSettings) => {
    document.documentElement.style.setProperty('--primary', settings.primaryColor);
    document.documentElement.style.setProperty('--secondary', settings.secondaryColor);
    document.documentElement.style.setProperty('--accent', settings.accentColor);
    
    // Load Google Font dynamically
    loadGoogleFont(settings.fontFamily);
    
    // Build font stack based on font type
    let fontStack: string;
    if (['Roboto Mono', 'Source Code Pro', 'Space Mono'].includes(settings.fontFamily)) {
      fontStack = `"${settings.fontFamily}", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`;
    } else if (settings.fontFamily === 'Lora') {
      fontStack = `"${settings.fontFamily}", ui-serif, Georgia, Cambria, "Times New Roman", serif`;
    } else {
      fontStack = `"${settings.fontFamily}", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`;
    }
    
    document.documentElement.style.setProperty('--font-sans', fontStack);
    document.body.style.fontFamily = fontStack;
  };

  const fetchTheme = async () => {
    try {
      const { data } = await supabase
        .from('theme_settings')
        .select('*')
        .single();
      
      if (data) {
        const newTheme = {
          primaryColor: data.primary_color,
          secondaryColor: data.secondary_color,
          accentColor: data.accent_color,
          fontFamily: data.font_family,
        };
        setTheme(newTheme);
        applyTheme(newTheme);
      }
    } catch (err) {
      console.error('Error fetching theme:', err);
    } finally {
      setLoading(false);
    }
  };

  const refreshTheme = async () => {
    await fetchTheme();
  };

  useEffect(() => {
    fetchTheme();
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, loading, refreshTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};