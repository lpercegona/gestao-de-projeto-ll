import React, { useState, useMemo, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, Loader2, Lock, KeyRound, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { format, startOfMonth, endOfMonth, isWithinInterval, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { formatHours } from "@/lib/formatHours";
import orasLogo from "@/assets/logo-oras.svg";

interface ProjectColumn {
  id: string;
  name: string;
  type: string;
  options: string[] | null;
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
  description: string | null;
  project_id: string;
}

interface TimeEntry {
  id: string;
  task_id: string;
  hours: number;
  date: string;
  entry_type?: string;
  description?: string;
}

interface ClientInfo {
  client_id: string;
  client_name: string;
  client_company: string | null;
  client_logo_url: string | null;
  contracted_hours: number;
  is_public: boolean;
}

export const SharedReport: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [clientInfo, setClientInfo] = useState<ClientInfo | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [projectColumns, setProjectColumns] = useState<ProjectColumn[]>([]);

  // Password protection states
  const [needsPassword, setNeedsPassword] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordError, setPasswordError] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);

  const currentMonth = format(new Date(), "yyyy-MM");
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());

  // UUID validation regex
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  // Validate token format
  const isValidToken = token && uuidRegex.test(token);

  // Check if report requires password
  useEffect(() => {
    const checkPassword = async () => {
      // Validate token format before making any requests
      if (!token || !isValidToken) {
        setLoading(false);
        return;
      }

      // Check sessionStorage for previous authentication
      const storedAuth = sessionStorage.getItem(`report_auth_${token}`);
      if (storedAuth === "true") {
        setAuthenticated(true);
        return;
      }

      try {
        const { data: checkData, error } = await supabase.rpc("check_report_has_password", {
          p_token: token,
        });

        if (error || !checkData || checkData.length === 0) {
          setLoading(false);
          return;
        }

        const { has_password, is_public } = checkData[0];

        if (!is_public) {
          setLoading(false);
          return;
        }

        if (has_password) {
          setNeedsPassword(true);
          setLoading(false);
        } else {
          setAuthenticated(true);
        }
      } catch (error) {
        console.error("Error checking password:", error);
        setLoading(false);
      }
    };

    checkPassword();
  }, [token, isValidToken]);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !passwordInput.trim()) return;

    setVerifying(true);
    setPasswordError(false);

    try {
      const { data: isValid, error } = await supabase.rpc("verify_report_password", {
        p_token: token,
        p_password: passwordInput.trim(),
      });

      if (error) throw error;

      if (isValid) {
        sessionStorage.setItem(`report_auth_${token}`, "true");
        setAuthenticated(true);
        setNeedsPassword(false);
      } else {
        setPasswordError(true);
      }
    } catch (error) {
      console.error("Error verifying password:", error);
      setPasswordError(true);
    } finally {
      setVerifying(false);
    }
  };

  // Fetch report data once authenticated
  useEffect(() => {
    const fetchData = async () => {
      // Validate token format before fetching data
      if (!token || !authenticated || !isValidToken) return;

      setLoading(true);
      try {
        const { data: reportData, error: reportError } = await supabase.rpc("get_shared_report", {
          p_token: token,
        });

        if (reportError || !reportData || reportData.length === 0) {
          setLoading(false);
          return;
        }

        const clientData = reportData[0] as any;
        setClientInfo({
          client_id: clientData.client_id,
          client_name: clientData.client_name,
          client_company: clientData.client_company || null,
          client_logo_url: clientData.client_logo_url || null,
          contracted_hours: clientData.contracted_hours,
          is_public: clientData.is_public,
        });

        const { data: projectsData } = await supabase.rpc("get_shared_report_projects", {
          p_token: token,
        });

        const mappedProjects: Project[] = (projectsData || []).map((p: any) => ({
          id: p.project_id,
          name: p.project_name,
          status: p.project_status,
          custom_fields: (p.custom_fields as Record<string, string> | null) || {},
        }));
        setProjects(mappedProjects);

        // Fetch project columns
        const { data: columnsData } = await supabase.rpc("get_shared_report_project_columns", {
          p_token: token,
        });

        const mappedColumns: ProjectColumn[] = (columnsData || []).map((c: any) => ({
          id: c.column_id,
          name: c.column_name,
          type: c.column_type,
          options: c.column_options,
        }));
        setProjectColumns(mappedColumns);

        const { data: tasksData } = await supabase.rpc("get_shared_report_tasks", {
          p_token: token,
        });

        const mappedTasks: Task[] = (tasksData || []).map((t: any) => ({
          id: t.task_id,
          name: t.task_name,
          description: t.task_description,
          project_id: t.project_id,
        }));
        setTasks(mappedTasks);

        const { data: entriesData } = await supabase.rpc("get_shared_report_time_entries", {
          p_token: token,
        });

        const mappedEntries: TimeEntry[] = (entriesData || []).map((e: any) => ({
          id: e.entry_id,
          task_id: e.task_id,
          hours: Number(e.hours),
          date: e.entry_date,
          entry_type: e.entry_type,
          description: e.entry_description,
        }));
        setTimeEntries(mappedEntries);
      } catch (error) {
        console.error("Error fetching shared report:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [token, authenticated]);

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

  // Filter and calculate report data - only show projects with hours > 0 in period
  const reportData = useMemo(() => {
    const [year, month] = selectedMonth.split("-").map(Number);

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

            const monthHours = taskEntries.reduce((sum, te) => sum + te.hours, 0);

            const monthTaskHours = taskEntries

              .filter((te) => te.entry_type === "task")

              .reduce((sum, te) => sum + te.hours, 0);

            const monthMeetingHours = taskEntries

              .filter((te) => te.entry_type === "meeting")

              .reduce((sum, te) => sum + te.hours, 0);

            const totalHours = timeEntries

              .filter((te) => te.task_id === task.id)

              .reduce((sum, te) => sum + te.hours, 0);

            return {
              ...task,

              monthHours,

              monthTaskHours,

              monthMeetingHours,

              totalHours,
            };
          })
          .filter((t) => t.monthHours > 0); // Only tasks with hours in period

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
      .filter((p) => p.monthHours > 0); // Only projects with hours in period
  }, [projects, tasks, timeEntries, selectedMonth]);

  const toggleProject = (projectId: string) => {
    const newExpanded = new Set(expandedProjects);
    if (newExpanded.has(projectId)) {
      newExpanded.delete(projectId);
    } else {
      newExpanded.add(projectId);
    }
    setExpandedProjects(newExpanded);
  };

  const handleExportPDF = () => {
    window.print();
  };

  const totalMonthHours = reportData.reduce((sum, p) => sum + p.monthHours, 0);
  const totalMonthTaskHours = reportData.reduce((sum, p) => sum + p.monthTaskHours, 0);
  const totalMonthMeetingHours = reportData.reduce((sum, p) => sum + p.monthMeetingHours, 0);
  const totalAllHours = timeEntries.reduce((sum, te) => sum + te.hours, 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Password entry screen
  if (needsPassword && !authenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="py-8">
            <div className="text-center mb-6">
              <KeyRound className="w-12 h-12 mx-auto mb-4 text-primary" />
              <h1 className="text-xl font-semibold text-foreground mb-2">Relatório Protegido</h1>
              <p className="text-muted-foreground">Digite a senha para acessar este relatório.</p>
            </div>
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <Input
                type="password"
                placeholder="Digite a senha"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                disabled={verifying}
                className={passwordError ? "border-destructive" : ""}
              />
              {passwordError && <p className="text-sm text-destructive">Senha incorreta. Tente novamente.</p>}
              <Button type="submit" className="w-full" disabled={verifying || !passwordInput.trim()}>
                {verifying && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Acessar Relatório
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!clientInfo) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="py-12 text-center">
            <Lock className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h1 className="text-xl font-semibold text-foreground mb-2">Relatório não disponível</h1>
            <p className="text-muted-foreground">Este relatório não existe ou não está disponível publicamente.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const displayName = clientInfo.client_company || clientInfo.client_name;

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background">
        <div className="border-b border-border bg-card print:hidden">
          <div className="container py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <img src={orasLogo} alt="Oras" className="h-8" />
                {clientInfo.client_logo_url && (
                  <>
                    <div className="h-6 w-px bg-border" />
                    <img
                      src={clientInfo.client_logo_url}
                      alt={displayName}
                      className="h-8 max-w-[120px] object-contain"
                    />
                  </>
                )}
                <div className={clientInfo.client_logo_url ? "ml-2" : ""}>
                  <h1 className="text-xl font-semibold text-foreground">Relatório de Horas</h1>
                  <p className="text-sm text-muted-foreground">{displayName}</p>
                </div>
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon" onClick={handleExportPDF}>
                    <FileDown className="w-5 h-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Exportar PDF</TooltipContent>
              </Tooltip>
            </div>
          </div>
        </div>

        {/* Print header - only visible when printing */}
        <div className="hidden print:block border-b border-border bg-card">
          <div className="container py-6">
            <div className="flex items-center gap-4">
              <img src={orasLogo} alt="Oras" className="h-8" />
              {clientInfo.client_logo_url && (
                <>
                  <div className="h-6 w-px bg-border" />
                  <img
                    src={clientInfo.client_logo_url}
                    alt={displayName}
                    className="h-8 max-w-[120px] object-contain"
                  />
                </>
              )}
              <div>
                <h1 className="text-xl font-semibold text-foreground">Relatório de Horas</h1>
                <p className="text-sm text-muted-foreground">{displayName}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="container py-8">
          {/* Client Info */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Resumo do Contrato</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
                <div>
                  <p className="text-sm text-muted-foreground">Horas Contratadas</p>
                  <p className="text-2xl font-bold text-foreground">{formatHours(clientInfo.contracted_hours)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Horas Utilizadas</p>
                  <p className="text-2xl font-bold text-foreground">{formatHours(totalAllHours)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Horas Restantes</p>
                  <p className="text-2xl font-bold text-foreground">
                    {formatHours(Math.max(0, clientInfo.contracted_hours - totalAllHours))}
                  </p>
                </div>
              </div>
              <div className="w-full bg-muted rounded-full h-3 mt-4">
                <div
                  className="bg-primary h-3 rounded-full transition-all"
                  style={{
                    width: `${
                      clientInfo.contracted_hours > 0
                        ? Math.min((totalAllHours / clientInfo.contracted_hours) * 100, 100)
                        : 0
                    }%`,
                  }}
                />
              </div>
            </CardContent>
          </Card>

          {/* Filters */}
          <Card className="mb-6">
            <CardContent className="py-4">
              <div className="w-full sm:w-64">
                <Label className="mb-2 block">Mês</Label>
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {monthOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Summary */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Resumo do Período</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
                <div>
                  <p className="text-sm text-muted-foreground">Projetos com atividade</p>
                  <p className="text-2xl font-bold text-foreground">{reportData.length}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total de horas</p>
                  <p className="text-2xl font-bold text-foreground">{formatHours(totalMonthHours)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Horas em tarefas</p>
                  <p className="text-2xl font-bold text-primary">{formatHours(totalMonthTaskHours)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Horas em reuniões</p>
                  <p className="text-2xl font-bold text-accent-foreground">{formatHours(totalMonthMeetingHours)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Report List */}
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
                          {projectColumns.length > 0 && Object.keys(customFields).length > 0 && (
                            <div className="border-t border-border pt-4 mb-4">
                              <p className="text-sm font-medium text-muted-foreground mb-3">Campos do Projeto</p>
                              <div className="flex flex-wrap gap-2">
                                {projectColumns.map((col) => {
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
                              projectColumns.length > 0 && Object.keys(customFields).length > 0
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
                                      <p className="text-sm text-muted-foreground">{task.description}</p>
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
        </div>
      </div>
    </TooltipProvider>
  );
};
