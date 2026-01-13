import React from 'react';
import { useData } from '@/contexts/DataContext';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, FolderKanban, ListTodo, Clock, Loader2 } from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { data, loading, getClientHours } = useData();

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
      title: 'Horas Registradas',
      value: `${totalHours}h`,
      icon: Clock,
      description: `de ${totalContractedHours}h contratadas`,
    },
  ];

  const recentProjects = data.projects.slice(0, 5);

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Visão geral do sistema de gestão de projetos"
      />

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{stat.value}</div>
              <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Projetos Recentes</CardTitle>
          </CardHeader>
          <CardContent>
            {recentProjects.length === 0 ? (
              <p className="text-muted-foreground text-sm">Nenhum projeto criado ainda.</p>
            ) : (
              <ul className="space-y-3">
                {recentProjects.map((project) => {
                  const client = data.clients.find(c => c.id === project.client_id);
                  return (
                    <li key={project.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                      <div>
                        <p className="font-medium text-foreground">{project.name}</p>
                        <p className="text-sm text-muted-foreground">{client?.name || 'Cliente não encontrado'}</p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        project.status === 'active' ? 'bg-green-100 text-green-800' :
                        project.status === 'paused' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-muted text-muted-foreground'
                      }`}>
                        {project.status === 'active' ? 'Ativo' : 
                         project.status === 'paused' ? 'Pausado' : 'Concluído'}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Resumo de Horas por Cliente</CardTitle>
          </CardHeader>
          <CardContent>
            {data.clients.length === 0 ? (
              <p className="text-muted-foreground text-sm">Nenhum cliente cadastrado ainda.</p>
            ) : (
              <ul className="space-y-3">
                {data.clients.map((client) => {
                  const usedHours = getClientHours(client.id);
                  const percentage = client.contracted_hours > 0 
                    ? Math.min((usedHours / client.contracted_hours) * 100, 100)
                    : 0;
                  return (
                    <li key={client.id} className="py-2 border-b border-border last:border-0">
                      <div className="flex justify-between mb-1">
                        <span className="font-medium text-foreground">{client.name}</span>
                        <span className="text-sm text-muted-foreground">
                          {usedHours}h / {client.contracted_hours}h
                        </span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full transition-all"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
