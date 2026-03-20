import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { ArrowRight, Loader2, Clock, FolderKanban, FileText, Users, BarChart3, Shield } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import LogoOras from '@/assets/logo-oras.svg';
import SimboloOras from '@/assets/simbolo-oras.svg';

interface PortfolioItem {
  id: string;
  title: string;
  cover_url: string | null;
  service_name: string | null;
  owner_name: string | null;
  owner_slug: string | null;
  owner_avatar: string | null;
}

const features = [
  {
    icon: Clock,
    title: 'Controle de Horas',
    description: 'Registre e acompanhe o tempo dedicado a cada projeto e tarefa com precisão.',
  },
  {
    icon: FolderKanban,
    title: 'Gestão de Projetos',
    description: 'Organize projetos com Kanban, tarefas e prazos em um só lugar.',
  },
  {
    icon: FileText,
    title: 'Propostas e Contratos',
    description: 'Crie, envie e gerencie propostas comerciais e contratos digitais.',
  },
  {
    icon: Users,
    title: 'Portal do Cliente',
    description: 'Ofereça acesso exclusivo para seus clientes acompanharem o andamento.',
  },
  {
    icon: BarChart3,
    title: 'Relatórios Automáticos',
    description: 'Gere relatórios detalhados de horas e projetos para seus clientes.',
  },
  {
    icon: Shield,
    title: 'Portfólio Público',
    description: 'Apresente seus melhores trabalhos e atraia novos clientes.',
  },
];

export const Landing: React.FC = () => {
  const [projects, setProjects] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProjects = async () => {
      const { data } = await supabase.rpc('get_all_public_portfolio' as any);
      setProjects(((data as PortfolioItem[]) || []).slice(0, 8));
      setLoading(false);
    };
    fetchProjects();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <img src={LogoOras} alt="ORAS" className="h-8 w-auto" />
            <div className="flex items-center gap-4">
              <Link to="/list">
                <Button variant="ghost" size="sm">Explorar</Button>
              </Link>
              <Link to="/login">
                <Button variant="ghost" size="sm">Entrar</Button>
              </Link>
              <Link to="/login">
                <Button size="sm">Começar Agora</Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="py-16 sm:py-24">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center max-w-3xl">
          <h1 className="text-4xl sm:text-5xl font-bold text-foreground tracking-tight">
            Descubra profissionais{' '}
            <span className="text-primary">criativos</span>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground">
            Explore portfólios, conheça serviços e contrate profissionais talentosos em um só lugar.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link to="/list">
              <Button size="lg">
                Ver Projetos <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <Link to="/list?tab=profiles">
              <Button size="lg" variant="outline">Ver Perfis</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Featured Projects */}
      <section className="pb-16 sm:pb-24">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-foreground">Projetos em destaque</h2>
            <Link to="/list" className="text-sm text-primary hover:underline">Ver todos</Link>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : projects.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">Nenhum projeto publicado ainda.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {projects.map((item) => (
                <Link
                  key={item.id}
                  to={`/${item.owner_slug}/${item.id}`}
                  className="group overflow-hidden rounded-lg border bg-card hover:shadow-md transition-shadow"
                >
                  {item.cover_url ? (
                    <img src={item.cover_url} alt={item.title} className="aspect-[4/3] w-full object-cover" />
                  ) : (
                    <div className="flex aspect-[4/3] w-full items-center justify-center bg-muted text-xs text-muted-foreground">
                      Sem capa
                    </div>
                  )}
                  <div className="p-2 space-y-1">
                    <h3 className="text-xs font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                      {item.title}
                    </h3>
                    <div className="flex items-center gap-1.5">
                      <Avatar className="h-4 w-4">
                        <AvatarImage src={item.owner_avatar || undefined} />
                        <AvatarFallback className="text-[8px]">
                          {item.owner_name?.[0]?.toUpperCase() || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-[10px] text-muted-foreground truncate">{item.owner_name}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Features */}
      <section className="py-16 sm:py-24 border-t border-border bg-muted/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <img src={SimboloOras} alt="ORAS" className="h-10 w-auto mx-auto mb-6 opacity-80" />
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
              Tudo que você precisa para gerenciar seus projetos
            </h2>
            <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
              Uma plataforma completa para freelancers e agências organizarem trabalho, tempo e clientes.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => (
              <div key={f.title} className="rounded-lg border bg-card p-5 space-y-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10">
                  <f.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-10">
            <Link to="/login">
              <Button size="lg">
                Começar Gratuitamente <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-border">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <img src={SimboloOras} alt="ORAS" className="h-6 w-auto" />
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} ORAS. Gestão de Projetos e Horas.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};
