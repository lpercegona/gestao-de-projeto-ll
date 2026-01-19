import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { LayoutList, Columns3 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Client {
  id: string;
  name: string;
}

interface ProjectFiltersProps {
  clients: Client[];
  selectedClientId: string;
  onClientChange: (clientId: string) => void;
  viewMode: 'list' | 'kanban';
  onViewModeChange: (mode: 'list' | 'kanban') => void;
}

export const ProjectFilters: React.FC<ProjectFiltersProps> = ({
  clients,
  selectedClientId,
  onClientChange,
  viewMode,
  onViewModeChange,
}) => {
  return (
    <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Filtrar:</span>
        <Select value={selectedClientId} onValueChange={onClientChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Todos os clientes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os clientes</SelectItem>
            {clients.map((client) => (
              <SelectItem key={client.id} value={client.id}>
                {client.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      <div className="flex items-center gap-1 border rounded-lg p-1 bg-muted/50">
        <Button
          variant={viewMode === 'list' ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => onViewModeChange('list')}
          className={cn("px-3", viewMode === 'list' && "shadow-sm")}
        >
          <LayoutList className="w-4 h-4 mr-2" />
          Lista
        </Button>
        <Button
          variant={viewMode === 'kanban' ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => onViewModeChange('kanban')}
          className={cn("px-3", viewMode === 'kanban' && "shadow-sm")}
        >
          <Columns3 className="w-4 h-4 mr-2" />
          Kanban
        </Button>
      </div>
    </div>
  );
};
