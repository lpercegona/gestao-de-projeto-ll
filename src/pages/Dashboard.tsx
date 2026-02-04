import React from 'react';
import { useData } from '@/contexts/DataContext';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, FolderKanban, ListTodo, Clock, Loader2, FileCheck } from 'lucide-react';
import { QuickTimeTracker } from '@/components/dashboard/QuickTimeTracker';
import { QuickActionsPanel } from '@/components/dashboard/QuickActionsPanel';
import { DashboardCalendar } from '@/components/dashboard/DashboardCalendar';
import { SolicitacoesPanel } from '@/components/dashboard/SolicitacoesPanel';
import { HorasPorClientePanel } from '@/components/dashboard/HorasPorClientePanel';
import { ProximasEntregasPanel } from '@/components/dashboard/ProximasEntregasPanel';
import { UltimosRegistrosPanel } from '@/components/dashboard/UltimosRegistrosPanel';
import { formatHours } from '@/lib/formatHours';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const Dashboard: React.FC = () => {
  const { data, loading, getClientHours } = useData();
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

  const totalHours = data.clients.reduce((sum, client) => sum + getClientHours(client.id), 0);
  const totalContractedHours = data.clients.reduce((sum, client) => sum + client.contracted_hours, 0);

  const stats = [
    {
      title: 'Clientes',
      value: data.clients.length,
      icon: Users,
      description: 'Total de clientes',
    },
    {
      title: 'Projetos',
      value: data.projects.length,
      icon: FolderKanban,
      description: 'Projetos ativos e concluídos',
    },
    {
      title: 'Tarefas',
      value: data.tasks.length,
      icon: ListTodo,
      description: 'Total de tarefas',
    },
    {
      title: 'Propostas',
      value: proposalCount,
      icon: FileCheck,
      description: 'Pendentes ou enviadas',
    },
    {
      title: 'Horas',
      value: formatHours(totalHours),
      icon: Clock,
      description: `de ${formatHours(totalContractedHours)} contratadas`,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Painel"
        description="Visão geral do sistema de gestão de projetos"
      />

      {/* Layout Principal: 70% / 30% */}
      <div className="grid lg:grid-cols-[1fr_380px] gap-6">
        
        {/* COLUNA DIREITA - Aparece PRIMEIRO no mobile */}
        <div className="space-y-6 order-first lg:order-last">
          <QuickActionsPanel />
          <QuickTimeTracker />
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
