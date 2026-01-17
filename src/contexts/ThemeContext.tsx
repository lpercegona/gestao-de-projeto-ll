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

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<ThemeSettings>(defaultTheme);
  const [loading, setLoading] = useState(true);

  const applyTheme = (settings: ThemeSettings) => {
    document.documentElement.style.setProperty('--primary', settings.primaryColor);
    document.documentElement.style.setProperty('--secondary', settings.secondaryColor);
    document.documentElement.style.setProperty('--accent', settings.accentColor);
    
    if (settings.fontFamily === 'System') {
      document.documentElement.style.setProperty('--font-sans', "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif");
    } else if (settings.fontFamily === 'Lora') {
      document.documentElement.style.setProperty('--font-sans', "'Lora', ui-serif, Georgia, serif");
    } else if (settings.fontFamily === 'Space Mono') {
      document.documentElement.style.setProperty('--font-sans', "'Space Mono', ui-monospace, monospace");
    } else {
      document.documentElement.style.setProperty('--font-sans', "'Inter', ui-sans-serif, system-ui, sans-serif");
    }
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