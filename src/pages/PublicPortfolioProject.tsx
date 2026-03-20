import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, ArrowLeft } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface ProjectData {
  id: string;
  title: string;
  description: string;
  cover_url: string | null;
  service_name: string | null;
}

interface ProjectImage {
  id: string;
  image_url: string;
  sort_order: number;
}

export const PublicPortfolioProject: React.FC = () => {
  const { slug, projectId } = useParams<{ slug: string; projectId: string }>();
  const [project, setProject] = useState<ProjectData | null>(null);
  const [images, setImages] = useState<ProjectImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!slug || !projectId) { setNotFound(true); setLoading(false); return; }

      const { data: projectData } = await supabase.rpc('get_public_portfolio_project' as any, {
        p_slug: slug, p_project_id: projectId
      });

      if (!projectData || (projectData as any[]).length === 0) {
        setNotFound(true); setLoading(false); return;
      }

      setProject((projectData as any[])[0] as ProjectData);

      const { data: imagesData } = await supabase.rpc('get_public_portfolio_images' as any, {
        p_slug: slug, p_project_id: projectId
      });
      setImages((imagesData as ProjectImage[]) || []);
      setLoading(false);
    };
    fetchData();
  }, [slug, projectId]);

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
        <h1 className="text-2xl font-semibold text-foreground">Projeto não encontrado</h1>
        <p className="text-sm text-muted-foreground mt-2">Este projeto não existe ou está oculto.</p>
        {slug && (
          <Link to={`/${slug}`} className="mt-4 text-sm text-primary hover:underline">
            ← Voltar ao perfil
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <Link to={`/${slug}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-4 w-4" /> Voltar ao perfil
        </Link>

        <h1 className="text-2xl md:text-3xl font-bold text-foreground">{project?.title}</h1>

        {project?.service_name && (
          <Badge variant="secondary" className="mt-2">{project.service_name}</Badge>
        )}

        {project?.description && (
          <p className="text-sm text-muted-foreground mt-4 whitespace-pre-line">{project.description}</p>
        )}

        {/* Images gallery */}
        {images.length > 0 && (
          <div className="mt-8 space-y-4">
            {images.map(img => (
              <img
                key={img.id}
                src={img.image_url}
                alt={project?.title || ''}
                className="w-full rounded-lg"
                loading="lazy"
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
