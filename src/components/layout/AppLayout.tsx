import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
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
  User,
  PanelLeftClose,
  PanelLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { NotificationBell } from '@/components/notifications/NotificationBell';

interface AppLayoutProps {
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut, isMasterAdmin, isAdmin, isCollaborator, isClient, userRole } = useAuth();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebar-collapsed');
    return saved ? JSON.parse(saved) : false;
  });
  const [isHovering, setIsHovering] = useState(false);
  const [userAvatar, setUserAvatar] = useState<string | null>(null);

  // Persist collapsed state
  useEffect(() => {
    localStorage.setItem('sidebar-collapsed', JSON.stringify(isCollapsed));
  }, [isCollapsed]);

  // Fetch user avatar
  useEffect(() => {
    const fetchAvatar = async () => {
      if (!user) return;
      
      try {
        const { data } = await supabase
          .from('profiles')
          .select('avatar_url')
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (data?.avatar_url) {
          setUserAvatar(data.avatar_url);
        }
      } catch (err) {
        console.error('Error fetching avatar:', err);
      }
    };

    fetchAvatar();
  }, [user]);

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

  // Get user initials for avatar fallback
  const getUserInitials = () => {
    if (!user?.email) return 'U';
    return user.email.charAt(0).toUpperCase();
  };

  return (
    <TooltipProvider delayDuration={0}>
      <div className="flex h-screen bg-background overflow-hidden">
        {/* Mobile overlay */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar - Fixed height 100vh */}
        <aside 
          className={cn(
            "fixed inset-y-0 left-0 z-50 h-screen border-r border-border bg-card flex flex-col transition-all duration-300 lg:static",
            isCollapsed ? "lg:w-16" : "lg:w-64",
            "w-64", // Mobile always full width
            sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
          )}
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
        >
          {/* Header with logo and collapse button */}
          <div className={cn(
            "p-4 border-b border-border flex-shrink-0",
            isCollapsed && "lg:px-2"
          )}>
            <div className="flex items-center justify-between h-8">
              {/* Logo */}
              <div className={cn(
                "flex items-center",
                isCollapsed && "lg:justify-center lg:w-full"
              )}>
                {/* Desktop: show "O" when collapsed, "ORAS" when expanded */}
                <span className={cn(
                  "hidden lg:block text-xl font-bold text-primary",
                  isCollapsed ? "" : ""
                )}>
                  {isCollapsed ? "O" : "ORAS"}
                </span>
                {/* Mobile: always show full text */}
                <span className="lg:hidden text-xl font-bold text-primary">ORAS</span>
              </div>

              {/* Collapse toggle (desktop only, visible on hover) */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "hidden lg:flex h-8 w-8 transition-opacity duration-200",
                      isHovering ? "opacity-100" : "opacity-0"
                    )}
                    onClick={() => setIsCollapsed(!isCollapsed)}
                  >
                    {isCollapsed ? (
                      <PanelLeft className="h-4 w-4" />
                    ) : (
                      <PanelLeftClose className="h-4 w-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  {isCollapsed ? 'Expandir menu' : 'Recolher menu'}
                </TooltipContent>
              </Tooltip>
              
              {/* Mobile close button */}
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
          
          {/* Navigation - Scrollable area */}
          <nav className="flex-1 p-2 overflow-y-auto">
            <ul className="space-y-1">
              {navItems.map((item) => {
                const isActive = location.pathname === item.path;
                const NavLink = (
                  <Link
                    to={item.path}
                    onClick={() => setSidebarOpen(false)}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                      isCollapsed && 'lg:justify-center lg:px-2'
                    )}
                  >
                    <item.icon className="w-5 h-5 flex-shrink-0" />
                    <span className={cn(
                      "transition-opacity duration-300",
                      isCollapsed && "lg:hidden"
                    )}>
                      {item.label}
                    </span>
                  </Link>
                );

                return (
                  <li key={item.path}>
                    {isCollapsed ? (
                      <Tooltip>
                        <TooltipTrigger asChild className="hidden lg:flex">
                          {NavLink}
                        </TooltipTrigger>
                        <TooltipContent side="right">
                          {item.label}
                        </TooltipContent>
                        <div className="lg:hidden">{NavLink}</div>
                      </Tooltip>
                    ) : (
                      NavLink
                    )}
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* User section - Fixed at bottom */}
          <div className={cn(
            "p-3 border-t border-border space-y-2 flex-shrink-0",
            isCollapsed && "lg:p-2"
          )}>
            {/* User info */}
            {user && (
              <div className={cn(
                "flex items-center gap-3 px-2 py-2",
                isCollapsed && "lg:justify-center lg:px-0"
              )}>
                <Avatar className="h-9 w-9 flex-shrink-0">
                  <AvatarImage src={userAvatar || undefined} alt="Avatar" />
                  <AvatarFallback className="bg-primary/10 text-primary text-sm">
                    {getUserInitials()}
                  </AvatarFallback>
                </Avatar>
                <div className={cn(
                  "flex-1 min-w-0 transition-opacity duration-300",
                  isCollapsed && "lg:hidden"
                )}>
                  <p className="text-sm font-medium text-foreground truncate">
                    {user.email}
                  </p>
                  <Badge variant={getRoleBadgeVariant()} className="text-xs mt-1">
                    {isMasterAdmin && <Shield className="w-3 h-3 mr-1" />}
                    {isAdmin && !isMasterAdmin && <UserCog className="w-3 h-3 mr-1" />}
                    {getRoleLabel()}
                  </Badge>
                </div>
              </div>
            )}

            {/* Profile link */}
            {isCollapsed ? (
              <Tooltip>
                <TooltipTrigger asChild className="hidden lg:flex">
                  <Link
                    to="/profile"
                    onClick={() => setSidebarOpen(false)}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors w-full',
                      location.pathname === '/profile'
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                      'lg:justify-center lg:px-2'
                    )}
                  >
                    <User className="w-5 h-5 flex-shrink-0" />
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right">Meu Perfil</TooltipContent>
                <Link
                  to="/profile"
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    'lg:hidden flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors',
                    location.pathname === '/profile'
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  )}
                >
                  <User className="w-5 h-5" />
                  Meu Perfil
                </Link>
              </Tooltip>
            ) : (
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
            )}

            {/* Sign out button */}
            {isCollapsed ? (
              <Tooltip>
                <TooltipTrigger asChild className="hidden lg:flex">
                  <Button
                    variant="ghost"
                    className="w-full justify-center text-muted-foreground hover:text-foreground px-2"
                    onClick={handleSignOut}
                  >
                    <LogOut className="w-5 h-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">Sair</TooltipContent>
                <Button
                  variant="ghost"
                  className="lg:hidden w-full justify-start text-muted-foreground hover:text-foreground"
                  onClick={handleSignOut}
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sair
                </Button>
              </Tooltip>
            ) : (
              <Button
                variant="ghost"
                className="w-full justify-start text-muted-foreground hover:text-foreground"
                onClick={handleSignOut}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sair
              </Button>
            )}

            {/* Version */}
            <div className={cn(
              "px-3 py-2 text-xs text-muted-foreground",
              isCollapsed && "lg:hidden"
            )}>
              Versão 1.0
            </div>
          </div>
        </aside>

        {/* Main Content - Scrollable */}
        <main className="flex-1 flex flex-col h-screen overflow-hidden">
          {/* Mobile header */}
          <div className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-background px-4 sm:px-6 py-3 lg:hidden flex-shrink-0">
            <div className="flex items-center gap-3">
              <button 
                className="p-2 rounded-md hover:bg-accent"
                onClick={() => setSidebarOpen(true)}
              >
                <span className="sr-only">Abrir menu</span>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <span className="font-bold text-primary text-lg">ORAS</span>
            </div>
            <NotificationBell />
          </div>

          {/* Desktop notification bell */}
          <div className="hidden lg:flex fixed top-4 right-6 z-30">
            <NotificationBell />
          </div>
          
          {/* Content area - Scrollable */}
          <div className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
            {children}
          </div>
        </main>
      </div>
    </TooltipProvider>
  );
};
