import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { ArrowRight, Loader2, Clock, FolderKanban, FileText, Users, BarChart3, Shield, Search, LogIn } from 'lucide-react';
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

interface ProfileItem {
  slug: string;
  full_name: string;
  company_name: string | null;
  avatar_url: string | null;
  cover_url: string | null;
}

const features = [
{ icon: Clock, title: 'Controle de Horas', description: 'Registre e acompanhe o tempo dedicado a cada projeto e tarefa com precisão.' },
{ icon: FolderKanban, title: 'Gestão de Projetos', description: 'Organize projetos com Kanban, tarefas e prazos em um só lugar.' },
{ icon: FileText, title: 'Propostas e Contratos', description: 'Crie, envie e gerencie propostas comerciais e contratos digitais.' },
{ icon: Users, title: 'Portal do Cliente', description: 'Ofereça acesso exclusivo para seus clientes acompanharem o andamento.' },
{ icon: BarChart3, title: 'Relatórios Automáticos', description: 'Gere relatórios detalhados de horas e projetos para seus clientes.' },
{ icon: Shield, title: 'Portfólio Público', description: 'Apresente seus melhores trabalhos e atraia novos clientes.' }];


type ViewMode = 'projects' | 'profiles';

export const Landing: React.FC = () => {
  const [projects, setProjects] = useState<PortfolioItem[]>([]);
  const [profiles, setProfiles] = useState<ProfileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<ViewMode>('projects');

  useEffect(() => {
    const fetchData = async () => {
      const [projRes, profRes] = await Promise.all([
      supabase.rpc('get_all_public_portfolio' as any),
      supabase.rpc('get_all_public_profiles' as any)]
      );
      setProjects((projRes.data as PortfolioItem[] || []).slice(0, 8));
      setProfiles((profRes.data as ProfileItem[] || []).slice(0, 8));
      setLoading(false);
    };
    fetchData();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border animate-fade-in">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            <img src={LogoOras} alt="ORAS" className="hidden sm:block h-8 w-auto" />
            <img src={SimboloOras} alt="ORAS" className="sm:hidden h-6 w-auto" />

            <div className="flex items-center gap-2 sm:gap-4">
              <Link to="/list">
                <Button variant="ghost" size="sm" className="text-xs sm:text-sm h-8 sm:h-9 gap-1.5">
                  Explorar
                </Button>
              </Link>
              <Link to="">
                <Button variant="ghost" size="sm" className="text-xs sm:text-sm h-8 sm:h-9 gap-1.5">
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

      {/* Hero */}
      <section className="py-10 sm:py-24 animate-fade-in" style={{ animationDelay: '100ms', animationFillMode: 'both' }}>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center max-w-3xl">
          <h1 className="text-2xl sm:text-5xl font-bold text-foreground tracking-tight">
           Para trabalha com criatividade
            
          </h1>
          <p className="mt-3 sm:mt-6 text-sm sm:text-lg text-muted-foreground">
            Explore portfólios, conheça serviços e colabore com profissionais criativos.
          </p>

          {/* View toggle */}
          <div className="mt-5 sm:mt-8 flex items-center justify-center gap-2 sm:gap-3">
            <Button size="sm"
            variant={view === 'projects' ? 'default' : 'outline'}
            className="sm:h-11 sm:px-8 sm:text-sm"
            onClick={() => setView('projects')}>
              
              Projetos
            </Button>
            <Button
              size="sm"
              variant={view === 'profiles' ? 'default' : 'outline'}
              className="sm:h-11 sm:px-8 sm:text-sm"
              onClick={() => setView('profiles')}>
              
              Perfis
            </Button>
          </div>
        </div>
      </section>

      {/* Featured content */}
      <section className="pb-10 sm:pb-24 animate-fade-in" style={{ animationDelay: '200ms', animationFillMode: 'both' }}>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <h2 className="text-base sm:text-xl font-semibold text-foreground">
              {view === 'projects' ? 'Projetos em destaque' : 'Perfis em destaque'}
            </h2>
            <Link
              to={view === 'projects' ? '/list' : '/list?tab=profiles'}
              className="text-xs sm:text-sm text-primary hover:underline">
              
              Ver todos
            </Link>
          </div>

          {loading ?
          <div className="flex justify-center py-12">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div> :
          view === 'projects' ?
          projects.length === 0 ?
          <p className="text-xs sm:text-sm text-muted-foreground text-center py-12">Nenhum projeto publicado ainda.</p> :

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
                {projects.map((item, index) =>
            <Link
              key={item.id}
              to={`/${item.owner_slug}/${item.id}`}
              className="group overflow-hidden rounded-lg border bg-card hover:shadow-md transition-all duration-300 animate-fade-in"
              style={{ animationDelay: `${300 + index * 60}ms`, animationFillMode: 'both' }}>
              
                    {item.cover_url ?
              <img src={item.cover_url} alt={item.title} className="aspect-[4/3] w-full object-cover transition-transform duration-300 group-hover:scale-105" /> :

              <div className="flex aspect-[4/3] w-full items-center justify-center bg-muted text-[10px] sm:text-xs text-muted-foreground">Sem capa</div>
              }
                    <div className="p-1.5 sm:p-2 space-y-0.5 sm:space-y-1">
                      <h3 className="text-[10px] sm:text-xs font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors">{item.title}</h3>
                      <div className="flex items-center gap-1">
                        <Avatar className="h-3.5 w-3.5 sm:h-4 sm:w-4">
                          <AvatarImage src={item.owner_avatar || undefined} />
                          <AvatarFallback className="text-[7px] sm:text-[8px]">{item.owner_name?.[0]?.toUpperCase() || '?'}</AvatarFallback>
                        </Avatar>
                        <span className="text-[9px] sm:text-[10px] text-muted-foreground truncate">{item.owner_name}</span>
                      </div>
                    </div>
                  </Link>
            )}
              </div> :


          profiles.length === 0 ?
          <p className="text-xs sm:text-sm text-muted-foreground text-center py-12">Nenhum perfil publicado ainda.</p> :

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
                {profiles.map((prof, index) =>
            <Link
              key={prof.slug}
              to={`/${prof.slug}`}
              className="group overflow-hidden rounded-lg border bg-card hover:shadow-md transition-all duration-300 animate-fade-in"
              style={{ animationDelay: `${300 + index * 60}ms`, animationFillMode: 'both' }}>
              
                    {prof.cover_url ?
              <img src={prof.cover_url} alt={prof.full_name} className="aspect-[4/3] w-full object-cover transition-transform duration-300 group-hover:scale-105" /> :

              <div className="flex aspect-[4/3] w-full items-center justify-center bg-muted">
                        <Avatar className="h-12 w-12 sm:h-16 sm:w-16">
                          <AvatarImage src={prof.avatar_url || undefined} />
                          <AvatarFallback className="text-base sm:text-lg">{prof.full_name?.[0]?.toUpperCase() || '?'}</AvatarFallback>
                        </Avatar>
                      </div>
              }
                    <div className="p-1.5 sm:p-2 space-y-0.5">
                      <h3 className="text-[10px] sm:text-xs font-semibold text-foreground line-clamp-1 group-hover:text-primary transition-colors">{prof.full_name}</h3>
                      {prof.company_name &&
                <p className="text-[9px] sm:text-[10px] text-muted-foreground truncate">{prof.company_name}</p>
                }
                    </div>
                  </Link>
            )}
              </div>

          }
        </div>
      </section>

      {/* Features */}
      <section className="py-10 sm:py-24 border-t border-border bg-muted/30 animate-fade-in" style={{ animationDelay: '400ms', animationFillMode: 'both' }}>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-lg sm:text-3xl font-bold text-foreground">Ganhe tempo para criar</h2>
            <p className="mt-2 sm:mt-3 text-xs sm:text-base text-muted-foreground max-w-xl mx-auto">
              Plataforma completa para automatizar burocracias.
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
            {features.map((f, index) =>
            <div
              key={f.title}
              className="rounded-lg border bg-card p-3 sm:p-5 space-y-2 sm:space-y-3 transition-all duration-300 hover:shadow-md animate-fade-in"
              style={{ animationDelay: `${500 + index * 80}ms`, animationFillMode: 'both' }}>
              
                <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-md bg-primary/10">
                  <f.icon className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                </div>
                <h3 className="text-xs sm:text-base font-semibold text-foreground">{f.title}</h3>
                <p className="text-[10px] sm:text-sm text-muted-foreground leading-relaxed">{f.description}</p>
              </div>
            )}
          </div>
          <div className="text-center mt-6 sm:mt-10 animate-fade-in" style={{ animationDelay: '800ms', animationFillMode: 'both' }}>
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

      {/* Footer */}
      <footer className="py-6 sm:py-8 border-t border-border animate-fade-in" style={{ animationDelay: '900ms', animationFillMode: 'both' }}>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
            <img src={SimboloOras} alt="ORAS" className="h-5 sm:h-6 w-auto" />
            <p className="text-[10px] sm:text-sm text-muted-foreground">
              © {new Date().getFullYear()} ORAS. Gestão de Projetos e Horas.
            </p>
          </div>
        </div>
      </footer>
    </div>);

};