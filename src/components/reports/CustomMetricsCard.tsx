import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface CustomMetric {
  id?: string;
  label: string;
  entity_type: string;
  category_source: string;
  category_field_id: string | null;
  category_value: string;
  display_type: string;
  sort_order: number;
  block_title?: string;
}

interface Project {
  id: string;
  name: string;
  status: string;
  custom_fields?: Record<string, string> | null;
  monthHours?: number;
}

interface Task {
  id: string;
  name: string;
  status: string;
  project_id: string;
  monthHours?: number;
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
    const isProjectEntity = metric.entity_type === 'projects';
    const items = isProjectEntity ? projects : tasks;

    // --- Helper: check if an item matches the metric filter ---
    const itemMatches = (item: typeof items[number]): boolean => {
      if (metric.category_source === 'status') {
        return item.status === metric.category_value;
      }
      if (metric.category_source === 'kanban_stage') {
        const stage = kanbanStages.find(s => s.name === metric.category_value);
        if (!stage) return false;
        return item.status === stage.name || item.status === stage.id;
      }
      if (metric.category_source === 'custom_field' && metric.category_field_id) {
        const col = projectColumns.find(c => c.id === metric.category_field_id);
        if (!col) return false;
        if (isProjectEntity) {
          const fields = (item as Project).custom_fields as Record<string, string> | null;
          return fields?.[col.id] === metric.category_value;
        } else {
          // For tasks, check the parent project's custom_fields
          const parentProject = projects.find(p => p.id === (item as Task).project_id);
          const fields = parentProject?.custom_fields as Record<string, string> | null;
          return fields?.[col.id] === metric.category_value;
        }
      }
      return false;
    };

    if (metric.display_type === 'percentage') {
      // Hours-based percentage
      if (isProjectEntity) {
        const totalHours = projects.reduce((sum, p) => sum + (p.monthHours || 0), 0);
        const matchHours = projects.filter(p => itemMatches(p)).reduce((sum, p) => sum + (p.monthHours || 0), 0);
        return totalHours > 0 ? `${((matchHours / totalHours) * 100).toFixed(1)}%` : '0%';
      } else {
        const totalHours = tasks.reduce((sum, t) => sum + (t.monthHours || 0), 0);
        const matchHours = tasks.filter(t => itemMatches(t)).reduce((sum, t) => sum + (t.monthHours || 0), 0);
        return totalHours > 0 ? `${((matchHours / totalHours) * 100).toFixed(1)}%` : '0%';
      }
    }

    // Count mode
    const matchCount = items.filter(item => itemMatches(item)).length;
    return String(matchCount);
  };

  // Group metrics by block_title
  const groups: Record<string, CustomMetric[]> = {};
  metrics.forEach(metric => {
    const key = metric.block_title || '';
    if (!groups[key]) groups[key] = [];
    groups[key].push(metric);
  });

  return (
    <>
      {Object.entries(groups).map(([blockTitle, blockMetrics]) => (
        <Card key={blockTitle}>
          {blockTitle && (
            <CardHeader>
              <CardTitle className="text-base">{blockTitle}</CardTitle>
            </CardHeader>
          )}
          <CardContent className={blockTitle ? '' : 'pt-4'}>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {blockMetrics.map((metric, i) => (
                <div key={metric.id || i}>
                  <p className="text-xs text-muted-foreground">{metric.label}</p>
                  <p className="text-lg font-semibold text-foreground">{computeMetric(metric)}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </>
  );
};
