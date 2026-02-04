import React from 'react';
import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

interface WorkspaceSelectorProps {
  isCollapsed?: boolean;
}

export const WorkspaceSelector: React.FC<WorkspaceSelectorProps> = ({ isCollapsed = false }) => {
  const { user } = useAuth();

  // Get initials from email
  const getInitials = () => {
    if (!user?.email) return 'W';
    return user.email.charAt(0).toUpperCase();
  };

  // Get workspace name (using email domain or user email)
  const getWorkspaceName = () => {
    if (!user?.email) return 'Workspace';
    const domain = user.email.split('@')[1];
    if (domain) {
      return domain.split('.')[0].charAt(0).toUpperCase() + domain.split('.')[0].slice(1);
    }
    return 'Workspace';
  };

  // Collapsed mode: show only avatar with tooltip
  if (isCollapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Avatar className="h-7 w-7">
              <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                {getInitials()}
              </AvatarFallback>
            </Avatar>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right">
          <div>
            <p className="font-medium">{getWorkspaceName()}</p>
            <p className="text-xs text-muted-foreground">{user?.email}</p>
          </div>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          className="w-full justify-between h-auto hover:bg-accent/50 p-2"
        >
          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8 shrink-0">
              <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                {getInitials()}
              </AvatarFallback>
            </Avatar>
            <div className="text-left min-w-0">
              <p className="text-sm font-medium truncate">{getWorkspaceName()}</p>
              <p className="text-xs text-muted-foreground truncate">Plano Profissional</p>
            </div>
          </div>
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <div className="px-2 py-1.5">
          <p className="text-sm font-medium">{getWorkspaceName()}</p>
          <p className="text-xs text-muted-foreground">{user?.email}</p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled className="text-muted-foreground">
          Trocar workspace (em breve)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
