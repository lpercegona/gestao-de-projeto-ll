import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  FolderKanban,
  CheckCircle2,
  Clock,
  Edit,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  project_id: string | null;
  is_read: boolean;
  created_at: string;
}

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
  onDelete: (id: string) => void;
}

const getIcon = (type: string) => {
  switch (type) {
    case 'project_created':
      return <FolderKanban className="h-4 w-4 text-primary" />;
    case 'project_updated':
      return <Edit className="h-4 w-4 text-blue-500" />;
    case 'task_created':
      return <Plus className="h-4 w-4 text-green-500" />;
    case 'task_updated':
      return <Edit className="h-4 w-4 text-orange-500" />;
    case 'task_completed':
      return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    case 'time_entry':
      return <Clock className="h-4 w-4 text-purple-500" />;
    default:
      return <FolderKanban className="h-4 w-4 text-muted-foreground" />;
  }
};

export const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  onMarkAsRead,
  onDelete,
}) => {
  const timeAgo = formatDistanceToNow(new Date(notification.created_at), {
    addSuffix: true,
    locale: ptBR,
  });

  const handleClick = () => {
    if (!notification.is_read) {
      onMarkAsRead(notification.id);
    }
  };

  return (
    <div
      className={cn(
        'group relative flex gap-3 p-3 hover:bg-accent/50 cursor-pointer transition-colors',
        !notification.is_read && 'bg-accent/30'
      )}
      onClick={handleClick}
    >
      {/* Unread indicator */}
      {!notification.is_read && (
        <div className="absolute left-1 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-primary" />
      )}

      {/* Icon */}
      <div className="flex-shrink-0 mt-0.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
          {getIcon(notification.type)}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground line-clamp-1">
          {notification.title}
        </p>
        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
          {notification.message}
        </p>
        <p className="text-xs text-muted-foreground/70 mt-1">{timeAgo}</p>
      </div>

      {/* Delete button */}
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
        onClick={e => {
          e.stopPropagation();
          onDelete(notification.id);
        }}
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
};
