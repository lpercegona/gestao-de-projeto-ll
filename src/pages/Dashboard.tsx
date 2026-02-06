import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useData } from "@/contexts/DataContext";
import { supabase } from "@/integrations/supabase/client";
import { QuickRequestCard } from "@/components/dashboard/QuickRequestCard";
import { QuickActionsPanel } from "@/components/dashboard/QuickActionsPanel";
import { DashboardCalendar } from "@/components/dashboard/DashboardCalendar";
import { SolicitacoesPanel } from "@/components/dashboard/SolicitacoesPanel";
import { HorasPorClientePanel } from "@/components/dashboard/HorasPorClientePanel";
import { ProximasEntregasPanel } from "@/components/dashboard/ProximasEntregasPanel";
import { UltimosRegistrosPanel } from "@/components/dashboard/UltimosRegistrosPanel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { formatHours } from "@/lib/formatHours";
import {
  FolderKanban,
  CheckSquare,
  Clock,
  FileText,
  ChevronDown,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Loader2,
  Users,
  FileCheck,
  Plus,
  RefreshCw,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ProjectRequest {
  id: string;
  client_id: string;
  title: string;
  briefing: string;
  status: string;
  admin_notes: string | null;
  created_at: string;
}

export const Dashboard: React.FC = () => {
  const { user, isClient } = useAuth();
  const { data, loading, getClientHours, getClientMonthlyHours, getClientPreviousMonthOverflow } = useData();
  const [projectRequests, setProjectRequests] = useState<ProjectRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [clientInfo, setClientInfo] = useState<{
    id: string;
    contracted_hours: number;
    contract_type: "one_time" | "monthly";
    contract_end_date: string | null;
    contract_start_date: string | null;
  } | null>(null);
  const [recentRequestsOpen, setRecentRequestsOpen] = useState(true);
  const [activeProjectsOpen, setActiveProjectsOpen] = useState(true);
  const [proposalCount, setProposalCount] = useState(0);

  // Fetch client info and requests for client users
  useEffect(() => {
    const fetchClientData = async () => {
      if (!user || !isClient) {
        setLoadingRequests(false);
        return;
      }

      try {
        // Get client_id from client_users
        const { data: clientUserData } = await supabase
          .from("client_users")
          .select("client_id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (clientUserData?.client_id) {
          // Get client info
          const { data: clientData } = await supabase
            .from("clients")
            .select("id, contracted_hours, contract_type, contract_end_date, contract_start_date")
            .eq("id", clientUserData.client_id)
            .single();

          if (clientData) {
            setClientInfo({
              id: (clientData as any).id,
              contracted_hours: (clientData as any).contracted_hours,
              contract_type: ((clientData as any).contract_type as "one_time" | "monthly") || "one_time",
              contract_end_date: (clientData as any).contract_end_date || null,
              contract_start_date: (clientData as any).contract_start_date || null,
            });
          }

          // Get project requests
          const { data: requestsData } = await supabase
            .from("project_requests")
            .select("*")
            .eq("client_id", clientUserData.client_id)
            .order("created_at", { ascending: false });

          if (requestsData) {
            setProjectRequests(requestsData);
          }
        }
      } catch (err) {
        console.error("Error fetching client data:", err);
      } finally {
        setLoadingRequests(false);
      }
    };

    fetchClientData();
  }, [user, isClient]);

  // Fetch proposal count for admin
  useEffect(() => {
    if (isClient) return;

    const fetchProposalCount = async () => {
      const { count } = await supabase
        .from("proposals")
        .select("*", { count: "exact", head: true })
        .in("status", ["draft", "sent", "viewed"]);
      setProposalCount(count || 0);
    };
    fetchProposalCount();
  }, [isClient]);

  // Calculate client statistics with monthly logic
  const clientStats = useMemo(() => {
    if (!isClient || !clientInfo) return null;

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    const contractedHours = clientInfo.contracted_hours || 0;
    const isMonthly = clientInfo.contract_type === "monthly";

    // Calculate monthly hours and overflow for monthly clients
    const previousMonthOverflow = isMonthly
      ? getClientPreviousMonthOverflow(clientInfo.id, currentYear, currentMonth)
      : 0;

    const monthlyUsedHours = isMonthly
      ? getClientMonthlyHours(clientInfo.id, currentYear, currentMonth)
      : getClientHours(clientInfo.id);

    // Calculate available hours (contracted - saldo anterior)
    const availableHours = isMonthly ? Math.max(0, contractedHours - previousMonthOverflow) : contractedHours;

    const remainingHours = Math.max(0, availableHours - monthlyUsedHours);
    const hoursPercentage = availableHours > 0 ? Math.min((monthlyUsedHours / availableHours) * 100, 100) : 0;

    return {
      contractedHours,
      availableHours,
      usedHours: monthlyUsedHours,
      remainingHours,
      hoursPercentage,
      previousMonthOverflow,
      isMonthly,
    };
  }, [isClient, clientInfo, getClientHours, getClientMonthlyHours, getClientPreviousMonthOverflow]);

  // Filter data based on role
  const activeProjects = data.projects.filter((p) => p.status === "active");
  const pendingTasks = data.tasks.filter((t) => t.status === "pending" || t.status === "in_progress");

  // Request statistics for clients
  const pendingRequests = projectRequests.filter((r) => r.status === "pending");
  const analyzingRequests = projectRequests.filter((r) => r.status === "analyzing");

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="outline">
            <AlertCircle className="w-3 h-3 mr-1" />
            Pendente
          </Badge>
        );
      case "analyzing":
        return (
          <Badge variant="secondary">
            <Clock className="w-3 h-3 mr-1" />
            Em Análise
          </Badge>
        );
      case "converted":
        return (
          <Badge variant="default">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Convertido
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="destructive">
            <XCircle className="w-3 h-3 mr-1" />
            Rejeitado
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const recentRequests = projectRequests.slice(0, 5);

  if (loading || (isClient && loadingRequests)) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // CLIENT VIEW
  if (isClient) {
    const stats = [
      { label: "Projetos Ativos", value: activeProjects.length, icon: FolderKanban },
      { label: "Tarefas Pendentes", value: pendingTasks.length, icon: CheckSquare },
      { label: "Solicitações Pendentes", value: pendingRequests.length + analyzingRequests.length, icon: FileText },
      {
        label: clientStats?.isMonthly ? "Disponível este Mês" : "Horas Utilizadas",
        value: clientStats?.isMonthly
          ? formatHours(clientStats.availableHours)
          : formatHours(clientStats?.usedHours || 0),
        icon: Clock,
        extra:
          clientStats?.isMonthly && clientStats.previousMonthOverflow > 0
            ? `${formatHours(clientStats.contractedHours)} - ${formatHours(clientStats.previousMonthOverflow)} saldo ant.`
            : clientStats?.contractedHours && clientStats.contractedHours > 0
              ? `de ${formatHours(clientStats.contractedHours)}`
              : undefined,
      },
    ];

    return (
      <div className="space-y-6">
        {/* Stats Grid - Responsive */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {stats.map((stat, index) => (
            <Card key={index} className="min-w-0">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-4">
                <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground truncate pr-2">
                  {stat.label}
                </CardTitle>
                <stat.icon className="h-4 w-4 text-muted-foreground shrink-0" />
              </CardHeader>
              <CardContent className="p-3 sm:p-4 pt-0">
                <div className="text-xl sm:text-2xl font-bold">{stat.value}</div>
                {stat.extra && <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{stat.extra}</p>}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Hours Progress for Clients */}
        {clientStats && clientStats.contractedHours > 0 && (
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium">
                    {clientStats.isMonthly
                      ? `Horas do Mês - ${format(new Date(), "MMMM 'de' yyyy", { locale: ptBR })}`
                      : "Horas Contratadas"}
                  </span>
                  {clientStats.isMonthly && (
                    <Badge variant="outline" className="text-xs">
                      <RefreshCw className="w-3 h-3 mr-1" />
                      Plano Mensal
                    </Badge>
                  )}
                </div>
                <span className="text-sm text-muted-foreground">
                  {formatHours(clientStats.usedHours)} / {formatHours(clientStats.availableHours)}
                </span>
              </div>

              {/* Previous month overflow indicator */}
              {clientStats.isMonthly && clientStats.previousMonthOverflow > 0 && (
                <div className="mb-3 p-2 rounded-md bg-destructive/10 border border-destructive/30">
                  <div className="flex items-center gap-2 text-destructive">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span className="text-sm font-medium">
                      Saldo Anterior: {formatHours(clientStats.previousMonthOverflow)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Horas excedentes do mês anterior descontadas do limite deste mês
                  </p>
                </div>
              )}

              <Progress value={clientStats.hoursPercentage} className="h-2" />
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mt-1 gap-1">
                <p className="text-xs text-muted-foreground">
                  {formatHours(clientStats.remainingHours)} restantes{clientStats.isMonthly ? " este mês" : ""}
                </p>
                {clientStats.isMonthly && clientStats.usedHours > clientStats.availableHours && (
                  <p className="text-xs text-destructive">
                    ⚠️ {formatHours(clientStats.usedHours - clientStats.availableHours)} serão descontadas do próximo
                    mês
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Layout for Client */}
        <div className="grid lg:grid-cols-[1fr_320px] gap-6">
          {/* Left Column - Main Content */}
          <div className="space-y-6 order-last lg:order-first">
            {/* Recent Requests */}
            <Collapsible open={recentRequestsOpen} onOpenChange={setRecentRequestsOpen}>
              <Card>
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        Solicitações Recentes
                      </CardTitle>
                      <ChevronDown
                        className={`w-4 h-4 transition-transform ${recentRequestsOpen ? "rotate-180" : ""}`}
                      />
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="pt-0">
                    {recentRequests.length === 0 ? (
                      <p className="text-muted-foreground text-sm text-center py-4">
                        Nenhuma solicitação realizada ainda
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {recentRequests.map((request) => (
                          <div
                            key={request.id}
                            className="flex items-center justify-between p-3 rounded-lg border border-border gap-3"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate text-sm">{request.title}</p>
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(request.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                              </p>
                            </div>
                            <div className="shrink-0">{getStatusBadge(request.status)}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>

            {/* Active Projects */}
            <Collapsible open={activeProjectsOpen} onOpenChange={setActiveProjectsOpen}>
              <Card>
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <FolderKanban className="w-4 h-4" />
                        Projetos Ativos
                      </CardTitle>
                      <ChevronDown
                        className={`w-4 h-4 transition-transform ${activeProjectsOpen ? "rotate-180" : ""}`}
                      />
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="pt-0">
                    {activeProjects.length === 0 ? (
                      <p className="text-muted-foreground text-sm text-center py-4">Nenhum projeto ativo no momento</p>
                    ) : (
                      <div className="space-y-3">
                        {activeProjects.slice(0, 5).map((project) => {
                          const projectTasks = data.tasks.filter((t) => t.project_id === project.id);
                          const completedTasks = projectTasks.filter((t) => t.status === "completed");
                          const progress =
                            projectTasks.length > 0 ? (completedTasks.length / projectTasks.length) * 100 : 0;

                          return (
                            <div key={project.id} className="p-3 rounded-lg border border-border">
                              <div className="flex items-center justify-between mb-2 gap-2">
                                <p className="font-medium truncate text-sm">{project.name}</p>
                                <Badge variant="outline" className="shrink-0 text-xs">
                                  {completedTasks.length}/{projectTasks.length} tarefas
                                </Badge>
                              </div>
                              <Progress value={progress} className="h-1.5" />
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>

            {/* Upcoming Deadlines and Recent Records */}
            <div className="grid md:grid-cols-2 gap-6">
              <ProximasEntregasPanel />
              <UltimosRegistrosPanel />
            </div>
          </div>

          {/* Right Column - Actions & Calendar */}
          <div className="space-y-6 order-first lg:order-last">
            <QuickRequestCard pendingCount={pendingRequests.length + analyzingRequests.length} />
            <DashboardCalendar />
          </div>
        </div>
      </div>
    );
  }

  // ADMIN VIEW
  const adminStats = [
    { title: "Clientes", value: data.clients.length, icon: Users, description: "Total" },
    { title: "Projetos", value: activeProjects.length, icon: FolderKanban, description: "Ativos" },
    { title: "Tarefas", value: pendingTasks.length, icon: CheckSquare, description: "Pendentes" },
    { title: "Propostas", value: proposalCount, icon: FileCheck, description: "Total" },
  ];

  return (
    <div className="space-y-6">
      {/* Main Layout for Admin */}
      <div className="grid lg:grid-cols-[1fr_320px] gap-6">
        {/* Right Column - Quick Actions & Calendar (appears first on mobile) */}
        <div className="space-y-6 order-first lg:order-last">
          <QuickActionsPanel />
          <DashboardCalendar />
        </div>

        {/* Left Column - Stats & Panels */}
        <div className="space-y-6 order-last lg:order-first">
          {/* Stats Row */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
            {adminStats.map((stat) => (
              <Card key={stat.title} className="min-w-0">
                <CardHeader className="flex flex-row items-center justify-between pb-2 p-3 sm:p-4">
                  <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground truncate pr-2">
                    {stat.title}
                  </CardTitle>
                  <stat.icon className="h-4 w-4 text-muted-foreground shrink-0" />
                </CardHeader>
                <CardContent className="p-3 sm:p-4 pt-0">
                  <div className="text-xl sm:text-2xl font-bold text-foreground">{stat.value}</div>
                  <p className="text-[10px] sm:text-xs text-muted-foreground mt-1 truncate">{stat.description}</p>
                </CardContent>
              </Card>
            ))}

            {/* Placeholder Card */}
            <Card className="border-dashed border-2 border-muted-foreground/30 hover:border-primary/50 transition-colors cursor-pointer min-w-0">
              <CardContent className="flex items-center justify-center h-full p-3 sm:p-4 min-h-[88px]">
                <div className="flex flex-col items-center gap-1 text-muted-foreground">
                  <Plus className="h-5 w-5" />
                  <span className="text-[10px] sm:text-xs">Personalizar</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Content Panels */}
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
