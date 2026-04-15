import React, { useState, useMemo } from "react";
import { CalendarClock, ChevronDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { useData } from "@/contexts/DataContext";
import { useAuth } from "@/contexts/AuthContext";
import { UpcomingDeadlines, DeadlineItem } from "@/components/dashboard/UpcomingDeadlines";
import { getDeadlineStatus } from "@/lib/deadlineUtils";
import { FormSheet } from "@/components/ui/form-sheet";
import { ProjectDetailDialogContent } from "@/components/projects/ProjectDetailDialogContent";
import { TaskDetailDialogContent } from "@/components/projects/TaskDetailDialogContent";
import { useNavigate } from "react-router-dom";

const ALLOWED_STATUSES = new Set(["active", "in_progress", "pending"]);

export const ProximasEntregasPanel: React.FC = () => {
  const [isOpen, setIsOpen] = useState(true);
  const { data, loading, getProjectHours, getTaskHours, getCreatorName, getClientColumns } = useData();
  const { user, isAdminOrMaster, isClient } = useAuth();
  const navigate = useNavigate();

  const [detailItem, setDetailItem] = useState<{ type: 'project' | 'task'; id: string; projectId?: string } | null>(null);

  const upcomingDeadlines = useMemo((): DeadlineItem[] => {
    if (loading) return [];

    const itemsWithDeadline: DeadlineItem[] = [];
    const itemsWithoutDeadline: DeadlineItem[] = [];

    data.tasks
      .filter((t) => {
        const project = data.projects.find((p) => p.id === t.project_id);
        return ALLOWED_STATUSES.has(t.status) && !!project && ALLOWED_STATUSES.has(project.status);
      })
      .forEach((t) => {
        const project = data.projects.find((p) => p.id === t.project_id);
        const client = project ? data.clients.find((c) => c.id === project.client_id) : null;

        if (t.due_date) {
          const status = getDeadlineStatus(t.due_date);
          if (status) {
            itemsWithDeadline.push({
              id: t.id,
              type: "task",
              name: t.name,
              due_date: t.due_date,
              projectId: t.project_id,
              projectName: project?.name,
              clientName: (client as any)?.company || client?.name,
              status,
              created_at: t.created_at,
            });
          }
        } else {
          itemsWithoutDeadline.push({
            id: t.id,
            type: "task",
            name: t.name,
            due_date: "",
            projectId: t.project_id,
            projectName: project?.name,
            clientName: (client as any)?.company || client?.name,
            status: "normal",
            created_at: t.created_at,
          });
        }
      });

    itemsWithDeadline.sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
    itemsWithoutDeadline.sort((a, b) => new Date(b.created_at!).getTime() - new Date(a.created_at!).getTime());

    return [...itemsWithDeadline, ...itemsWithoutDeadline].slice(0, 10);
  }, [data.tasks, data.projects, data.clients, loading]);

  const handleItemClick = (item: DeadlineItem) => {
    if (item.type === 'project') {
      setDetailItem({ type: 'project', id: item.id });
    } else {
      setDetailItem({ type: 'task', id: item.id, projectId: item.projectId });
    }
  };

  const getStatusLabel = (s: string) => 
    s === 'active' ? 'Ativo' : s === 'paused' ? 'Pausado' : s === 'archived' ? 'Arquivado' : s === 'completed' ? 'Concluído' : s;
  
  const getStatusColor = (s: string) => 
    s === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 
    s === 'paused' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' : 
    'bg-muted text-muted-foreground';

  const detailProject = detailItem?.type === 'project' 
    ? data.projects.find((p) => p.id === detailItem.id) 
    : detailItem?.type === 'task' 
      ? data.projects.find((p) => p.id === detailItem.projectId)
      : null;

  const detailTask = detailItem?.type === 'task' ? data.tasks.find((t) => t.id === detailItem.id) : null;

  const navigateToProject = (projectId: string) => {
    setDetailItem(null);
    navigate(`/projects/${projectId}`);
  };

  return (
    <>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors rounded-t-lg pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
                  <CalendarClock className="h-4 w-4" />
                  Próximas Entregas
                  {upcomingDeadlines.length > 0 && (
                    <Badge variant="outline" className="ml-1 bg-blue-500/10">
                      {upcomingDeadlines.length}
                    </Badge>
                  )}
                </CardTitle>
                <ChevronDown
                  className={cn("h-4 w-4 text-muted-foreground transition-transform", isOpen && "rotate-180")}
                />
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0">
              <UpcomingDeadlines items={upcomingDeadlines} onItemClick={handleItemClick} />
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Project Detail FormSheet */}
      {detailItem?.type === 'project' && detailProject && (
        <FormSheet
          open
          onOpenChange={(open) => !open && setDetailItem(null)}
          title="Detalhes do Projeto"
        >
          <ProjectDetailDialogContent
            project={{ ...detailProject, custom_fields: (detailProject.custom_fields || {}) as Record<string, string> }}
            clients={data.clients as any[]}
            tasks={data.tasks as any[]}
            timeEntries={data.timeEntries as any[]}
            projectColumns={data.projectColumns as any[]}
            kanbanStages={data.kanbanStages as any[]}
            taskTimers={data.taskTimers as any[]}
            projectAccess={data.projectAccess as any[]}
            profilesByUserId={{}}
            projectMembers={[]}
            isAdminOrMaster={isAdminOrMaster}
            isClientMode={!!isClient}
            hasPerTaskPermissions={false}
            currentUserId={user?.id}
            getProjectHours={getProjectHours}
            getTaskHours={getTaskHours}
            getCreatorName={getCreatorName}
            getClientColumns={getClientColumns}
            getStatusLabel={getStatusLabel}
            getStatusColor={getStatusColor}
            onEditProject={() => navigateToProject(detailProject.id)}
            onDeleteProject={() => navigateToProject(detailProject.id)}
            onArchiveProject={() => navigateToProject(detailProject.id)}
            onEditTask={() => navigateToProject(detailProject.id)}
            onDeleteTask={() => navigateToProject(detailProject.id)}
            onClose={() => setDetailItem(null)}
          />
        </FormSheet>
      )}

      {/* Task Detail FormSheet - opens parent project context */}
      {detailItem?.type === 'task' && detailProject && (
        <FormSheet
          open
          onOpenChange={(open) => !open && setDetailItem(null)}
          title="Detalhes do Projeto"
        >
          <ProjectDetailDialogContent
            project={{ ...detailProject, custom_fields: (detailProject.custom_fields || {}) as Record<string, string> }}
            clients={data.clients as any[]}
            tasks={data.tasks as any[]}
            timeEntries={data.timeEntries as any[]}
            projectColumns={data.projectColumns as any[]}
            kanbanStages={data.kanbanStages as any[]}
            taskTimers={data.taskTimers as any[]}
            projectAccess={data.projectAccess as any[]}
            profilesByUserId={{}}
            projectMembers={[]}
            isAdminOrMaster={isAdminOrMaster}
            isClientMode={!!isClient}
            hasPerTaskPermissions={false}
            currentUserId={user?.id}
            getProjectHours={getProjectHours}
            getTaskHours={getTaskHours}
            getCreatorName={getCreatorName}
            getClientColumns={getClientColumns}
            getStatusLabel={getStatusLabel}
            getStatusColor={getStatusColor}
            onEditProject={() => navigateToProject(detailProject.id)}
            onDeleteProject={() => navigateToProject(detailProject.id)}
            onArchiveProject={() => navigateToProject(detailProject.id)}
            onEditTask={() => navigateToProject(detailProject.id)}
            onDeleteTask={() => navigateToProject(detailProject.id)}
            onClose={() => setDetailItem(null)}
          />
        </FormSheet>
      )}
    </>
  );
};
