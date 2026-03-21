import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { X } from "lucide-react";

const STORAGE_KEY = "oras_cookie_consent";

interface CookieConsent {
  essential: boolean;
  analytics: boolean;
  marketing: boolean;
  timestamp: string;
}

const getStoredConsent = (): CookieConsent | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const storeConsent = (consent: CookieConsent) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(consent));
  window.dispatchEvent(new CustomEvent("oras_cookie_consent_update", { detail: consent }));
};

// Expose a global function to reopen preferences
declare global {
  interface WindowEventMap {
    oras_open_cookie_preferences: CustomEvent;
  }
}

export const openCookiePreferences = () => {
  window.dispatchEvent(new CustomEvent("oras_open_cookie_preferences"));
};

const CookieConsentBanner: React.FC = () => {
  const [visible, setVisible] = useState(false);
  const [customizing, setCustomizing] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    const stored = getStoredConsent();
    if (!stored) {
      setVisible(true);
    }
  }, []);

  useEffect(() => {
    const handler = () => {
      const stored = getStoredConsent();
      if (stored) {
        setAnalytics(stored.analytics);
        setMarketing(stored.marketing);
      }
      setCustomizing(true);
      setVisible(true);
    };
    window.addEventListener("oras_open_cookie_preferences", handler);
    return () => window.removeEventListener("oras_open_cookie_preferences", handler);
  }, []);

  const save = useCallback((a: boolean, m: boolean) => {
    storeConsent({ essential: true, analytics: a, marketing: m, timestamp: new Date().toISOString() });
    setVisible(false);
    setCustomizing(false);
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 p-3 sm:p-4">
      <div className="container mx-auto max-w-2xl">
        <div className="rounded-lg border border-border bg-card shadow-lg p-4 sm:p-6">
          <div className="flex items-start justify-between gap-2 mb-3">
            <h3 className="text-sm sm:text-base font-semibold text-foreground">
              {customizing ? "Preferências de Cookies" : "Este site utiliza cookies"}
            </h3>
            {customizing && (
              <button onClick={() => { setVisible(false); setCustomizing(false); }} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {!customizing ? (
            <>
              <p className="text-xs sm:text-sm text-muted-foreground mb-4">
                Utilizamos cookies essenciais para o funcionamento do site e, com seu consentimento, cookies analíticos e de marketing para melhorar sua experiência. Você pode personalizar suas preferências ou consultar nossa{" "}
                <a href="/cookies" className="text-primary hover:underline">Política de Cookies</a>.
              </p>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button size="sm" onClick={() => save(true, true)} className="flex-1 text-xs sm:text-sm">
                  Aceitar todos
                </Button>
                <Button size="sm" variant="outline" onClick={() => save(false, false)} className="flex-1 text-xs sm:text-sm">
                  Rejeitar não essenciais
                </Button>
                <Button size="sm" variant="secondary" onClick={() => setCustomizing(true)} className="flex-1 text-xs sm:text-sm">
                  Personalizar
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-4 mb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-foreground">Essenciais</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">Necessários para o funcionamento básico do site.</p>
                  </div>
                  <Switch checked disabled />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-foreground">Analíticos</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">Nos ajudam a entender como o site é utilizado.</p>
                  </div>
                  <Switch checked={analytics} onCheckedChange={setAnalytics} />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-foreground">Marketing</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">Permitem exibir conteúdo relevante para você.</p>
                  </div>
                  <Switch checked={marketing} onCheckedChange={setMarketing} />
                </div>
              </div>
              <Button size="sm" onClick={() => save(analytics, marketing)} className="w-full text-xs sm:text-sm">
                Salvar preferências
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CookieConsentBanner;
