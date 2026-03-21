import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  ArrowRight,
  Clock,
  FolderKanban,
  FileText,
  BarChart3,
  Shield,
  Users,
  LogIn,
  ChevronDown,
} from "lucide-react";
import LogoOras from "@/assets/logo-oras.svg";
import SimboloOras from "@/assets/simbolo-oras.svg";
import LegalFooter from "@/components/legal/LegalFooter";

const features = [
  {
    icon: Clock,
    title: "Controle de Horas",
    description:
      "Registre cada minuto com o timer integrado. Inicie, pause e finalize cronômetros vinculados às tarefas. Registros manuais também são suportados para total flexibilidade.",
  },
  {
    icon: FolderKanban,
    title: "Projetos e Kanban",
    description:
      "Visualize projetos em Kanban com colunas personalizáveis. Crie tarefas, defina prazos e acompanhe o progresso em lista, tabela ou quadro — como preferir.",
  },
  {
    icon: FileText,
    title: "Propostas e Contratos",
    description:
      "Elabore propostas com itens detalhados, envie ao cliente para aprovação e converta em contratos digitais com assinatura eletrônica em poucos cliques.",
  },
  {
    icon: BarChart3,
    title: "Relatórios Automáticos",
    description:
      "Configure envios mensais automáticos com projetos, tarefas concluídas e saldo de horas. Compartilhe por link público ou protegido por senha.",
  },
  {
    icon: Shield,
    title: "Portfólio Público",
    description:
      "Monte um portfólio vinculado ao seu perfil público. Exiba projetos, serviços e informações de contato em uma página elegante e responsiva.",
  },
  {
    icon: Users,
    title: "Portal do Cliente",
    description:
      "Cada cliente recebe acesso exclusivo para acompanhar projetos, consultar horas e solicitar novos trabalhos — tudo em um canal direto e seguro.",
  },
];

export const ForCreatives = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border animate-fade-in">
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
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="link" size="sm" className="text-xs sm:text-sm h-8 sm:h-9 gap-1.5">
                    Gestão <ChevronDown className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link to="/criativos" className="cursor-pointer">Criativos</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/clientes" className="cursor-pointer">Clientes</Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
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

      {/* Hero */}
      <section
        className="py-10 sm:py-24 animate-fade-in"
        style={{ animationDelay: "100ms", animationFillMode: "both" }}
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center max-w-3xl">
          <h1 className="text-2xl sm:text-5xl font-bold text-foreground tracking-tight whitespace-pre-line">
            Mais tempo para criar,{"\n"}menos burocracia
          </h1>
          <p className="mt-3 sm:mt-6 text-sm sm:text-lg text-muted-foreground max-w-xl mx-auto">
            Gerencie projetos, horas, propostas e contratos em uma única plataforma feita para profissionais criativos.
          </p>
          <div className="mt-5 sm:mt-8">
            <Link to="/login">
              <Button size="sm" className="sm:h-11 sm:px-8 sm:text-sm">
                <span className="sm:hidden">Começar</span>
                <span className="hidden sm:inline">Começar Gratuitamente</span>
                <ArrowRight className="w-3.5 h-3.5 ml-1 hidden sm:inline-block" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section
        className="py-10 sm:py-24 border-t border-border bg-muted/30 animate-fade-in"
        style={{ animationDelay: "200ms", animationFillMode: "both" }}
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-lg sm:text-3xl font-bold text-foreground">
              Tudo o que você precisa
            </h2>
            <p className="mt-2 sm:mt-3 text-xs sm:text-base text-muted-foreground max-w-xl mx-auto">
              Ferramentas integradas para gerenciar cada etapa do seu trabalho criativo.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
            {features.map((f, index) => (
              <div
                key={f.title}
                className="rounded-lg border bg-card p-4 sm:p-6 space-y-2 sm:space-y-3 transition-all duration-300 hover:shadow-md animate-fade-in"
                style={{ animationDelay: `${300 + index * 80}ms`, animationFillMode: "both" }}
              >
                <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-md bg-primary/10">
                  <f.icon className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                </div>
                <h3 className="text-xs sm:text-base font-semibold text-foreground">{f.title}</h3>
                <p className="text-[10px] sm:text-sm text-muted-foreground leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
          <div
            className="text-center mt-6 sm:mt-10 animate-fade-in"
            style={{ animationDelay: "800ms", animationFillMode: "both" }}
          >
            <Link to="/login">
              <Button size="sm" className="sm:h-11 sm:px-8 sm:text-sm">
                <span className="sm:hidden">Começar</span>
                <span className="hidden sm:inline">Começar Gratuitamente</span>
                <ArrowRight className="w-3.5 h-3.5 ml-1 hidden sm:inline-block" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <div className="animate-fade-in" style={{ animationDelay: "900ms", animationFillMode: "both" }}>
        <LegalFooter />
      </div>
    </div>
  );
};
