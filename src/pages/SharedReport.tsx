import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronDown, ChevronRight, Loader2, Lock, KeyRound, FileDown, Share2, RefreshCw, Clock, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { differenceInCalendarMonths, format, startOfMonth, endOfMonth, isWithinInterval, isValid, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { formatHours } from "@/lib/formatHours";
import orasLogo from "@/assets/logo-oras.svg";
import { WysiwygContent } from "@/components/ui/wysiwyg-editor";
import { toast } from "sonner";

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
  contract_type: "one_time" | "monthly";
  contract_start_date: string | null;
  contract_end_date: string | null;
  contract_months: number | null;
  is_public: boolean;
}

interface SharedRequestItem {
  request_id: string;
  request_type: string;
  title: string;
  description: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  deadline: string | null;
  admin_notes: string | null;
}

export const SharedReport: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [clientInfo, setClientInfo] = useState<ClientInfo | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [projectColumns, setProjectColumns] = useState<ProjectColumn[]>([]);
  const [requests, setRequests] = useState<SharedRequestItem[]>([]);
  const [requestsLoadError, setRequestsLoadError] = useState<string | null>(null);

  const [needsPassword, setNeedsPassword] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordError, setPasswordError] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);

  const currentMonth = format(new Date(), "yyyy-MM");
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [activeTab, setActiveTab] = useState<"hours" | "requests">("hours");
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const isValidToken = token && uuidRegex.test(token);

  useEffect(() => {
    const checkPassword = async () => {
      if (!token || !isValidToken) {
        setLoading(false);
        return;
      }

      const storedAuth = sessionStorage.getItem(`report_auth_${token}`);
      if (storedAuth === "true") {
        setAuthenticated(true);
        return;
      }

      try {
        const { data: checkData, error } = await supabase.rpc("check_report_has_password", { p_token: token });

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

  const fetchSharedReportRequests = useCallback(async (shareToken: string) => {
    const requestParamCandidates: Array<Record<string, string>> = [
      { p_token: shareToken },
      { token: shareToken },
      { share_token: shareToken },
    ];

    let lastError: unknown = null;

    for (const params of requestParamCandidates) {
      const response = await supabase.rpc("get_shared_report_requests", params);
      if (!response.error) {
        return { data: response.data || [], errorMessage: null };
      }

      lastError = response.error;
      if (response.error.code !== "PGRST202") {
        break;
      }
    }

    const message =
      lastError && typeof lastError === "object" && "message" in lastError
        ? String((lastError as { message?: string }).message)
        : "Não foi possível carregar as solicitações deste relatório.";

    return { data: [], errorMessage: message };
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      if (!token || !authenticated || !isValidToken) return;

      setLoading(true);
      try {
        const { data: reportData, error: reportError } = await supabase.rpc("get_shared_report", { p_token: token });

        if (reportError || !reportData || reportData.length === 0) {
          setLoading(false);
          return;
        }

        const clientData = reportData[0] as Record<string, unknown>;
        setClientInfo({
          client_id: clientData.client_id,
          client_name: clientData.client_name,
          client_company: clientData.client_company || null,
          client_logo_url: clientData.client_logo_url || null,
          contracted_hours: clientData.contracted_hours,
          contract_type: clientData.contract_type || "one_time",
          contract_start_date: clientData.contract_start_date || null,
          contract_end_date: clientData.contract_end_date || null,
          contract_months: clientData.contract_months || 1,
          is_public: clientData.is_public,
        });

        const [projectsResult, columnsResult, tasksResult, entriesResult, requestsResult] =
          await Promise.allSettled([
            supabase.rpc("get_shared_report_projects", { p_token: token }),
            supabase.rpc("get_shared_report_project_columns", { p_token: token }),
            supabase.rpc("get_shared_report_tasks", { p_token: token }),
            supabase.rpc("get_shared_report_time_entries", { p_token: token }),
            fetchSharedReportRequests(token),
          ]);

        const projectsData = projectsResult.status === "fulfilled" ? projectsResult.value.data : [];
        const columnsData = columnsResult.status === "fulfilled" ? columnsResult.value.data : [];
        const tasksData = tasksResult.status === "fulfilled" ? tasksResult.value.data : [];
        const entriesData = entriesResult.status === "fulfilled" ? entriesResult.value.data : [];
        const requestsData = requestsResult.status === "fulfilled" ? requestsResult.value.data.data : [];

        setProjects(
          (projectsData || []).map((projectRow) => {
            const p = projectRow as Record<string, unknown>;
            return ({
            id: p.project_id,
            name: p.project_name,
            status: p.project_status,
            custom_fields: (p.custom_fields as Record<string, string> | null) || {},
          });
          }),
        );

        setProjectColumns(
          (columnsData || []).map((columnRow) => {
            const c = columnRow as Record<string, unknown>;
            return ({
            id: c.column_id,
            name: c.column_name,
            type: c.column_type,
            options: c.column_options,
          });
          }),
        );

        setTasks(
          (tasksData || []).map((taskRow) => {
            const t = taskRow as Record<string, unknown>;
            return ({
            id: t.task_id,
            name: t.task_name,
            description: t.task_description,
            project_id: t.project_id,
          });
          }),
        );

        setTimeEntries(
          (entriesData || []).map((entryRow) => {
            const e = entryRow as Record<string, unknown>;
            return ({
            id: e.entry_id,
            task_id: e.task_id,
            hours: Number(e.hours),
            date: e.entry_date,
            entry_type: e.entry_type,
            description: e.entry_description,
          });
          }),
        );

        if (requestsResult.status === "rejected") {
          console.error("Error fetching shared report requests:", requestsResult.reason);
          setRequestsLoadError("Não foi possível carregar as solicitações deste relatório.");
        } else if (requestsResult.value.errorMessage) {
          console.error("Error fetching shared report requests:", requestsResult.value.errorMessage);
          setRequestsLoadError("Solicitações temporariamente indisponíveis neste link compartilhável.");
        } else {
          setRequestsLoadError(null);
        }

        setRequests(
          ((requestsData || []) as SharedRequestItem[]).sort(
            (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
          ),
        );
      } catch (error) {
        console.error("Error fetching shared report:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [token, authenticated, isValidToken, fetchSharedReportRequests]);


  const parseRequestDate = useCallback((dateValue: string) => {
    const parsedIso = parseISO(dateValue);
    if (isValid(parsedIso)) return parsedIso;

    const parsedNative = new Date(dateValue);
    if (isValid(parsedNative)) return parsedNative;

    return null;
  }, []);


  const parseRequestDate = useCallback((dateValue: string) => {
    const parsedIso = parseISO(dateValue);
    if (isValid(parsedIso)) return parsedIso;

    const parsedNative = new Date(dateValue);
    if (isValid(parsedNative)) return parsedNative;

    return null;
  }, []);

  const monthOptions = useMemo(() => {
    const monthKeys = new Set<string>();
    const now = new Date();

    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      monthKeys.add(format(date, "yyyy-MM"));
    }

    timeEntries.forEach((entry) => {
      const entryDate = parseISO(entry.date);
      monthKeys.add(format(entryDate, "yyyy-MM"));
    });

    requests.forEach((request) => {
      const createdAt = parseRequestDate(request.created_at);
      if (!createdAt) return;
      monthKeys.add(format(createdAt, "yyyy-MM"));
    });

    return Array.from(monthKeys)
      .sort((a, b) => b.localeCompare(a))
      .map((value) => {
        const [optionYear, optionMonth] = value.split("-").map(Number);
        const date = new Date(optionYear, optionMonth - 1, 1);
        return { value, label: format(date, "MMMM 'de' yyyy", { locale: ptBR }) };
      });
  }, [parseRequestDate, requests, timeEntries]);

  const [year, month] = selectedMonth.split("-").map(Number);

  const isMonthly = clientInfo?.contract_type === "monthly";

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

            const monthHours = taskEntries.reduce((sum, te) => sum + te.hours, 0);
            const monthTaskHours = taskEntries.filter((te) => te.entry_type === "task").reduce((sum, te) => sum + te.hours, 0);
            const monthMeetingHours = taskEntries
              .filter((te) => te.entry_type === "meeting")
              .reduce((sum, te) => sum + te.hours, 0);
            const totalHours = timeEntries.filter((te) => te.task_id === task.id).reduce((sum, te) => sum + te.hours, 0);

            return { ...task, monthHours, monthTaskHours, monthMeetingHours, totalHours };
          })
          .filter((t) => t.monthHours > 0);

        const monthHours = tasksWithHours.reduce((sum, t) => sum + t.monthHours, 0);
        const monthTaskHours = tasksWithHours.reduce((sum, t) => sum + t.monthTaskHours, 0);
        const monthMeetingHours = tasksWithHours.reduce((sum, t) => sum + t.monthMeetingHours, 0);
        const totalHours = tasksWithHours.reduce((sum, t) => sum + t.totalHours, 0);

        return { ...project, tasks: tasksWithHours, monthHours, monthTaskHours, monthMeetingHours, totalHours };
      })
      .filter((p) => p.monthHours > 0);
  }, [projects, tasks, timeEntries, year, month]);

  const filteredRequestHistory = useMemo(() => {
    const monthStart = startOfMonth(new Date(year, month - 1));
    const monthEnd = endOfMonth(new Date(year, month - 1));

    return requests.filter((request) => {
      const createdAt = parseRequestDate(request.created_at);
      if (!createdAt) return false;
      return isWithinInterval(createdAt, { start: monthStart, end: monthEnd });
    });
  }, [parseRequestDate, requests, year, month]);

  const toggleProject = (projectId: string) => {
    const newExpanded = new Set(expandedProjects);
    if (newExpanded.has(projectId)) newExpanded.delete(projectId);
    else newExpanded.add(projectId);
    setExpandedProjects(newExpanded);
  };

  const handleExportPDF = () => window.print();

  const handleCopyShareLink = async () => {
    if (!token) return;
    const shareUrl = `${window.location.origin}/report/${token}`;
    await navigator.clipboard.writeText(shareUrl);
    toast.success("Link de compartilhamento copiado!");
  };

  const totalMonthHours = reportData.reduce((sum, p) => sum + p.monthHours, 0);
  const totalMonthTaskHours = reportData.reduce((sum, p) => sum + p.monthTaskHours, 0);
  const totalMonthMeetingHours = reportData.reduce((sum, p) => sum + p.monthMeetingHours, 0);
  const totalAllHours = timeEntries.reduce((sum, te) => sum + te.hours, 0);

  const previousOverflow = useMemo(() => {
    if (!clientInfo || !isMonthly) return 0;

    const targetMonthIndex = year * 12 + (month - 1);
    const startDate = clientInfo.contract_start_date ? new Date(clientInfo.contract_start_date) : null;

    if (startDate) {
      const startMonthIndex = startDate.getFullYear() * 12 + startDate.getMonth();
      if (targetMonthIndex <= startMonthIndex) return 0;
    }

    const MAX_LOOKBACK_MONTHS = 120;
    const firstMonthToEvaluate = Math.max(0, targetMonthIndex - MAX_LOOKBACK_MONTHS);

    let overflow = 0;
    for (let monthIndex = firstMonthToEvaluate; monthIndex < targetMonthIndex; monthIndex += 1) {
      if (startDate) {
        const startMonthIndex = startDate.getFullYear() * 12 + startDate.getMonth();
        if (monthIndex <= startMonthIndex) continue;
      }

      const monthYear = Math.floor(monthIndex / 12);
      const monthNumber = (monthIndex % 12) + 1;
      const monthStart = startOfMonth(new Date(monthYear, monthNumber - 1));
      const monthEnd = endOfMonth(new Date(monthYear, monthNumber - 1));

      const usedHours = timeEntries
        .filter((entry) => {
          const entryDate = parseISO(entry.date);
          return isWithinInterval(entryDate, { start: monthStart, end: monthEnd });
        })
        .reduce((sum, entry) => sum + entry.hours, 0);

      const availableMonthHours = Math.max(0, clientInfo.contracted_hours - overflow);
      overflow = Math.max(0, usedHours - availableMonthHours);
    }

    return overflow;
  }, [clientInfo, isMonthly, timeEntries, year, month]);

  const availableHours = clientInfo
    ? isMonthly
      ? Math.max(0, clientInfo.contracted_hours - previousOverflow)
      : clientInfo.contracted_hours
    : 0;
  const remainingHours = Math.max(0, availableHours - totalMonthHours);

  const contractPeriodStart = clientInfo?.contract_start_date ? startOfMonth(parseISO(clientInfo.contract_start_date)) : null;
  const contractPeriodEnd = clientInfo?.contract_end_date ? startOfMonth(parseISO(clientInfo.contract_end_date)) : startOfMonth(new Date());
  const monthlyContractMonths = isMonthly && contractPeriodStart ? Math.max(1, differenceInCalendarMonths(contractPeriodEnd, contractPeriodStart) + 1) : 1;
  const totalContractHoursAllMonths = clientInfo ? (isMonthly ? clientInfo.contracted_hours * monthlyContractMonths : clientInfo.contracted_hours) : 0;
  const remainingAllHours = Math.max(0, totalContractHoursAllMonths - totalAllHours);

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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

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
  const selectedReportMonthLabel = format(new Date(year, month - 1, 1), "MMMM 'de' yyyy", { locale: ptBR });

  return (
  <TooltipProvider>
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-card print:hidden">
        <div className="container py-6">
          <div className="flex flex-wrap sm:flex-nowrap items-start justify-between w-full">

            {/* Bloco esquerdo: logo + textos */}
            <div className="flex items-start gap-4 min-w-0 w-full sm:w-auto">
              
              {clientInfo.client_logo_url && (
                <img
                  src={clientInfo.client_logo_url}
                  alt={displayName}
                  className="h-8 max-w-[120px] object-contain shrink-0"
                />
              )}

              <div className="flex flex-col leading-tight w-full sm:w-auto">
                <h1 className="text-md font-semibold text-foreground">
                  Relatório de Horas
                </h1>
                <span className="text-sm text-muted-foreground">
                  {displayName}
                </span>
              </div>

            </div>
            
            <div className="flex items-center gap-2 shrink-0">
              <Button variant="outline" size="icon" onClick={handleCopyShareLink}>
                <Share2 className="w-5 h-5" />
              </Button>

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
      </div>

        <div className="container py-8">
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "hours" | "requests")}> 
            <div className="mb-6 hidden items-center justify-between gap-3 md:flex">
              <div className="flex items-center gap-4">
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger className="h-auto w-auto border-none p-0 text-left shadow-none [&>svg]:text-primary">
                    <span className="font-semibold text-foreground">
                      Relatório de <span className="text-primary underline decoration-dotted underline-offset-4">{selectedReportMonthLabel}</span>
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
            </div>

            <div className="mb-6 space-y-3 md:hidden">
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="h-auto w-full border-none p-0 text-left shadow-none [&>svg]:text-primary">
                  <span className="font-semibold text-foreground">
                    Relatório de <span className="text-primary underline decoration-dotted underline-offset-4">{selectedReportMonthLabel}</span>
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

            <TabsContent value="hours" className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base">Resumo do Contrato</CardTitle>
                    <Badge variant={isMonthly ? "default" : "secondary"}>
                      {isMonthly ? <><RefreshCw className="mr-1 h-3 w-3" />Mensal</> : <><Clock className="mr-1 h-3 w-3" />Único</>}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
                    <div><p className="text-xs text-muted-foreground">Tipo de contrato</p><p className="text-lg font-semibold text-foreground">{isMonthly ? "Mensal" : "Único"}</p></div>
                    <div><p className="text-xs text-muted-foreground">Horas contratadas</p><p className="text-lg font-semibold text-foreground">{formatHours(clientInfo.contracted_hours)}</p></div>
                    <div><p className="text-xs text-muted-foreground">Previsão de término</p><p className="text-lg font-semibold text-foreground">{clientInfo.contract_end_date ? format(parseISO(clientInfo.contract_end_date), "dd/MM/yyyy") : "Não definida"}</p></div>
                    <div><p className="text-xs text-muted-foreground">Total de horas (todos os meses)</p><p className="text-lg font-semibold text-foreground">{formatHours(totalContractHoursAllMonths)}</p></div>
                    <div className="col-span-2 lg:col-span-1"><p className="text-xs text-muted-foreground">Horas já utilizadas (geral)</p><p className="text-lg font-semibold text-foreground">{formatHours(totalAllHours)}</p></div>
                    <div className="col-span-2 mt-1 space-y-2 lg:col-span-5">
                      <div className="h-2.5 w-full rounded-full bg-muted"><div className="h-2.5 rounded-full bg-primary transition-all" style={{ width: `${totalContractHoursAllMonths > 0 ? Math.min((totalAllHours / totalContractHoursAllMonths) * 100, 100) : 0}%` }} /></div>
                      <p className="text-xs text-muted-foreground">Contratadas: {formatHours(totalContractHoursAllMonths)} • Usadas: {formatHours(totalAllHours)} • Remanecentes: {formatHours(remainingAllHours)}</p>
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
                    <div><p className="text-xs text-muted-foreground">Horas disponíveis no mês</p><p className="text-lg font-semibold text-foreground">{formatHours(availableHours)}</p></div>
                    <div><p className="text-xs text-muted-foreground">Horas utilizadas no mês</p><p className="text-lg font-semibold text-foreground">{formatHours(totalMonthHours)}</p></div>
                    <div><p className="text-xs text-muted-foreground">Horas em tarefas</p><p className="text-lg font-semibold text-foreground">{formatHours(totalMonthTaskHours)}</p></div>
                    <div><p className="text-xs text-muted-foreground">Horas em reunião</p><p className="text-lg font-semibold text-foreground">{formatHours(totalMonthMeetingHours)}</p></div>
                    <div className="col-span-2 lg:col-span-1"><p className="text-xs text-muted-foreground">Horas remanescentes no mês</p><p className="text-lg font-semibold text-foreground">{formatHours(remainingHours)}</p></div>
                    <div className="col-span-2 mt-1 space-y-2 lg:col-span-5">
                      <div className="h-3 w-full rounded-full bg-muted"><div className="h-3 rounded-full bg-primary transition-all" style={{ width: `${availableHours > 0 ? Math.min((totalMonthHours / availableHours) * 100, 100) : 0}%` }} /></div>
                      <p className="text-xs text-muted-foreground">Disponíveis: {formatHours(availableHours)} • Usadas: {formatHours(totalMonthHours)} • Restantes: {formatHours(remainingHours)}{isMonthly ? ` • Saldo do mês anterior descontado: ${formatHours(previousOverflow)}` : ""}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {isMonthly && totalMonthHours > availableHours && (
                <div className="p-3 rounded-md bg-amber-500/10 border border-amber-500/30 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm text-amber-600 dark:text-amber-400 font-medium">Uso acima do contratado no período</p>
                  </div>
                </div>
              )}

              {reportData.length === 0 ? (
                <Card><CardContent className="py-12 text-center"><p className="text-muted-foreground">Nenhum projeto com horas registradas no período selecionado.</p></CardContent></Card>
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
                                  {isExpanded ? <ChevronDown className="w-5 h-5 text-muted-foreground" /> : <ChevronRight className="w-5 h-5 text-muted-foreground" />}
                                  <CardTitle className="text-base">{project.name}</CardTitle>
                                </div>
                                <div className="text-right"><div className="flex gap-2 text-sm font-medium">{project.monthTaskHours > 0 && <span className="text-primary">{formatHours(project.monthTaskHours)} tarefas</span>}{project.monthMeetingHours > 0 && <span className="text-accent-foreground">{formatHours(project.monthMeetingHours)} reuniões</span>}</div></div>
                              </div>
                            </CardHeader>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <CardContent className="pt-0">
                              {projectColumns.length > 0 && Object.keys(customFields).length > 0 && (
                                <div className="border-t border-border pt-4 mb-4">
                                  <p className="text-sm font-medium text-muted-foreground mb-3">Campos do Projeto</p>
                                  <div className="flex flex-wrap gap-2">
                                    {projectColumns.map((col) => {
                                      const value = customFields[col.id];
                                      if (!value) return null;
                                      return (
                                        <div key={col.id} className="inline-flex items-center gap-1.5 px-2 py-1 bg-muted rounded-md text-sm">
                                          <span className="text-muted-foreground">{col.name}:</span>
                                          <span className="font-medium text-foreground">{value}</span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                              <div className={projectColumns.length > 0 && Object.keys(customFields).length > 0 ? "" : "border-t border-border pt-4"}>
                                <p className="text-sm font-medium text-muted-foreground mb-3">Tarefas ({project.tasks.length})</p>
                                <div className="space-y-3">
                                  {project.tasks.map((task) => (
                                    <div key={task.id} className="flex items-center justify-between py-2 px-3 bg-muted/50 rounded-md">
                                      <div>
                                        <p className="font-medium text-foreground">{task.name}</p>
                                        {task.description && <WysiwygContent content={task.description} className="text-sm text-muted-foreground" />}
                                      </div>
                                      <div className="text-right"><div className="flex gap-2 text-xs">{task.monthTaskHours > 0 && <span className="text-primary font-medium">{formatHours(task.monthTaskHours)} tarefas</span>}{task.monthMeetingHours > 0 && <span className="text-accent-foreground font-medium">{formatHours(task.monthMeetingHours)} reuniões</span>}</div></div>
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
              {requestsLoadError && (
                <Card className="mb-4 border-amber-500/40 bg-amber-500/5">
                  <CardContent className="py-3">
                    <p className="text-sm text-amber-700 dark:text-amber-300">{requestsLoadError}</p>
                  </CardContent>
                </Card>
              )}

              {filteredRequestHistory.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center space-y-2">
                    <p className="text-muted-foreground">Nenhuma solicitação encontrada para este mês.</p>
                    {requests.length > 0 && (
                      <p className="text-xs text-muted-foreground">Há {requests.length} solicitação(ões) em outros meses. Selecione outro mês para visualizar.</p>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {filteredRequestHistory.map((request) => (
                    <Card key={request.request_id}>
                      <CardContent className="py-4 space-y-3">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="font-medium text-foreground">{request.title}</p>
                            <p className="text-xs text-muted-foreground">Criada em {format(parseRequestDate(request.created_at) || new Date(request.created_at), "dd 'de' MMMM 'de' yyyy, HH:mm", { locale: ptBR })}</p>
                          </div>
                          <Badge variant={getStatusVariant(request.status)}>{getStatusLabel(request.status)}</Badge>
                        </div>

                        {request.description && <WysiwygContent content={request.description} className="text-sm text-muted-foreground" />}

                        <div className="flex flex-col gap-1 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                          <span>Última atualização: {format(parseRequestDate(request.updated_at) || new Date(request.updated_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
                          {request.deadline && <span>Prazo solicitado: {format(parseISO(request.deadline), "dd/MM/yyyy", { locale: ptBR })}</span>}
                        </div>

                        {request.admin_notes && (
                          <div className="rounded-md border border-border bg-muted/40 p-2">
                            <p className="text-xs font-medium text-foreground">Observação da equipe</p>
                            <p className="text-sm text-muted-foreground">{request.admin_notes}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>

          <div className="mt-10 flex justify-center border-t border-border pt-4 print:hidden">
            <img src={orasLogo} alt="Oras" className="h-4 opacity-70" />
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
};
