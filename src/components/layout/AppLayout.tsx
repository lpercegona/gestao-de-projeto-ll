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
  UserCog
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
    { path: '/users', icon: UsersRound, label: 'Usuários' },
    { path: '/settings', icon: Settings, label: 'Configurações' },
  ];

  // Admin nav items
  const adminNavItems = [
    { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/clients', icon: Users, label: 'Clientes' },
    { path: '/projects', icon: FolderKanban, label: 'Projetos' },
    { path: '/reports', icon: FileBarChart, label: 'Relatórios' },
    { path: '/users', icon: UsersRound, label: 'Usuários' },
    { path: '/settings', icon: Settings, label: 'Configurações' },
  ];

  // Collaborator nav items (only projects)
  const collaboratorNavItems = [
    { path: '/projects', icon: FolderKanban, label: 'Meus Projetos' },
  ];

  // Client nav items (only reports)
  const clientNavItems = [
    { path: '/my-reports', icon: FileBarChart, label: 'Meus Relatórios' },
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

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-card flex flex-col">
        <div className="p-6 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Clock className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-semibold text-foreground">HorasPro</span>
          </div>
        </div>
        
        <nav className="flex-1 p-4">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
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
          <Button
            variant="ghost"
            className="w-full justify-start text-muted-foreground hover:text-foreground"
            onClick={handleSignOut}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sair
          </Button>
          <div className="px-3 py-2 text-xs text-muted-foreground">
            Versão MVP 1.0
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  );
};
