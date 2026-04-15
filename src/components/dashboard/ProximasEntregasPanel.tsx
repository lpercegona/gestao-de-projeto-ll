import React, { useState, useMemo } from "react";
import { CalendarClock, ChevronDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { useData } from "@/contexts/DataContext";
import { UpcomingDeadlines, DeadlineItem } from "@/components/dashboard/UpcomingDeadlines";
import { getDeadlineStatus } from "@/lib/deadlineUtils";
import { ProjectDetailSheet } from "@/components/projects/ProjectDetailSheet";

const ALLOWED_STATUSES = new Set(["active", "in_progress", "pending"]);

export const ProximasEntregasPanel: React.FC = () => {
  const [isOpen, setIsOpen] = useState(true);
  const { data, loading } = useData();
  const [detailProjectId, setDetailProjectId] = useState<string | null>(null);

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
            itemsWithDeadline.push({ id: t.id, type: "task", name: t.name, due_date: t.due_date, projectId: t.project_id, projectName: project?.name, clientName: (client as any)?.company || client?.name, status, created_at: t.created_at });
          }
        } else {
          itemsWithoutDeadline.push({ id: t.id, type: "task", name: t.name, due_date: "", projectId: t.project_id, projectName: project?.name, clientName: (client as any)?.company || client?.name, status: "normal", created_at: t.created_at });
        }
      });

    itemsWithDeadline.sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
    itemsWithoutDeadline.sort((a, b) => new Date(b.created_at!).getTime() - new Date(a.created_at!).getTime());
    return [...itemsWithDeadline, ...itemsWithoutDeadline].slice(0, 10);
  }, [data.tasks, data.projects, data.clients, loading]);

  const handleItemClick = (item: DeadlineItem) => {
    const projectId = item.type === "project" ? item.id : item.projectId;
    if (projectId) setDetailProjectId(projectId);
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
                    <Badge variant="outline" className="ml-1 bg-blue-500/10">{upcomingDeadlines.length}</Badge>
                  )}
                </CardTitle>
                <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", isOpen && "rotate-180")} />
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

      <ProjectDetailSheet
        projectId={detailProjectId}
        open={!!detailProjectId}
        onOpenChange={(open) => { if (!open) setDetailProjectId(null); }}
      />
    </>
  );
};
