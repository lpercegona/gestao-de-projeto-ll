import React from "react";
import { Link } from "react-router-dom";
import SimboloOras from "@/assets/simbolo-oras.svg";

interface LegalFooterProps {
  onOpenCookiePreferences?: () => void;
}

const LegalFooter: React.FC<LegalFooterProps> = ({ onOpenCookiePreferences }) => {
  return (
    <footer className="py-6 sm:py-8 border-t border-border">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[10px] sm:text-xs text-muted-foreground">
            <Link to="/privacidade" className="hover:text-foreground transition-colors">
              Política de Privacidade
            </Link>
            <span className="hidden sm:inline text-border">|</span>
            <Link to="/termos" className="hover:text-foreground transition-colors">
              Termos de Uso
            </Link>
            <span className="hidden sm:inline text-border">|</span>
            <Link to="/cookies" className="hover:text-foreground transition-colors">
              Política de Cookies
            </Link>
            <span className="hidden sm:inline text-border">|</span>
            <Link to="/direitos" className="hover:text-foreground transition-colors">
              Direitos do Titular
            </Link>
            {onOpenCookiePreferences && (
              <>
                <span className="hidden sm:inline text-border">|</span>
                <button
                  onClick={onOpenCookiePreferences}
                  className="hover:text-foreground transition-colors underline-offset-2 hover:underline"
                >
                  Preferências de Cookies
                </button>
              </>
            )}
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
            <img src={SimboloOras} alt="ORAS" className="h-5 sm:h-6 w-auto" />
            <p className="text-[10px] sm:text-sm text-muted-foreground">
              © {new Date().getFullYear()} ORAS. Gestão de Projetos e Horas.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default LegalFooter;
