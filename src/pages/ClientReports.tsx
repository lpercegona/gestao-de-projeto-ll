import React, { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useData } from "@/contexts/DataContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ChevronDown, ChevronRight, Loader2, Share2, RefreshCw, Clock, Download } from "lucide-react";
import { differenceInCalendarMonths, format, startOfMonth, endOfMonth, isWithinInterval, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatHours } from "@/lib/formatHours";
import { ReportShare } from "@/components/reports/ReportShareDialog";
import { supabase } from "@/integrations/supabase/client";
import { WysiwygContent } from "@/components/ui/wysiwyg-editor";
import { toast } from "sonner";
import { CustomMetricsCard } from "@/components/reports/CustomMetricsCard";

interface ProjectRequestHistory {
  id: string;
  title: string;
  briefing: string;
  status: string;
  created_at: string;
  updated_at: string;
  desired_deadline: string | null;
}

interface EditRequestHistory {
  id: string;
  entity_type: string;
  status: string;
  proposed_data: Record<string, unknown>;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
}

export const ClientReports: React.FC = () => {
  const { user } = useAuth();
  const { data, loading, getClientColumns, getClientPreviousMonthOverflow } = useData();

  const [reportShare, setReportShare] = useState<ReportShare | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  const currentMonth = format(new Date(), "yyyy-MM");
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [activeTab, setActiveTab] = useState<"hours" | "requests">("hours");
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [projectRequestsHistory, setProjectRequestsHistory] = useState<ProjectRequestHistory[]>([]);
  const [editRequestsHistory, setEditRequestsHistory] = useState<EditRequestHistory[]>([]);
  const [customMetrics, setCustomMetrics] = useState<any[]>([]);

  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam === "requests" || tabParam === "hours") {
      setActiveTab(tabParam);
      return;
    }

    setActiveTab("hours");
  }, [searchParams]);

  // Get client for current user (RLS ensures only their data is returned)
  const client = useMemo(() => {
    if (!data.clients.length) return null;
    return data.clients[0] || null;
  }, [data.clients]);

  // Get data from context
  const projects = data.projects;
  const tasks = data.tasks;
  const timeEntries = data.timeEntries;
  const projectColumns = client ? getClientColumns(client.id) : [];

  // Fetch report share settings
  useEffect(() => {
    const fetchShareSettings = async () => {
      if (!client) return;
      const { data: shareData } = await supabase
        .from("report_shares")
        .select("*")
        .eq("client_id", client.id)
        .maybeSingle();
      setReportShare(shareData);
    };
    fetchShareSettings();
    const fetchCustomMetrics = async () => {
      if (!client) return;
      const { data: metricsData } = await supabase
        .from('report_custom_metrics')
        .select('*')
        .eq('client_id', client.id)
        .order('sort_order');
      setCustomMetrics(metricsData || []);
    };
    fetchCustomMetrics();
  }, [client]);

  useEffect(() => {
    const fetchRequestHistory = async () => {
      if (!client) return;

      const [{ data: requests }, { data: editRequests }] = await Promise.all([
        supabase
          .from("project_requests")
          .select("id, title, briefing, status, created_at, updated_at, desired_deadline")
          .eq("client_id", client.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("edit_requests")
          .select("id, entity_type, status, proposed_data, admin_notes, created_at, updated_at")
          .eq("client_id", client.id)
          .order("created_at", { ascending: false }),
      ]);

      setProjectRequestsHistory((requests || []) as ProjectRequestHistory[]);
      setEditRequestsHistory((editRequests || []) as EditRequestHistory[]);
    };

    fetchRequestHistory();
  }, [client]);

  // Generate month options (last 12 months)
  const monthOptions = useMemo(() => {
    const options = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      options.push({
        value: format(date, "yyyy-MM"),
        label: format(date, "MMMM 'de' yyyy", { locale: ptBR }),
      });
    }
    return options;
  }, []);

  // Parse selected month
  const [year, month] = selectedMonth.split("-").map(Number);
  const isMonthly = client?.contract_type === "monthly";

  // Calculate overflow for monthly contracts
  const previousOverflow = useMemo(() => {
    if (!client || !isMonthly) return 0;
    return getClientPreviousMonthOverflow(client.id, year, month);
  }, [client, isMonthly, year, month, getClientPreviousMonthOverflow]);

  const availableHours = useMemo(() => {
    if (!client) return 0;
    if (isMonthly) {
      return Math.max(0, client.contracted_hours - previousOverflow);
    }
    return client.contracted_hours;
  }, [client, isMonthly, previousOverflow]);

  // Filter and calculate report data
  const reportData = useMemo(() => {
    const monthStart = startOfMonth(new Date(year, month - 1));
    const monthEnd = endOfMonth(new Date(year, month - 1));

    return projects
      .map((project) => {
        const projectTasks = tasks.filter((t) => t.project_id === project.id);

        const tasksWithHours = projectTasks
          .map((task) => {
            const taskEntries = timeEntries.filter((te) => {
              if (te.task_id !== task.id) return false;
              const entryDate = parseISO(te.date);
              return isWithinInterval(entryDate, { start: monthStart, end: monthEnd });
            });

            const monthHours = taskEntries.reduce((sum, te) => sum + Number(te.hours), 0);
            const monthTaskHours = taskEntries
              .filter((te) => te.entry_type === "task")
              .reduce((sum, te) => sum + Number(te.hours), 0);
            const monthMeetingHours = taskEntries
              .filter((te) => te.entry_type === "meeting")
              .reduce((sum, te) => sum + Number(te.hours), 0);
            const totalHours = timeEntries
              .filter((te) => te.task_id === task.id)
              .reduce((sum, te) => sum + Number(te.hours), 0);

            return {
              ...task,
              monthHours,
              monthTaskHours,
              monthMeetingHours,
              totalHours,
            };
          })
          .filter((t) => t.monthHours > 0);

        const monthHours = tasksWithHours.reduce((sum, t) => sum + t.monthHours, 0);
        const monthTaskHours = tasksWithHours.reduce((sum, t) => sum + t.monthTaskHours, 0);
        const monthMeetingHours = tasksWithHours.reduce((sum, t) => sum + t.monthMeetingHours, 0);
        const totalHours = tasksWithHours.reduce((sum, t) => sum + t.totalHours, 0);

        return {
          ...project,
          tasks: tasksWithHours,
          monthHours,
          monthTaskHours,
          monthMeetingHours,
          totalHours,
        };
      })
      .filter((p) => p.monthHours > 0);
  }, [projects, tasks, timeEntries, year, month]);

  const toggleProject = (projectId: string) => {
    const newExpanded = new Set(expandedProjects);
    if (newExpanded.has(projectId)) {
      newExpanded.delete(projectId);
    } else {
      newExpanded.add(projectId);
    }
    setExpandedProjects(newExpanded);
  };

  const totalMonthHours = reportData.reduce((sum, p) => sum + p.monthHours, 0);
  const totalMonthTaskHours = reportData.reduce((sum, p) => sum + p.monthTaskHours, 0);
  const totalMonthMeetingHours = reportData.reduce((sum, p) => sum + p.monthMeetingHours, 0);
  const totalAllHours = timeEntries.reduce((sum, te) => sum + Number(te.hours), 0);

  const remainingHours = Math.max(0, availableHours - totalMonthHours);

  const visibleReportColumns = useMemo(
    () => projectColumns.filter((column) => column.show_in_report),
    [projectColumns],
  );

  const customFieldSummaries = useMemo(() => {
    if (!visibleReportColumns.length || !reportData.length) return [];

    const projectById = new Map(projects.map((project) => [project.id, project]));
    const registeredTaskProjects = reportData.flatMap((project) =>
      project.tasks.map(() => projectById.get(project.id)),
    );

    return visibleReportColumns
      .map((column) => {
        const valueCount = new Map<string, number>();
        let tasksWithValue = 0;

        registeredTaskProjects.forEach((project) => {
          const customFields = (project?.custom_fields || {}) as Record<string, string>;
          const rawFieldValue = customFields[column.id];
          const fieldValue = rawFieldValue?.trim();
          if (!fieldValue) return;

          tasksWithValue += 1;
          valueCount.set(fieldValue, (valueCount.get(fieldValue) || 0) + 1);
        });

        const values = Array.from(valueCount.entries())
          .map(([value, count]) => ({
            value,
            count,
            percentage: tasksWithValue > 0 ? (count / tasksWithValue) * 100 : 0,
          }))
          .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value, "pt-BR"));

        return {
          id: column.id,
          title: column.name,
          tasksWithValue,
          values,
        };
      })
      .filter((summary) => summary.tasksWithValue > 0 && summary.values.length > 0);
  }, [projects, reportData, visibleReportColumns]);

  const requestHistory = useMemo(() => {
    const projectHistoryItems = projectRequestsHistory.map((request) => ({
      id: request.id,
      type: "new_project" as const,
      title: request.title,
      description: request.briefing,
      status: request.status,
      createdAt: request.created_at,
      updatedAt: request.updated_at,
      deadline: request.desired_deadline,
      adminNotes: null,
    }));

    const editHistoryItems = editRequestsHistory.map((request) => {
      const requestType =
        typeof request.proposed_data?.request_type === "string" ? request.proposed_data.request_type : "edit_project";

      const titleMap: Record<string, string> = {
        new_task: "Solicitação de nova tarefa",
        edit_task: "Solicitação de edição de tarefa",
        edit_project: "Solicitação de edição de projeto",
      };

      return {
        id: request.id,
        type: "edit" as const,
        title: titleMap[requestType] || "Solicitação de edição",
        description:
          (typeof request.proposed_data?.task_name === "string" && request.proposed_data.task_name) ||
          (typeof request.proposed_data?.name === "string" && request.proposed_data.name) ||
          (typeof request.proposed_data?.description === "string" && request.proposed_data.description) ||
          null,
        status: request.status,
        createdAt: request.created_at,
        updatedAt: request.updated_at,
        deadline: null,
        adminNotes: request.admin_notes,
      };
    });

    return [...projectHistoryItems, ...editHistoryItems].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }, [editRequestsHistory, projectRequestsHistory]);

  const filteredRequestHistory = useMemo(() => {
    const monthStart = startOfMonth(new Date(year, month - 1));
    const monthEnd = endOfMonth(new Date(year, month - 1));

    return requestHistory.filter((request) => {
      const createdAt = parseISO(request.createdAt);
      return isWithinInterval(createdAt, { start: monthStart, end: monthEnd });
    });
  }, [requestHistory, year, month]);

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: "Pendente",
      analyzing: "Em análise",
      in_review: "Em revisão",
      approved: "Aprovada",
      rejected: "Rejeitada",
      converted: "Convertida",
    };
    return labels[status] || status;
  };

  const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    if (status === "approved" || status === "converted") return "default";
    if (status === "rejected") return "destructive";
    if (status === "pending" || status === "analyzing" || status === "in_review") return "secondary";
    return "outline";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!client) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">
            Sua conta não está vinculada a um cliente. Entre em contato com o administrador.
          </p>
        </CardContent>
      </Card>
    );
  }

  const contractStartDate = (client as { contract_start_date?: string | null }).contract_start_date;
  const contractEndDate = (client as { contract_end_date?: string | null }).contract_end_date;
  const contractPeriodStart = contractStartDate ? startOfMonth(parseISO(contractStartDate)) : null;
  const contractPeriodEnd = contractEndDate ? startOfMonth(parseISO(contractEndDate)) : startOfMonth(new Date());
  const monthlyContractMonths =
    isMonthly && contractPeriodStart
      ? Math.max(1, differenceInCalendarMonths(contractPeriodEnd, contractPeriodStart) + 1)
      : 1;
  const totalContractHoursAllMonths = isMonthly
    ? client.contracted_hours * monthlyContractMonths
    : client.contracted_hours;
  const selectedReportMonthLabel = format(new Date(year, month - 1, 1), "MMMM 'de' yyyy", { locale: ptBR });

  const remainingAllHours = Math.max(0, totalContractHoursAllMonths - totalAllHours);

  const handleExportReportCSV = () => {
    const monthLabel = monthOptions.find((option) => option.value === selectedMonth)?.label || selectedMonth;
    const rows = [["Projeto", "Tarefa", "Descrição", "Horas Tarefas", "Horas Reuniões", "Total Horas"]];

    reportData.forEach((project) => {
      project.tasks.forEach((task) => {
        rows.push([
          project.name,
          task.name,
          task.description?.replace(/<[^>]*>/g, "") || "",
          task.monthTaskHours.toFixed(2),
          task.monthMeetingHours.toFixed(2),
          task.monthHours.toFixed(2),
        ]);
      });
    });

    // Add totals row
    rows.push([
      "TOTAL",
      "",
      "",
      totalMonthTaskHours.toFixed(2),
      totalMonthMeetingHours.toFixed(2),
      totalMonthHours.toFixed(2),
    ]);

    const csvContent = rows.map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n");
    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `relatorio-${client.company || client.name}-${monthLabel}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    setExportDialogOpen(false);
  };

  const handleExportReportPDF = () => {
    setExportDialogOpen(false);
    window.print();
  };

  const handleCopyShareLink = async () => {
    if (!user || !client) return;

    try {
      let activeShare = reportShare;

      if (!activeShare) {
        const { data: createdShare, error: createError } = await supabase
          .from("report_shares")
          .insert({
            client_id: client.id,
            created_by: user.id,
            is_public: true,
            share_password: null,
          })
          .select("*")
          .single();

        if (createError) throw createError;
        activeShare = createdShare as ReportShare;
      }

      if (!activeShare.is_public) {
        const { data: updatedShare, error: updateError } = await supabase
          .from("report_shares")
          .update({ is_public: true })
          .eq("id", activeShare.id)
          .select("*")
          .single();

        if (updateError) throw updateError;
        activeShare = updatedShare as ReportShare;
      }

      const shareUrl = `${window.location.origin}/report/${activeShare.share_token}`;
      await navigator.clipboard.writeText(shareUrl);
      setReportShare(activeShare);

      toast.success("Link de compartilhamento copiado!");
    } catch (error) {
      console.error("Erro ao copiar link de compartilhamento:", error);
      toast.error("Não foi possível copiar o link de compartilhamento.");
    }
  };

  return (
    <div>
      <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Exportar relatório</DialogTitle>
            <DialogDescription>Escolha o formato do arquivo para baixar o relatório deste período.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={handleExportReportCSV}>
              Baixar CSV
            </Button>
            <Button onClick={handleExportReportPDF}>Baixar PDF</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "hours" | "requests")}>
        <div className="mb-6 hidden items-center justify-between gap-3 md:flex">
          <div className="flex items-center gap-4">
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="h-auto w-auto border-none p-0 text-left shadow-none [&>svg]:text-primary">
                <span className="font-semibold text-foreground">
                  Relatório de{" "}
                  <span className="text-primary underline decoration-dotted underline-offset-4">
                    {selectedReportMonthLabel}
                  </span>
                </span>
              </SelectTrigger>
              <SelectContent align="start">
                {monthOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <TabsList>
              <TabsTrigger value="hours">Horas</TabsTrigger>
              <TabsTrigger value="requests">Solicitações</TabsTrigger>
            </TabsList>
          </div>

          <div className="flex items-center justify-end gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setExportDialogOpen(true)}
              className="h-8 w-8 rounded-lg"
              title="Exportar relatório"
            >
              <Download className="w-3.5 h-3.5" />
            </Button>
            {user && (
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 rounded-lg"
                title="Compartilhar relatório"
                onClick={handleCopyShareLink}
              >
                <Share2 className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </div>

        <div className="mb-6 space-y-3 md:hidden">
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="h-auto w-full border-none p-0 text-left shadow-none [&>svg]:text-primary">
              <span className=" font-semibold text-foreground">
                Relatório de{" "}
                <span className="text-primary underline decoration-dotted underline-offset-4">
                  {selectedReportMonthLabel}
                </span>
              </span>
            </SelectTrigger>
            <SelectContent align="start">
              {monthOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center justify-between gap-3">
            <TabsList>
              <TabsTrigger value="hours">Horas</TabsTrigger>
              <TabsTrigger value="requests">Solicitações</TabsTrigger>
            </TabsList>

            <div className="flex items-center justify-end gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setExportDialogOpen(true)}
                className="h-8 w-8 rounded-lg"
                title="Exportar relatório"
              >
                <Download className="w-3.5 h-3.5" />
              </Button>
              {user && (
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 rounded-lg"
                  title="Compartilhar relatório"
                  onClick={handleCopyShareLink}
                >
                  <Share2 className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          </div>
        </div>

        <TabsContent value="hours" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <CardTitle className="text-base">Resumo do Contrato</CardTitle>
                <Badge variant={isMonthly ? "default" : "secondary"}>
                  {isMonthly ? (
                    <>
                      <RefreshCw className="mr-1 h-3 w-3" />
                      Mensal
                    </>
                  ) : (
                    <>
                      <Clock className="mr-1 h-3 w-3" />
                      Único
                    </>
                  )}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
                <div>
                  <p className="text-xs text-muted-foreground">Tipo de contrato</p>
                  <p className="text-lg font-semibold text-foreground">{isMonthly ? "Mensal" : "Único"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Horas contratadas</p>
                  <p className="text-lg font-semibold text-foreground">{formatHours(client.contracted_hours)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Previsão de término</p>
                  <p className="text-lg font-semibold text-foreground">
                    {contractEndDate ? format(parseISO(contractEndDate), "dd/MM/yyyy") : "Não definida"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total de horas (todos os meses)</p>
                  <p className="text-lg font-semibold text-foreground">{formatHours(totalContractHoursAllMonths)}</p>
                </div>
                <div className="col-span-2 lg:col-span-1">
                  <p className="text-xs text-muted-foreground">Horas já utilizadas (geral)</p>
                  <p className="text-lg font-semibold text-foreground">{formatHours(totalAllHours)}</p>
                </div>
                <div className="col-span-2 mt-1 space-y-2 lg:col-span-5">
                  <div className="h-2.5 w-full rounded-full bg-muted">
                    <div
                      className="h-2.5 rounded-full bg-primary transition-all"
                      style={{
                        width: `${
                          totalContractHoursAllMonths > 0
                            ? Math.min((totalAllHours / totalContractHoursAllMonths) * 100, 100)
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Contratadas: {formatHours(totalContractHoursAllMonths)} • Usadas: {formatHours(totalAllHours)} •
                    Remanecentes: {formatHours(remainingAllHours)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Resumo do Mês</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
                <div>
                  <p className="text-xs text-muted-foreground">Horas disponíveis no mês</p>
                  <p className="text-lg font-semibold text-foreground">{formatHours(availableHours)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Horas utilizadas no mês</p>
                  <p className="text-lg font-semibold text-foreground">{formatHours(totalMonthHours)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Horas em tarefas</p>
                  <p className="text-lg font-semibold text-foreground">{formatHours(totalMonthTaskHours)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Horas em reunião</p>
                  <p className="text-lg font-semibold text-foreground">{formatHours(totalMonthMeetingHours)}</p>
                </div>
                <div className="col-span-2 lg:col-span-1">
                  <p className="text-xs text-muted-foreground">Horas remanescentes no mês</p>
                  <p className="text-lg font-semibold text-foreground">{formatHours(remainingHours)}</p>
                </div>
                <div className="col-span-2 mt-1 space-y-2 lg:col-span-5">
                  <div className="h-3 w-full rounded-full bg-muted">
                    <div
                      className="h-3 rounded-full bg-primary transition-all"
                      style={{
                        width: `${availableHours > 0 ? Math.min((totalMonthHours / availableHours) * 100, 100) : 0}%`,
                      }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Disponíveis: {formatHours(availableHours)} • Usadas: {formatHours(totalMonthHours)} • Remanescentes:{" "}
                    {formatHours(remainingHours)}
                    {isMonthly && previousOverflow > 0 ? ` • Saldo anterior descontado: ${formatHours(previousOverflow)}` : ""}
                    {isMonthly && previousOverflow < 0 ? ` • Crédito do mês anterior: ${formatHours(Math.abs(previousOverflow))}` : ""}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {customMetrics.length > 0 && client && (
            <CustomMetricsCard
              metrics={customMetrics}
              projects={projects.filter(p => p.client_id === client.id).map(p => ({ id: p.id, name: p.name, status: p.status, custom_fields: p.custom_fields as Record<string, string> | null }))}
              tasks={tasks.filter(t => projects.filter(p => p.client_id === client.id).some(p => p.id === t.project_id)).map(t => ({ id: t.id, name: t.name, status: t.status, project_id: t.project_id }))}
              projectColumns={projectColumns}
            />
          )}

          {visibleReportColumns.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Campos personalizados por tarefas registradas</CardTitle>
              </CardHeader>
              <CardContent>
                {customFieldSummaries.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Não há tarefas registradas no período com campos personalizados preenchidos.
                  </p>
                ) : (
                  <div className="space-y-5">
                    {customFieldSummaries.map((summary) => (
                      <div key={summary.id} className="space-y-3 border-b border-border pb-5 last:border-b-0 last:pb-0">
                        <div>
                          <p className="text-sm font-medium text-foreground">{summary.title}</p>
                          <p className="text-xs text-muted-foreground">
                            Base: {summary.tasksWithValue} tarefas com campo preenchido
                          </p>
                        </div>
                        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
                          {summary.values.map((item) => (
                            <div key={`${summary.id}-${item.value}`}>
                              <p className="text-xs text-muted-foreground">{item.value}</p>
                              <p className="text-lg font-semibold text-foreground">{item.percentage.toFixed(1)}%</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {reportData.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">Nenhum projeto com horas registradas no período selecionado.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {reportData.map((project) => {
                const isExpanded = expandedProjects.has(project.id);
                const originalProject = projects.find((p) => p.id === project.id);
                const customFields = originalProject?.custom_fields || {};
                const visibleColumns = projectColumns.filter((col) => col.show_in_report);

                return (
                  <Card key={project.id}>
                    <Collapsible open={isExpanded} onOpenChange={() => toggleProject(project.id)}>
                      <CollapsibleTrigger asChild>
                        <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              {isExpanded ? (
                                <ChevronDown className="w-5 h-5 text-muted-foreground" />
                              ) : (
                                <ChevronRight className="w-5 h-5 text-muted-foreground" />
                              )}
                              <CardTitle className="text-base">{project.name}</CardTitle>
                            </div>
                            <div className="text-right">
                              <div className="flex gap-2 text-sm font-medium">
                                {project.monthTaskHours > 0 && (
                                  <span className="text-primary">{formatHours(project.monthTaskHours)} tarefas</span>
                                )}
                                {project.monthMeetingHours > 0 && (
                                  <span className="text-accent-foreground">
                                    {formatHours(project.monthMeetingHours)} reuniões
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardHeader>
                      </CollapsibleTrigger>

                      <CollapsibleContent>
                        <CardContent className="pt-0">
                          {/* Custom Fields */}
                          {visibleColumns.length > 0 && Object.keys(customFields).length > 0 && (
                            <div className="border-t border-border pt-4 mb-4">
                              <p className="text-sm font-medium text-muted-foreground mb-3">Campos do Projeto</p>
                              <div className="flex flex-wrap gap-2">
                                {visibleColumns.map((col) => {
                                  const value = customFields[col.id];
                                  if (!value) return null;
                                  return (
                                    <div
                                      key={col.id}
                                      className="inline-flex items-center gap-1.5 px-2 py-1 bg-muted rounded-md text-sm"
                                    >
                                      <span className="text-muted-foreground">{col.name}:</span>
                                      <span className="font-medium text-foreground">{value}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          <div
                            className={
                              visibleColumns.length > 0 && Object.keys(customFields).length > 0
                                ? ""
                                : "border-t border-border pt-4"
                            }
                          >
                            <p className="text-sm font-medium text-muted-foreground mb-3">
                              Tarefas ({project.tasks.length})
                            </p>
                            <div className="space-y-3">
                              {project.tasks.map((task) => (
                                <div
                                  key={task.id}
                                  className="flex items-center justify-between py-2 px-3 bg-muted/50 rounded-md"
                                >
                                  <div>
                                    <p className="font-medium text-foreground">{task.name}</p>
                                    {task.description && (
                                      <WysiwygContent
                                        content={task.description}
                                        className="text-sm text-muted-foreground"
                                      />
                                    )}
                                  </div>
                                  <div className="text-right">
                                    <div className="flex gap-2 text-xs">
                                      {task.monthTaskHours > 0 && (
                                        <span className="text-primary font-medium">
                                          {formatHours(task.monthTaskHours)} tarefas
                                        </span>
                                      )}
                                      {task.monthMeetingHours > 0 && (
                                        <span className="text-accent-foreground font-medium">
                                          {formatHours(task.monthMeetingHours)} reuniões
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </CardContent>
                      </CollapsibleContent>
                    </Collapsible>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="requests">
          {filteredRequestHistory.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">Nenhuma solicitação encontrada para este mês.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredRequestHistory.map((request) => (
                <Card key={`${request.type}-${request.id}`}>
                  <CardContent className="py-4 space-y-3">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="font-medium text-foreground">{request.title}</p>
                        <p className="text-xs text-muted-foreground">
                          Criada em{" "}
                          {format(parseISO(request.createdAt), "dd 'de' MMMM 'de' yyyy, HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                      <Badge variant={getStatusVariant(request.status)}>{getStatusLabel(request.status)}</Badge>
                    </div>

                    {request.description && (
                      <WysiwygContent content={request.description} className="text-sm text-muted-foreground" />
                    )}

                    <div className="flex flex-col gap-1 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                      <span>
                        Última atualização:{" "}
                        {format(parseISO(request.updatedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </span>
                      {request.deadline && (
                        <span>
                          Prazo solicitado: {format(parseISO(request.deadline), "dd/MM/yyyy", { locale: ptBR })}
                        </span>
                      )}
                    </div>

                    {request.adminNotes && (
                      <div className="rounded-md border border-border bg-muted/40 p-2">
                        <p className="text-xs font-medium text-foreground">Observação da equipe</p>
                        <p className="text-sm text-muted-foreground">{request.adminNotes}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
