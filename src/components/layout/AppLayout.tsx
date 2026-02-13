import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useGlobalTimer } from "@/contexts/GlobalTimerContext";
import { supabase } from "@/integrations/supabase/client";
import {
  LayoutDashboard,
  Users,
  FolderKanban,
  FileBarChart,
  Settings,
  LogOut,
  Shield,
  UserCog,
  PanelLeftClose,
  PanelLeft,
  Calendar,
  Database,
  Boxes,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { HeaderTimerDisplay, HeaderTimerTaskInfo } from "@/components/timer/HeaderTimerDisplay";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { UniversalSearchBar } from "@/components/layout/UniversalSearchBar";
import { WorkspaceSelector } from "@/components/layout/WorkspaceSelector";
import LogoOras from "@/assets/logo-oras.svg";

// Mobile Header Component with animated logo/task info
const MobileHeader: React.FC<{
  setSidebarOpen: (open: boolean) => void;
  hideTimer?: boolean;
}> = ({ setSidebarOpen, hideTimer = false }) => {
  const { hasActiveTimer } = useGlobalTimer();

  return (
    <div className="sticky top-0 z-30 flex flex-shrink-0 items-center justify-between gap-2 bg-[#f1f5f9] px-4 py-3 sm:px-6 lg:hidden">
      <button
        className="flex-shrink-0 rounded-md p-2 text-[#64748b] hover:bg-white/70"
        onClick={() => setSidebarOpen(true)}
      >
        <span className="sr-only">Abrir menu</span>
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      <div className="relative flex-1 min-w-0 overflow-hidden">
        {/* Busca fica alinhada à esquerda e sobe quando o timer está ativo */}
        <div
          className={cn(
            "transition-all duration-300 ease-in-out",
            hasActiveTimer && !hideTimer ? "-translate-y-8 opacity-0 pointer-events-none" : "translate-y-0 opacity-100",
          )}
        >
          <div className="flex justify-start">
            <UniversalSearchBar />
          </div>
        </div>

        {/* Info do registro assume toda a largura restante quando ativo */}
        <div
          className={cn(
            "absolute inset-0 flex items-center transition-all duration-300 ease-in-out",
            hasActiveTimer && !hideTimer ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0 pointer-events-none",
          )}
        >
          <HeaderTimerTaskInfo />
        </div>
      </div>

      <div className="flex flex-shrink-0 items-center gap-1 text-[#64748b]">
        {!hideTimer && <HeaderTimerDisplay />}
        <NotificationBell />
      </div>
    </div>
  );
};

// Desktop Header Component with breadcrumb, search and timer
const DesktopHeader: React.FC<{
  hideTimer?: boolean;
}> = ({ hideTimer = false }) => {
  const { hasActiveTimer } = useGlobalTimer();
  return (
    <div className="fixed left-0 right-0 top-0 z-30 hidden h-14 bg-[#f1f5f9] lg:flex">
      <div className="ml-12 flex w-full items-center justify-between px-6">
        {/* Left: Breadcrumb */}
        <BreadcrumbNav />

        {/* Center: Search */}
        <div className="flex-1 flex justify-center px-4">
          <UniversalSearchBar />
        </div>

        {/* Right: Timer + Notifications */}
        <div className="flex items-center gap-3 text-[#64748b]">
          {/* Task info - slides in from left when timer active (only if timer not hidden) */}
          {!hideTimer && (
            <div
              className={cn(
                "transition-all duration-300 ease-in-out overflow-hidden",
                hasActiveTimer ? "max-w-[250px] opacity-100" : "max-w-0 opacity-0",
              )}
            >
              <HeaderTimerTaskInfo />
            </div>
          )}

          {!hideTimer && <HeaderTimerDisplay />}
          <NotificationBell />
        </div>
      </div>
    </div>
  );
};
interface AppLayoutProps {
  children: React.ReactNode;
}
export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut, isMasterAdmin, isAdmin, isCollaborator, isClient, userRole } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem("sidebar-collapsed");
    return saved ? JSON.parse(saved) : false;
  });
  const [isHovering, setIsHovering] = useState(false);
  const [userAvatar, setUserAvatar] = useState<string | null>(null);

  // Persist collapsed state
  useEffect(() => {
    localStorage.setItem("sidebar-collapsed", JSON.stringify(isCollapsed));
  }, [isCollapsed]);

  // Fetch user avatar
  useEffect(() => {
    const fetchAvatar = async () => {
      if (!user) return;
      try {
        const { data } = await supabase.from("profiles").select("avatar_url").eq("user_id", user.id).maybeSingle();
        if (data?.avatar_url) {
          setUserAvatar(data.avatar_url);
        }
      } catch (err) {
        console.error("Error fetching avatar:", err);
      }
    };
    fetchAvatar();
  }, [user]);
  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  // Master Admin nav items (full access)
  const masterAdminNavItems = [
    {
      path: "/",
      icon: LayoutDashboard,
      label: "Painel",
    },
    {
      path: "/projects",
      icon: FolderKanban,
      label: "Projetos",
    },
    {
      path: "/clients",
      icon: Users,
      label: "Clientes",
    },

    {
      path: "/calendar",
      icon: Calendar,
      label: "Calendário",
    },
    {
      path: "/services",
      icon: Boxes,
      label: "Serviços",
    },
    {
      path: "/database-queries",
      icon: Database,
      label: "Strings",
    },
  ];

  // Admin nav items
  const adminNavItems = [
    {
      path: "/",
      icon: LayoutDashboard,
      label: "Painel",
    },
    {
      path: "/projects",
      icon: FolderKanban,
      label: "Projetos",
    },
    {
      path: "/clients",
      icon: Users,
      label: "Clientes",
    },

    {
      path: "/calendar",
      icon: Calendar,
      label: "Calendário",
    },
    {
      path: "/services",
      icon: Boxes,
      label: "Serviços",
    },
  ];

  // Collaborator nav items (dashboard and projects)
  const collaboratorNavItems = [
    {
      path: "/collaborator-dashboard",
      icon: LayoutDashboard,
      label: "Painel",
    },
    {
      path: "/projects",
      icon: FolderKanban,
      label: "Projetos",
    },
  ];

  // Client nav items (dashboard, reports, projects and calendar)
  const clientNavItems = [
    {
      path: "/",
      icon: LayoutDashboard,
      label: "Painel",
    },
    {
      path: "/my-projects",
      icon: FolderKanban,
      label: "Projetos",
    },

    {
      path: "/calendar",
      icon: Calendar,
      label: "Calendário",
    },

    {
      path: "/my-reports",
      icon: FileBarChart,
      label: "Relatórios",
    },
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
      case "master_admin":
        return "Master Admin";
      case "admin":
        return "Administrador";
      case "collaborator":
        return "Colaborador";
      case "client":
        return "Cliente";
      default:
        return "Usuário";
    }
  };

  // Get role badge variant
  const getRoleBadgeVariant = () => {
    switch (userRole) {
      case "master_admin":
        return "default";
      case "admin":
        return "secondary";
      case "collaborator":
        return "outline";
      default:
        return "outline";
    }
  };

  // Get user initials for avatar fallback
  const getUserInitials = () => {
    if (!user?.email) return "U";
    return user.email.charAt(0).toUpperCase();
  };
  return (
    <TooltipProvider delayDuration={0}>
      <div className="flex h-screen overflow-hidden bg-[#f1f5f9]">
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
            "fixed inset-y-0 left-0 z-50 flex h-screen flex-col bg-[#f1f5f9] transition-all duration-300 lg:static",
            isCollapsed ? "lg:w-12" : "lg:w-64",
            "w-64",
            // Mobile always full width
            sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          )}
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
        >
          {/* Header with workspace selector */}
          <div
            className={cn(
              "relative flex h-14 flex-shrink-0 items-center",
              isCollapsed ? "lg:px-2 lg:justify-center" : "px-4",
            )}
          >
            <div className="flex items-center justify-start w-full">
              {/* Desktop: Workspace selector */}
              <div className="hidden lg:flex w-full justify-start">
                <WorkspaceSelector isCollapsed={isCollapsed} />
              </div>
              {/* Mobile: Workspace selector (always expanded) */}
              <div className="lg:hidden w-full">
                <WorkspaceSelector isCollapsed={false} />
              </div>
            </div>

            {/* Mobile close button */}
            <button
              className="absolute right-2 top-2 rounded-md p-2 text-[#64748b] hover:bg-white/70 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            >
              <span className="sr-only">Fechar menu</span>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Collapse toggle (desktop only) */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "absolute -right-2 top-1/2 z-10 hidden h-4 w-4 -translate-y-1/2 rounded-full border border-[#e2e8f0] bg-white p-0 text-[#64748b] shadow-sm transition-opacity duration-200 lg:flex",
                  isHovering ? "opacity-100" : "opacity-0",
                )}
                onClick={() => setIsCollapsed(!isCollapsed)}
              >
                {isCollapsed ? <PanelLeft className="h-3 w-3" /> : <PanelLeftClose className="h-3 w-3" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">{isCollapsed ? "Expandir menu" : "Recolher menu"}</TooltipContent>
          </Tooltip>

          {/* Navigation - Scrollable area */}
          <nav className="flex-1 overflow-y-auto p-2">
            <ul className="space-y-1">
              {navItems.map((item) => {
                const isActive = location.pathname === item.path;
                const NavLink = (
                  <Link
                    to={item.path}
                    onClick={() => setSidebarOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-medium text-[#64748b] transition-colors",
                      isActive
                        ? "border border-[#e2e8f0] bg-white text-[#0f172a]"
                        : "hover:bg-white/70 hover:text-[#334155]",
                      isCollapsed && "lg:justify-center lg:px-0 lg:h-8 lg:w-8 lg:mx-auto",
                    )}
                  >
                    <item.icon className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className={cn("transition-opacity duration-300", isCollapsed && "lg:hidden")}>
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
                        <TooltipContent side="right">{item.label}</TooltipContent>
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
          <div className={cn("flex-shrink-0 space-y-2 p-3", isCollapsed && "lg:p-2")}>
            {/* User info */}
            {user && (
              <div
                className={cn("flex items-center gap-3 px-2 py-2", isCollapsed && "lg:justify-center lg:px-0 lg:py-1")}
              >
                <Avatar className={cn("flex-shrink-0", isCollapsed ? "h-8 w-8" : "h-9 w-9")}>
                  <AvatarImage src={userAvatar || undefined} alt="Avatar" />
                  <AvatarFallback className="bg-white text-[#0f172a] text-sm border border-[#e2e8f0]">
                    {getUserInitials()}
                  </AvatarFallback>
                </Avatar>
                <div className={cn("flex-1 min-w-0 transition-opacity duration-300", isCollapsed && "lg:hidden")}>
                  <p className="text-sm font-medium text-foreground truncate">{user.email}</p>
                  <Badge variant={getRoleBadgeVariant()} className="text-xs mt-1">
                    {isMasterAdmin && <Shield className="w-3 h-3 mr-1" />}
                    {isAdmin && !isMasterAdmin && <UserCog className="w-3 h-3 mr-1" />}
                    {getRoleLabel()}
                  </Badge>
                </div>
              </div>
            )}

            {/* Settings link */}
            {isCollapsed ? (
              <Tooltip>
                <TooltipTrigger asChild className="hidden lg:flex">
                  <Link
                    to="/preferences"
                    onClick={() => setSidebarOpen(false)}
                    className={cn(
                      "mx-auto flex h-8 w-8 items-center justify-center rounded-lg text-xs font-medium text-[#64748b] transition-colors",
                      location.pathname === "/preferences"
                        ? "border border-[#e2e8f0] bg-white text-[#0f172a]"
                        : "hover:bg-white/70 hover:text-[#334155]",
                    )}
                  >
                    <Settings className="w-3.5 h-3.5" />
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right">Configurações</TooltipContent>
                <Link
                  to="/preferences"
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    "lg:hidden flex items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-medium text-[#64748b] transition-colors",
                    location.pathname === "/preferences"
                      ? "border border-[#e2e8f0] bg-white text-[#0f172a]"
                      : "hover:bg-white/70 hover:text-[#334155]",
                  )}
                >
                  <Settings className="w-3.5 h-3.5" />
                  Configurações
                </Link>
              </Tooltip>
            ) : (
              <Link
                to="/preferences"
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-medium text-[#64748b] transition-colors",
                  location.pathname === "/preferences"
                    ? "border border-[#e2e8f0] bg-white text-[#0f172a]"
                    : "hover:bg-white/70 hover:text-[#334155]",
                )}
              >
                <Settings className="w-3.5 h-3.5" />
                Configurações
              </Link>
            )}

            {/* Sign out button */}
            {isCollapsed ? (
              <Tooltip>
                <TooltipTrigger asChild className="hidden lg:flex">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="mx-auto h-8 w-8 text-[#64748b] hover:bg-white/70 hover:text-[#334155]"
                    onClick={handleSignOut}
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">Sair</TooltipContent>
                <Button
                  variant="ghost"
                  className="lg:hidden w-full justify-start text-[#64748b] hover:bg-white/70 hover:text-[#334155]"
                  onClick={handleSignOut}
                >
                  <LogOut className="w-3.5 h-3.5 mr-2" />
                  Sair
                </Button>
              </Tooltip>
            ) : (
              <Button
                variant="ghost"
                className="w-full justify-start text-[#64748b] hover:bg-white/70 hover:text-[#334155]"
                onClick={handleSignOut}
              >
                <LogOut className="w-3.5 h-3.5 mr-2" />
                Sair
              </Button>
            )}

            {/* Version */}
            <div className={cn("px-3 py-2 text-xs text-[#94a3b8]", isCollapsed && "lg:hidden")}>Versão 1.0</div>
          </div>
        </aside>

        {/* Main Content - Scrollable */}
        <main className="flex-1 flex flex-col h-screen overflow-hidden">
          {/* Mobile header - hide timer for clients */}
          <MobileHeader setSidebarOpen={setSidebarOpen} hideTimer={isClient} />

          {/* Desktop header buttons - hide timer for clients */}
          <DesktopHeader hideTimer={isClient} />

          {/* Content area - Scrollable, with top padding for fixed header on desktop */}
          <div className="flex-1 overflow-auto lg:pt-[58px]">
            <div className="min-h-full rounded-tl-[12px] rounded-tr-[12px] sm:rounded-tr-none bg-white px-4 py-4 sm:px-6 sm:py-5 lg:px-8">
              {children}
            </div>
          </div>
        </main>
      </div>
    </TooltipProvider>
  );
};
