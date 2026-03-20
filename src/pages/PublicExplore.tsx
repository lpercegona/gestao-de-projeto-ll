import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, ArrowLeft } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

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
  full_name: string | null;
  company_name: string | null;
  avatar_url: string | null;
  cover_url: string | null;
  slug: string | null;
}

export const PublicExplore: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') === 'profiles' ? 'profiles' : 'projects';
  const [tab, setTab] = useState<'projects' | 'profiles'>(initialTab);
  const [projects, setProjects] = useState<PortfolioItem[]>([]);
  const [profiles, setProfiles] = useState<ProfileItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const [projectsRes, profilesRes] = await Promise.all([
        supabase.rpc('get_all_public_portfolio' as any),
        supabase.rpc('get_all_public_profiles' as any),
      ]);
      setProjects((projectsRes.data as PortfolioItem[]) || []);
      setProfiles((profilesRes.data as ProfileItem[]) || []);
      setLoading(false);
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-4 w-4" /> Voltar ao início
        </Link>

        <h1 className="text-2xl font-bold text-foreground mb-6">Explorar</h1>

        <Tabs value={tab} onValueChange={(v) => setTab(v as 'projects' | 'profiles')}>
          <TabsList>
            <TabsTrigger value="projects">Projetos</TabsTrigger>
            <TabsTrigger value="profiles">Perfis</TabsTrigger>
          </TabsList>

          <TabsContent value="projects" className="mt-6">
            {projects.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-12">Nenhum projeto publicado ainda.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {projects.map((item) => (
                  <Link
                    key={item.id}
                    to={`/${item.owner_slug}/${item.id}?from=list`}
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
          </TabsContent>

          <TabsContent value="profiles" className="mt-6">
            {profiles.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-12">Nenhum perfil público disponível.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {profiles.map((profile) => (
                  <Link
                    key={profile.slug}
                    to={`/${profile.slug}`}
                    className="group flex flex-col items-center rounded-lg border bg-card p-4 hover:shadow-md transition-shadow text-center"
                  >
                    <Avatar className="h-16 w-16 mb-3">
                      <AvatarImage src={profile.avatar_url || undefined} />
                      <AvatarFallback className="text-lg bg-primary/10 text-primary">
                        {profile.full_name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                      {profile.full_name || 'Sem nome'}
                    </h3>
                    {profile.company_name && (
                      <p className="text-xs text-muted-foreground mt-0.5">{profile.company_name}</p>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};
