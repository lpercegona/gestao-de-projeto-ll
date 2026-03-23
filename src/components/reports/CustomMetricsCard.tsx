import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3 } from 'lucide-react';

export interface CustomMetricConfig {
  id?: string;
  label: string;
  entity_type: 'projects' | 'tasks';
  category_source: 'status' | 'custom_field' | 'kanban_stage';
  category_field_id: string | null;
  category_value: string;
  display_type: 'count' | 'percentage';
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

interface Props {
  metrics: CustomMetricConfig[];
  projects: Project[];
  tasks: Task[];
}

export const CustomMetricsCard: React.FC<Props> = ({ metrics, projects, tasks }) => {
  const computedMetrics = useMemo(() => {
    return metrics.map(metric => {
      const items = metric.entity_type === 'projects' ? projects : tasks;
      const totalItems = items.length;

      let matchCount = 0;

      if (metric.category_source === 'status') {
        matchCount = items.filter(item => item.status === metric.category_value).length;
      } else if (metric.category_source === 'custom_field' && metric.category_field_id) {
        // Only applies to projects (tasks don't have custom_fields)
        if (metric.entity_type === 'projects') {
          matchCount = projects.filter(p => {
            const fields = p.custom_fields || {};
            return fields[metric.category_field_id!] === metric.category_value;
          }).length;
        }
      } else if (metric.category_source === 'kanban_stage') {
        // Kanban stages map to project status
        if (metric.entity_type === 'projects') {
          matchCount = projects.filter(p => p.status === metric.category_value).length;
        } else {
          matchCount = tasks.filter(t => t.status === metric.category_value).length;
        }
      }

      const displayValue = metric.display_type === 'percentage'
        ? totalItems > 0 ? `${((matchCount / totalItems) * 100).toFixed(1)}%` : '0%'
        : String(matchCount);

      return {
        ...metric,
        displayValue,
        matchCount,
        totalItems,
      };
    });
  }, [metrics, projects, tasks]);

  if (metrics.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <BarChart3 className="w-4 h-4" />
          Métricas Personalizadas
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {computedMetrics.map((metric, index) => (
            <div key={metric.id || index}>
              <p className="text-xs text-muted-foreground">{metric.label}</p>
              <p className="text-lg font-semibold text-foreground">{metric.displayValue}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
