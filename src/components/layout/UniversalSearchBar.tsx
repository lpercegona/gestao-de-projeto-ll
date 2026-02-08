import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, FolderKanban, Users, ListTodo, FileCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { useData } from '@/contexts/DataContext';

export const UniversalSearchBar: React.FC = () => {
  const [open, setOpen] = useState(false);
  const { data } = useData();
  const navigate = useNavigate();

  // Listen for keyboard shortcut
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(true);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const handleSelect = (type: string, id: string) => {
    setOpen(false);
    switch (type) {
      case 'project':
        navigate(`/projects/${id}`);
        break;
      case 'client':
        navigate(`/clients/${id}`);
        break;
      case 'task':
        // Find the project for this task and navigate there
        const task = data.tasks.find(t => t.id === id);
        if (task) {
          navigate(`/projects/${task.project_id}`);
        }
        break;
    }
  };

  return (
    <>
      <Button
        variant="ghost"
        onClick={() => setOpen(true)}
        className="relative h-11 w-10 sm:w-full max-w-[2.5rem] sm:max-w-sm lg:max-w-2xl justify-start rounded-full border border-[#e2e8f0] bg-white px-3 sm:px-4 text-[#64748b] shadow-none hover:bg-white hover:text-[#64748b]"
      >
        <Search className="h-4 w-4 sm:mr-3" />
        <span className="sr-only sm:hidden">Pesquisar</span>
        <span className="hidden sm:inline-flex">Em qual projeto trabalhará hoje?</span>
        <kbd className="pointer-events-none absolute right-3 top-1/2 hidden h-5 -translate-y-1/2 select-none items-center gap-1 rounded border border-[#e2e8f0] bg-white px-1.5 font-mono text-[10px] font-medium text-[#64748b] opacity-100 sm:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Pesquisar projetos, clientes, tarefas..." />
        <CommandList>
          <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>
          
          {data.projects.length > 0 && (
            <CommandGroup heading="Projetos">
              {data.projects.slice(0, 5).map(project => {
                const client = data.clients.find(c => c.id === project.client_id);
                return (
                  <CommandItem
                    key={project.id}
                    value={`project-${project.name}-${client?.name || ''}`}
                    onSelect={() => handleSelect('project', project.id)}
                  >
                    <FolderKanban className="h-4 w-4 mr-2 text-muted-foreground" />
                    <div className="flex flex-col">
                      <span>{project.name}</span>
                      {client && (
                        <span className="text-xs text-muted-foreground">
                          {client.company || client.name}
                        </span>
                      )}
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          )}

          {data.clients.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Clientes">
                {data.clients.slice(0, 5).map(client => (
                  <CommandItem
                    key={client.id}
                    value={`client-${client.company || ''}-${client.name}`}
                    onSelect={() => handleSelect('client', client.id)}
                  >
                    <Users className="h-4 w-4 mr-2 text-muted-foreground" />
                    <div className="flex flex-col">
                      <span>{client.company || client.name}</span>
                      <span className="text-xs text-muted-foreground">{client.email}</span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}

          {data.tasks.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Tarefas">
                {data.tasks.slice(0, 5).map(task => {
                  const project = data.projects.find(p => p.id === task.project_id);
                  return (
                    <CommandItem
                      key={task.id}
                      value={`task-${task.name}-${project?.name || ''}`}
                      onSelect={() => handleSelect('task', task.id)}
                    >
                      <ListTodo className="h-4 w-4 mr-2 text-muted-foreground" />
                      <div className="flex flex-col">
                        <span>{task.name}</span>
                        {project && (
                          <span className="text-xs text-muted-foreground">{project.name}</span>
                        )}
                      </div>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
};
