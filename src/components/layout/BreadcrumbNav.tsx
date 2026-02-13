import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

// Route to label mapping
const routeLabels: Record<string, string> = {
  '/': 'Painel',
  '/clients': 'Clientes',
  '/projects': 'Projetos',
  '/requests': 'Solicitações',
  '/edit-requests': 'Edições',
  '/proposals': 'Propostas',
  '/contracts': 'Contratos',
  '/services': 'Serviços',
  '/reports': 'Relatórios',
  '/users': 'Usuários',
  '/preferences': 'Configurações',
  '/calendar': 'Calendário',
  '/collaborator-dashboard': 'Painel',
  '/client-dashboard': 'Painel',
  '/my-reports': 'Meus Relatórios',
  '/my-projects': 'Meus Projetos',
};

export const BreadcrumbNav: React.FC = () => {
  const location = useLocation();
  const pathSegments = location.pathname.split('/').filter(Boolean);

  // Build breadcrumb items
  const breadcrumbItems: { label: string; path: string; isLast: boolean }[] = [];

  // Handle root path
  if (pathSegments.length === 0) {
    breadcrumbItems.push({ label: 'Painel', path: '/', isLast: true });
  } else {
    // Check if it's a detail page (e.g., /clients/123)
    let currentPath = '';
    pathSegments.forEach((segment, index) => {
      currentPath += `/${segment}`;
      const isLast = index === pathSegments.length - 1;

      // Check if this is a UUID (detail page)
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment);

      if (isUuid) {
        // This is a detail page, use "Detalhes" as label
        breadcrumbItems.push({ label: 'Detalhes', path: currentPath, isLast });
      } else {
        const label = routeLabels[currentPath] || segment.charAt(0).toUpperCase() + segment.slice(1);
        breadcrumbItems.push({ label, path: currentPath, isLast });
      }
    });
  }

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {breadcrumbItems.map((item, index) => (
          <React.Fragment key={item.path}>
            {index > 0 && (
              <BreadcrumbSeparator>
                <ChevronRight className="h-3.5 w-3.5" />
              </BreadcrumbSeparator>
            )}
            <BreadcrumbItem>
              {item.isLast ? (
                <BreadcrumbPage className="font-medium">{item.label}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink asChild>
                  <Link to={item.path} className="hover:text-foreground transition-colors">
                    {item.label}
                  </Link>
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
          </React.Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
};
