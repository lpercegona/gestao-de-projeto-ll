import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export interface ProjectAccessUserProfile {
  user_id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
}

interface ProjectAccessAvatarsProps {
  users: ProjectAccessUserProfile[];
  maxVisible?: number;
  sizeClassName?: string;
}

const getUserInitials = (user: ProjectAccessUserProfile) => {
  const baseName = user.full_name || user.email || "U";
  return baseName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "U";
};

export const ProjectAccessAvatars: React.FC<ProjectAccessAvatarsProps> = ({
  users,
  maxVisible = 4,
  sizeClassName = "h-6 w-6",
}) => {
  if (users.length === 0) return null;

  const visibleUsers = users.slice(0, maxVisible);
  const hiddenCount = Math.max(users.length - maxVisible, 0);

  return (
    <div className="flex items-center -space-x-2">
      {visibleUsers.map((user) => {
        const label = user.full_name || user.email || "Usuário";
        return (
          <Avatar key={user.user_id} className={`${sizeClassName} border-2 border-background`} title={label}>
            <AvatarImage src={user.avatar_url || undefined} alt={label} />
            <AvatarFallback className="text-[10px] bg-primary/10 text-primary">{getUserInitials(user)}</AvatarFallback>
          </Avatar>
        );
      })}

      {hiddenCount > 0 && (
        <div className={`${sizeClassName} rounded-full border-2 border-background bg-muted text-[10px] font-medium text-muted-foreground flex items-center justify-center`}>
          +{hiddenCount}
        </div>
      )}
    </div>
  );
};

