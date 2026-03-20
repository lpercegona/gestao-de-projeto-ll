import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';

interface ProfileData {
  full_name: string | null;
  company_name: string | null;
  avatar_url: string | null;
  cover_url: string | null;
  owner_id: string;
}

interface ServiceItem {
  id: string;
  service: string;
  description: string | null;
  hours: number;
  price_per_hour: number;
  image_url: string | null;
  billing_type: string;
}

interface PortfolioItem {
  id: string;
  title: string;
  description: string | null;
  cover_url: string | null;
  service_name: string | null;
}

export const PublicProfile: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!slug) { setNotFound(true); setLoading(false); return; }

      const { data: profileData } = await supabase.rpc('get_public_profile' as any, { p_slug: slug });
      
      if (!profileData || (profileData as any[]).length === 0) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      const p = (profileData as any[])[0] as ProfileData;
      setProfile(p);

      const [servicesRes, portfolioRes] = await Promise.all([
        supabase.rpc('get_public_profile_services' as any, { p_slug: slug }),
        supabase.rpc('get_public_portfolio' as any, { p_slug: slug }),
      ]);

      setServices((servicesRes.data as ServiceItem[]) || []);
      setPortfolio((portfolioRes.data as PortfolioItem[]) || []);
      setLoading(false);
    };
    fetchData();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background text-center px-4">
        <h1 className="text-2xl font-semibold text-foreground">Perfil não encontrado</h1>
        <p className="text-sm text-muted-foreground mt-2">Este perfil não existe ou está desativado.</p>
      </div>
    );
  }

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
    : '?';

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  return (
    <div className="min-h-screen bg-background">
      {/* Cover */}
      <div className="relative w-full h-48 md:h-64 bg-muted overflow-hidden">
        {profile?.cover_url ? (
          <img src={profile.cover_url} alt="Capa" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5" />
        )}
      </div>

      {/* Profile header */}
      <div className="max-w-4xl mx-auto px-4 -mt-12 relative z-10">
        <div className="flex items-end gap-4">
          <Avatar className="h-24 w-24 border-4 border-background shadow-lg">
            <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.full_name || ''} />
            <AvatarFallback className="text-xl bg-primary/10 text-primary">{initials}</AvatarFallback>
          </Avatar>
          <div className="pb-2">
            <h1 className="text-xl md:text-2xl font-bold text-foreground">{profile?.full_name || 'Sem nome'}</h1>
            {profile?.company_name && (
              <p className="text-sm text-muted-foreground">{profile.company_name}</p>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-10">
        {/* Portfolio */}
        {portfolio.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-4">Portfólio</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {portfolio.map(item => (
                <Link
                  key={item.id}
                  to={`/${slug}/${item.id}`}
                  className="group overflow-hidden rounded-lg border bg-card hover:shadow-md transition-shadow"
                >
                  {item.cover_url ? (
                    <img src={item.cover_url} alt={item.title} className="aspect-[4/3] w-full object-cover" />
                  ) : (
                    <div className="flex aspect-[4/3] w-full items-center justify-center bg-muted text-xs text-muted-foreground">
                      Sem capa
                    </div>
                  )}
                  <div className="p-2">
                    <h3 className="text-xs font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                      {item.title}
                    </h3>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Services */}
        {services.length > 0 ? (
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-4">Serviços</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {services.map((s) => (
                <Card key={s.id} className="overflow-hidden hover:shadow-md transition-shadow">
                  {s.image_url && (
                    <div className="h-36 overflow-hidden">
                      <img src={s.image_url} alt={s.service} className="w-full h-full object-cover" />
                    </div>
                  )}
                  <CardContent className="p-4 space-y-2">
                    <h3 className="text-sm font-semibold text-foreground">{s.service}</h3>
                    {s.description && (
                      <p className="text-xs text-muted-foreground line-clamp-3">{s.description}</p>
                    )}
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-xs text-muted-foreground">
                        {s.billing_type === 'monthly' ? 'Mensal' : 'Único'} · {s.hours}h
                      </span>
                      <span className="text-sm font-semibold text-foreground">
                        {formatCurrency(s.hours * s.price_per_hour)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ) : portfolio.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-12">Nenhum serviço disponível no momento.</p>
        ) : null}
      </div>
    </div>
  );
};
