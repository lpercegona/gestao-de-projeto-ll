import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FileText, ChevronDown, Clock, CheckCircle, XCircle, AlertCircle, ListTodo } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

type RequestStatus = "pending" | "approved" | "rejected" | "analyzing" | string;
type RequestType = "project" | "new_task" | "edit_task" | "edit_project" | "edit_request";

interface RequestClient {
  name: string;
  company: string | null;
}

interface DashboardRequest {
  id: string;
  title: string;
  status: RequestStatus;
  created_at: string;
  client_id: string;
  type: RequestType;
  client?: RequestClient;
}

interface ProjectRequestRow {
  id: string;
  title: string;
  status: string;
  created_at: string;
  client_id: string;
  converted_project_id: string | null;
  clients: RequestClient | null;
}

interface EditRequestRow {
  id: string;
  status: string;
  created_at: string;
  client_id: string;
  entity_type: string;
  proposed_data: Record<string, unknown> | null;
  clients: RequestClient | null;
}

export const SolicitacoesPanel: React.FC = () => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(true);
  const [requests, setRequests] = useState<DashboardRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        const [projectRequestsResult, editRequestsResult] = await Promise.all([
          supabase
            .from("project_requests")
            .select(
              `
              id,
              title,
              status,
              created_at,
              client_id,
              converted_project_id,
              clients!project_requests_client_id_fkey (
                name,
                company
              )
            `,
            )
            .eq("status", "pending")
            .order("created_at", { ascending: false })
            .limit(10),
          supabase
            .from("edit_requests")
            .select(
              `
              id,
              status,
              created_at,
              client_id,
              entity_type,
              proposed_data,
              clients!fk_edit_requests_client (
                name,
                company
              )
            `,
            )
            .eq("status", "pending")
            .order("created_at", { ascending: false })
            .limit(30),
        ]);

        if (projectRequestsResult.error) throw projectRequestsResult.error;
        if (editRequestsResult.error) throw editRequestsResult.error;

        const projectRequests: DashboardRequest[] = ((projectRequestsResult.data || []) as unknown as ProjectRequestRow[])
          .map((req) => ({
            id: req.id,
            title: req.title,
            status: req.status,
            created_at: req.created_at,
            client_id: req.client_id,
            type: "project",
            client: req.clients || undefined,
          }));

        const editRequests: DashboardRequest[] = ((editRequestsResult.data || []) as unknown as EditRequestRow[])
          .map((req) => {
            const requestType =
              typeof req.proposed_data?.request_type === "string"
                ? req.proposed_data.request_type
                : req.entity_type === "project"
                  ? "edit_project"
                  : req.entity_type === "task"
                    ? "edit_task"
                    : "edit_request";

            const resolvedType: RequestType =
              requestType === "new_task" || requestType === "edit_task" || requestType === "edit_project"
                ? requestType
                : req.entity_type === "project"
                  ? "edit_project"
                  : req.entity_type === "task"
                    ? "edit_task"
                    : "edit_request";

            const defaultTitleMap: Record<RequestType, string> = {
              project: "Solicitação de projeto",
              new_task: "Solicitação de nova tarefa",
              edit_task: "Solicitação de edição de tarefa",
              edit_project: "Solicitação de edição de projeto",
              edit_request: "Solicitação de edição",
            };

            const title =
              (typeof req.proposed_data?.task_name === "string" && req.proposed_data.task_name) ||
              (typeof req.proposed_data?.name === "string" && req.proposed_data.name) ||
              (typeof req.proposed_data?.title === "string" && req.proposed_data.title) ||
              defaultTitleMap[resolvedType];

            return {
              id: req.id,
              title,
              status: req.status,
              created_at: req.created_at,
              client_id: req.client_id,
              type: resolvedType,
              client: req.clients || undefined,
            };
          });

        const merged = [...projectRequests, ...editRequests]
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 5);

        setRequests(merged);
      } catch (error) {
        console.error("Error fetching requests:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchRequests();
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30">
            <Clock className="h-3 w-3 mr-1" />
            Pendente
          </Badge>
        );
      case "approved":
        return (
          <Badge variant="outline" className="bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/30">
            <CheckCircle className="h-3 w-3 mr-1" />
            Aprovado
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="outline" className="bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30">
            <XCircle className="h-3 w-3 mr-1" />
            Rejeitado
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            <AlertCircle className="h-3 w-3 mr-1" />
            {status}
          </Badge>
        );
    }
  };

  const getTypeBadge = (type: RequestType) => {
    if (type === "new_task") {
      return (
        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5">
          <ListTodo className="h-2.5 w-2.5 mr-1" />
          Nova tarefa
        </Badge>
      );
    }

    if (type === "edit_task") {
      return <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5">Edição tarefa</Badge>;
    }

    if (type === "edit_project") {
      return <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5">Edição projeto</Badge>;
    }

    if (type === "edit_request") {
      return <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5">Edição solicitação</Badge>;
    }

    return (
      <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5">
        <FileText className="h-2.5 w-2.5 mr-1" />
        Projeto
      </Badge>
    );
  };

  const pendingCount = requests.filter((r) => r.status === "pending").length;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors rounded-t-lg pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
                <FileText className="h-4 w-4" />
                Solicitações
                {pendingCount > 0 && (
                  <Badge variant="outline" className="ml-1 bg-blue-500/10">
                    {pendingCount} pendente{pendingCount > 1 ? "s" : ""}
                  </Badge>
                )}
              </CardTitle>
              <ChevronDown
                className={cn("h-4 w-4 text-muted-foreground transition-transform", isOpen && "rotate-180")}
              />
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0">
            {loading ? (
              <p className="text-sm text-muted-foreground">Carregando...</p>
            ) : requests.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma solicitação pendente.</p>
            ) : (
              <div className="space-y-3">
                {requests.map((req) => (
                  <div
                    key={`${req.type}-${req.id}`}
                    className="flex flex-col sm:flex-row sm:items-start justify-between py-2 border-b border-border last:border-0 cursor-pointer hover:bg-muted/50 rounded px-2 gap-2 min-w-0"
                    onClick={() => navigate("/projects?filter=requests")}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm truncate">{req.title}</p>
                        {getTypeBadge(req.type)}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {req.client?.company || req.client?.name || "Cliente"} •{" "}
                        {format(parseISO(req.created_at), "dd/MM", { locale: ptBR })}
                      </p>
                    </div>
                    <div className="shrink-0 sm:ml-2">{getStatusBadge(req.status)}</div>
                  </div>
                ))}
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full mt-2"
                  onClick={() => navigate("/projects?filter=requests")}
                >
                  Ver todas
                </Button>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};
