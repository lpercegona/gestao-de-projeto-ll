import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { 
  LayoutDashboard, 
  Users, 
  FolderKanban, 
  FileBarChart, 
  Settings,
  Clock,
  LogOut,
  UsersRound,
  Shield,
  UserCog,
  FileText,
  User
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface AppLayoutProps {
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut, isMasterAdmin, isAdmin, isCollaborator, isClient, userRole } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  // Master Admin nav items (full access)
  const masterAdminNavItems = [
    { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/clients', icon: Users, label: 'Clientes' },
    { path: '/projects', icon: FolderKanban, label: 'Projetos' },
    { path: '/reports', icon: FileBarChart, label: 'Relatórios' },
    { path: '/requests', icon: FileText, label: 'Solicitações' },
    { path: '/users', icon: UsersRound, label: 'Usuários' },
    { path: '/settings', icon: Settings, label: 'Configurações' },
  ];

  // Admin nav items
  const adminNavItems = [
    { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/clients', icon: Users, label: 'Clientes' },
    { path: '/projects', icon: FolderKanban, label: 'Projetos' },
    { path: '/reports', icon: FileBarChart, label: 'Relatórios' },
    { path: '/requests', icon: FileText, label: 'Solicitações' },
    { path: '/users', icon: UsersRound, label: 'Usuários' },
    { path: '/settings', icon: Settings, label: 'Configurações' },
  ];

  // Collaborator nav items (only projects)
  const collaboratorNavItems = [
    { path: '/projects', icon: FolderKanban, label: 'Meus Projetos' },
  ];

  // Client nav items (reports and projects)
  const clientNavItems = [
    { path: '/my-reports', icon: FileBarChart, label: 'Meus Relatórios' },
    { path: '/my-projects', icon: FolderKanban, label: 'Meus Projetos' },
  ];

  // Select nav items based on role
  const getNavItems = () => {
    if (isMasterAdmin) return masterAdminNavItems;
    if (isAdmin) return adminNavItems;
    if (isCollaborator) return collaboratorNavItems;
    return clientNavItems;
  };

  const navItems = getNavItems();

  // Get role display label
  const getRoleLabel = () => {
    switch (userRole) {
      case 'master_admin':
        return 'Master Admin';
      case 'admin':
        return 'Administrador';
      case 'collaborator':
        return 'Colaborador';
      case 'client':
        return 'Cliente';
      default:
        return 'Usuário';
    }
  };

  // Get role badge variant
  const getRoleBadgeVariant = () => {
    switch (userRole) {
      case 'master_admin':
        return 'default';
      case 'admin':
        return 'secondary';
      case 'collaborator':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  return (
    <div className="flex min-h-screen bg-background">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 border-r border-border bg-card flex flex-col transition-transform duration-300 lg:translate-x-0 lg:static",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-4 sm:p-6 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <Clock className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-semibold text-foreground">ORAS</span>
            </div>
            <button 
              className="lg:hidden p-2 rounded-md hover:bg-accent"
              onClick={() => setSidebarOpen(false)}
            >
              <span className="sr-only">Fechar menu</span>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        
        <nav className="flex-1 p-4 overflow-y-auto">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    onClick={() => setSidebarOpen(false)}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                    )}
                  >
                    <item.icon className="w-5 h-5" />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="p-4 border-t border-border space-y-3">
          {user && (
            <div className="px-3 py-2 space-y-2">
              <p className="text-sm font-medium text-foreground truncate">{user.email}</p>
              <Badge variant={getRoleBadgeVariant()} className="text-xs">
                {isMasterAdmin && <Shield className="w-3 h-3 mr-1" />}
                {isAdmin && <UserCog className="w-3 h-3 mr-1" />}
                {getRoleLabel()}
              </Badge>
            </div>
          )}
          <Link
            to="/profile"
            onClick={() => setSidebarOpen(false)}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors',
              location.pathname === '/profile'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            )}
          >
            <User className="w-5 h-5" />
            Meu Perfil
          </Link>
          <Button
            variant="ghost"
            className="w-full justify-start text-muted-foreground hover:text-foreground"
            onClick={handleSignOut}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sair
          </Button>
          <div className="px-3 py-2 text-xs text-muted-foreground">
            Versão 1.0
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {/* Mobile header */}
        <div className="sticky top-0 z-30 flex items-center gap-4 border-b border-border bg-background px-4 py-3 lg:hidden">
          <button 
            className="p-2 rounded-md hover:bg-accent"
            onClick={() => setSidebarOpen(true)}
          >
            <span className="sr-only">Abrir menu</span>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-primary flex items-center justify-center">
              <Clock className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-semibold text-foreground">ORAS</span>
          </div>
        </div>
        
        <div className="p-4 sm:p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
};
