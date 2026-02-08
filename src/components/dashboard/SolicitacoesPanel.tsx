import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FileText, ChevronDown, Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ProjectRequest {
  id: string;
  title: string;
  status: string;
  created_at: string;
  client_id: string;
  converted_project_id?: string | null;
  client?: {
    name: string;
    company: string | null;
  };
}

export const SolicitacoesPanel: React.FC = () => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(true);
  const [requests, setRequests] = useState<ProjectRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        const { data, error } = await supabase
          .from("project_requests")
          .select(
            `
            id,
            title,
            status,
            created_at,
            client_id,
            converted_project_id,
            clients (
              name,
              company
            )
          `,
          )
          .order("created_at", { ascending: false })
          .limit(5);

        if (error) throw error;

        setRequests(
          (data || [])
            .filter((req: any) => !req.converted_project_id)
            .map((req: any) => ({
            ...req,
              client: req.clients,
            })),
        );
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
                  <Badge variant="outlined" className="ml-1 bg-blue-500/10">
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
              <p className="text-sm text-muted-foreground">Nenhuma solicitação encontrada.</p>
            ) : (
              <div className="space-y-3">
                {requests.map((req) => (
                  <div
                    key={req.id}
                    className="flex flex-col sm:flex-row sm:items-start justify-between py-2 border-b border-border last:border-0 cursor-pointer hover:bg-muted/50 rounded px-2 gap-2 min-w-0"
                    onClick={() => navigate("/projects?filter=requests")}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">{req.title}</p>
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
