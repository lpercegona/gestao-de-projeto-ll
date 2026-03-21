import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { LogIn, ChevronDown } from "lucide-react";
import LogoOras from "@/assets/logo-oras.svg";
import SimboloOras from "@/assets/simbolo-oras.svg";
import LegalFooter from "./LegalFooter";

interface LegalPageLayoutProps {
  title: string;
  lastUpdated: string;
  children: React.ReactNode;
}

const LegalPageLayout: React.FC<LegalPageLayoutProps> = ({ title, lastUpdated, children }) => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            <Link to="/">
              <img src={LogoOras} alt="ORAS" className="hidden sm:block h-6 w-auto" />
              <img src={SimboloOras} alt="ORAS" className="sm:hidden h-6 w-auto" />
            </Link>
            <div className="flex items-center gap-2 sm:gap-4">
              <Link to="/list">
                <Button variant="link" size="sm" className="text-xs sm:text-sm h-8 sm:h-9 gap-1.5">
                  Explorar
                </Button>
              </Link>
              <Link to="">
                <Button variant="link" size="sm" className="text-xs sm:text-sm h-8 sm:h-9 gap-1.5">
                  Gestão
                </Button>
              </Link>
              <Link to="/login">
                <Button variant="outline" size="sm" className="text-xs sm:text-sm h-8 sm:h-9 gap-1.5">
                  <LogIn className="h-3.5 w-3.5" />
                  Entrar
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 py-8 sm:py-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-3xl">
          <h1 className="text-xl sm:text-3xl font-bold text-foreground mb-2">{title}</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mb-8 sm:mb-12">
            Última atualização: {lastUpdated}
          </p>
          <div className="prose prose-sm sm:prose-base prose-neutral dark:prose-invert max-w-none space-y-6">
            {children}
          </div>
        </div>
      </main>

      <LegalFooter />
    </div>
  );
};

export default LegalPageLayout;
