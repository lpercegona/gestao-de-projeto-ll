import React from 'react';
import { useData } from '@/contexts/DataContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, FolderKanban, ListTodo, Loader2, FileCheck, Plus } from 'lucide-react';
import { QuickActionsPanel } from '@/components/dashboard/QuickActionsPanel';
import { DashboardCalendar } from '@/components/dashboard/DashboardCalendar';
import { SolicitacoesPanel } from '@/components/dashboard/SolicitacoesPanel';
import { HorasPorClientePanel } from '@/components/dashboard/HorasPorClientePanel';
import { ProximasEntregasPanel } from '@/components/dashboard/ProximasEntregasPanel';
import { UltimosRegistrosPanel } from '@/components/dashboard/UltimosRegistrosPanel';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const Dashboard: React.FC = () => {
  const { data, loading } = useData();
  const [proposalCount, setProposalCount] = useState(0);

  // Fetch proposal count
  useEffect(() => {
    const fetchProposalCount = async () => {
      const { count } = await supabase
        .from('proposals')
        .select('*', { count: 'exact', head: true })
        .in('status', ['draft', 'sent', 'viewed']);
      setProposalCount(count || 0);
    };
    fetchProposalCount();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Filtros de dados
  const activeProjects = data.projects.filter(p => p.status !== 'completed' && p.status !== 'cancelled');
  const pendingTasks = data.tasks.filter(t => t.status !== 'completed' && t.status !== 'done');

  const stats = [
    {
      title: 'Clientes',
      value: data.clients.length,
      icon: Users,
      description: 'Total de clientes',
    },
    {
      title: 'Projetos',
      value: activeProjects.length,
      icon: FolderKanban,
      description: 'Projetos ativos',
    },
    {
      title: 'Tarefas',
      value: pendingTasks.length,
      icon: ListTodo,
      description: 'Tarefas pendentes',
    },
    {
      title: 'Propostas',
      value: proposalCount,
      icon: FileCheck,
      description: 'Pendentes ou enviadas',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Layout Principal: 70% / 30% */}
      <div className="grid lg:grid-cols-[1fr_380px] gap-6">
        
        {/* COLUNA DIREITA - Aparece PRIMEIRO no mobile */}
        <div className="space-y-6 order-first lg:order-last">
          <QuickActionsPanel />
          <DashboardCalendar />
        </div>
        
        {/* COLUNA ESQUERDA - Aparece DEPOIS no mobile */}
        <div className="space-y-6 order-last lg:order-first">
          
          {/* Stats Row - 2 colunas mobile, 3 tablet, 5 desktop */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {stats.map((stat) => (
              <Card key={stat.title}>
                <CardHeader className="flex flex-row items-center justify-between pb-2 p-4">
                  <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </CardTitle>
                  <stat.icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="text-xl sm:text-2xl font-bold text-foreground">{stat.value}</div>
                  <p className="text-[10px] sm:text-xs text-muted-foreground mt-1 truncate">{stat.description}</p>
                </CardContent>
              </Card>
            ))}
            
            {/* Card customizável com bordas pontilhadas */}
            <Card className="border-dashed border-2 border-muted-foreground/30 hover:border-primary/50 transition-colors cursor-pointer">
              <CardContent className="flex items-center justify-center h-full p-4 min-h-[100px]">
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <Plus className="h-6 w-6" />
                  <span className="text-xs">Personalizar</span>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Content Area - 2 colunas desktop, 1 mobile */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-6">
              <SolicitacoesPanel />
              <ProximasEntregasPanel />
            </div>
            <div className="space-y-6">
              <HorasPorClientePanel />
              <UltimosRegistrosPanel />
            </div>
          </div>
        </div>
        
      </div>
    </div>
  );
};
