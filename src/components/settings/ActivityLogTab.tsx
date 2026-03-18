import React, { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Loader, Users, FolderKanban, ListTodo, FileText, FileSignature, User, Trash2, Pencil, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  entity_type: string;
  entity_name: string | null;
  created_at: string;
  details: Record<string, unknown>;
  profiles?: { full_name: string | null; email: string | null } | null;
}

const ENTITY_CONFIG: Record<string, { label: string; icon: React.ElementType }> = {
  clients: { label: "Cliente", icon: Users },
  projects: { label: "Projeto", icon: FolderKanban },
  tasks: { label: "Tarefa", icon: ListTodo },
  proposals: { label: "Proposta", icon: FileText },
  contracts: { label: "Contrato", icon: FileSignature },
  profiles: { label: "Perfil", icon: User },
};

const ACTION_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  insert: { label: "Criou", icon: Plus, color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  update: { label: "Editou", icon: Pencil, color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  delete: { label: "Removeu", icon: Trash2, color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
};

export const ActivityLogTab: React.FC = () => {
  const { user } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterEntity, setFilterEntity] = useState("all");

  useEffect(() => {
    if (!user) return;
    const fetchLogs = async () => {
      setLoading(true);
      let query = supabase
        .from("audit_logs" as any)
        .select("id, user_id, action, entity_type, entity_name, created_at, details")
        .order("created_at", { ascending: false })
        .limit(100);

      if (filterEntity !== "all") {
        query = query.eq("entity_type", filterEntity);
      }

      const { data } = await query;
      const rawLogs = (data as unknown as AuditLog[]) || [];

      // Fetch profile names for unique user_ids
      const userIds = [...new Set(rawLogs.map(l => l.user_id))];
      const { data: profiles } = userIds.length > 0
        ? await supabase.from("profiles").select("user_id, full_name, email").in("user_id", userIds)
        : { data: [] };
      const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));

      setLogs(rawLogs.map(l => ({ ...l, profiles: profileMap.get(l.user_id) || null })));
      setLoading(false);
    };
    fetchLogs();
  }, [user, filterEntity]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-medium text-foreground">Log de Atividades</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Histórico de alterações na conta</p>
        </div>
        <Select value={filterEntity} onValueChange={setFilterEntity}>
          <SelectTrigger className="w-[140px] h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">Todos</SelectItem>
            {Object.entries(ENTITY_CONFIG).map(([key, cfg]) => (
              <SelectItem key={key} value={key} className="text-xs">{cfg.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {logs.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-8">Nenhuma atividade registrada.</p>
      ) : (
        <div className="space-y-1">
          {logs.map((log) => {
            const entity = ENTITY_CONFIG[log.entity_type] || { label: log.entity_type, icon: FileText };
            const action = ACTION_CONFIG[log.action] || ACTION_CONFIG.update;
            const EntityIcon = entity.icon;
            const userName = (log.profiles as any)?.full_name || (log.profiles as any)?.email || "Usuário";

            return (
              <div key={log.id} className="flex items-start gap-3 rounded-md border border-border p-2.5 bg-card">
                <div className="mt-0.5 flex-shrink-0 w-7 h-7 rounded-full bg-muted flex items-center justify-center">
                  <EntityIcon className="w-3.5 h-3.5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-medium text-foreground truncate">{userName}</span>
                    <Badge className={`${action.color} border-0 text-[0.55rem] px-1.5 py-0`}>
                      {action.label}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{entity.label}</span>
                  </div>
                  {log.entity_name && (
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">"{log.entity_name}"</p>
                  )}
                </div>
                <span className="text-[0.6rem] text-muted-foreground whitespace-nowrap flex-shrink-0 mt-0.5">
                  {format(new Date(log.created_at), "dd MMM, HH:mm", { locale: ptBR })}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
