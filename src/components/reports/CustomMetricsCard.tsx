import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3 } from 'lucide-react';

interface CustomMetric {
  id?: string;
  label: string;
  entity_type: string;
  category_source: string;
  category_field_id: string | null;
  category_value: string;
  display_type: string;
  sort_order: number;
}

interface Project {
  id: string;
  name: string;
  status: string;
  custom_fields?: Record<string, string> | null;
}

interface Task {
  id: string;
  name: string;
  status: string;
  project_id: string;
}

interface KanbanStage {
  id: string;
  name: string;
}

interface ProjectColumn {
  id: string;
  name: string;
  type: string;
  options: string[] | null;
}

interface Props {
  metrics: CustomMetric[];
  projects: Project[];
  tasks: Task[];
  kanbanStages?: KanbanStage[];
  projectColumns?: ProjectColumn[];
}

export const CustomMetricsCard: React.FC<Props> = ({
  metrics,
  projects,
  tasks,
  kanbanStages = [],
  projectColumns = [],
}) => {
  if (!metrics.length) return null;

  const computeMetric = (metric: CustomMetric) => {
    const items = metric.entity_type === 'projects' ? projects : tasks;
    const totalItems = items.length;

    let matchCount = 0;

    if (metric.category_source === 'status') {
      matchCount = items.filter(item => item.status === metric.category_value).length;
    } else if (metric.category_source === 'kanban_stage') {
      // Kanban stages apply to projects only
      const stage = kanbanStages.find(s => s.name === metric.category_value);
      if (stage) {
        matchCount = projects.filter(p => p.status === stage.name || p.status === stage.id).length;
      }
    } else if (metric.category_source === 'custom_field' && metric.category_field_id) {
      const col = projectColumns.find(c => c.id === metric.category_field_id);
      if (col) {
        if (metric.entity_type === 'projects') {
          matchCount = projects.filter(p => {
            const fields = p.custom_fields as Record<string, string> | null;
            return fields?.[col.id] === metric.category_value;
          }).length;
        } else {
          // For tasks, check parent project's custom fields
          const matchingProjectIds = new Set(
            projects
              .filter(p => {
                const fields = p.custom_fields as Record<string, string> | null;
                return fields?.[col.name] === metric.category_value;
              })
              .map(p => p.id)
          );
          matchCount = tasks.filter(t => matchingProjectIds.has(t.project_id)).length;
        }
      }
    }

    if (metric.display_type === 'percentage') {
      return totalItems > 0 ? `${((matchCount / totalItems) * 100).toFixed(1)}%` : '0%';
    }
    return String(matchCount);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-primary" />
          <CardTitle className="text-base">Métricas Personalizadas</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {metrics.map((metric, i) => (
            <div key={metric.id || i}>
              <p className="text-xs text-muted-foreground">{metric.label}</p>
              <p className="text-lg font-semibold text-foreground">{computeMetric(metric)}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
