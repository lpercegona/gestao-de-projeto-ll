import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Copy, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface LinkSettings {
  id: string;
  is_enabled: boolean;
  share_token: string;
}

interface RequestLog {
  id: string;
  title: string;
  created_at: string;
  source: string;
  requester_name: string | null;
  requester_email: string | null;
  requester_ip: string | null;
}

export const RequestsSettingsTab: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<LinkSettings | null>(null);
  const [requests, setRequests] = useState<RequestLog[]>([]);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);

  const publicUrl = settings ? `${window.location.origin}/request/${settings.share_token}` : "";

  const fetchAll = async () => {
    if (!user) return;
    setLoading(true);
    const { data: existing } = await supabase
      .from("request_link_settings")
      .select("id, is_enabled, share_token")
      .eq("owner_id", user.id)
      .maybeSingle();

    let s = existing as LinkSettings | null;
    if (!s) {
      const { data: created } = await supabase
        .from("request_link_settings")
        .insert({ owner_id: user.id, is_enabled: false })
        .select("id, is_enabled, share_token")
        .single();
      s = created as LinkSettings;
    }
    setSettings(s);

    // Fetch logs: project_requests for clients owned by this admin
    const { data: clients } = await supabase
      .from("clients")
      .select("id")
      .eq("owner_id", user.id);
    const clientIds = (clients || []).map((c) => c.id);
    if (clientIds.length > 0) {
      const { data: logs } = await supabase
        .from("project_requests")
        .select("id, title, created_at, source, requester_name, requester_email, requester_ip")
        .in("client_id", clientIds)
        .order("created_at", { ascending: false })
        .limit(500);
      setRequests((logs || []) as RequestLog[]);
    }
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, [user]);

  const handleToggle = async (checked: boolean) => {
    if (!settings) return;
    setSaving(true);
    const { error } = await supabase
      .from("request_link_settings")
      .update({ is_enabled: checked })
      .eq("id", settings.id);
    setSaving(false);
    if (error) { toast.error("Erro ao atualizar"); return; }
    setSettings({ ...settings, is_enabled: checked });
    toast.success(checked ? "Link ativado" : "Link desativado");
  };

  const handleRegenerate = async () => {
    if (!settings) return;
    setSaving(true);
    const newToken = crypto.randomUUID();
    const { error } = await supabase
      .from("request_link_settings")
      .update({ share_token: newToken })
      .eq("id", settings.id);
    setSaving(false);
    if (error) { toast.error("Erro ao regenerar"); return; }
    setSettings({ ...settings, share_token: newToken });
    toast.success("Token regenerado");
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(publicUrl);
    toast.success("Link copiado");
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return requests;
    return requests.filter((r) =>
      (r.title || "").toLowerCase().includes(q)
      || (r.requester_name || "").toLowerCase().includes(q)
      || (r.requester_email || "").toLowerCase().includes(q));
  }, [requests, search]);

  if (loading) {
    return <div className="flex items-center justify-center h-32"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <div>
          <h3 className="text-sm font-medium">Link público de solicitação</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Permita que clientes enviem solicitações de projeto via um link público com validação de e-mail.</p>
        </div>
        <div className="flex items-center gap-3">
          <Switch checked={settings?.is_enabled || false} onCheckedChange={handleToggle} disabled={saving} />
          <Label className="text-xs">Ativar link público de solicitação de projeto</Label>
        </div>
        {settings?.is_enabled && (
          <div className="space-y-2 rounded-md border border-border p-3 bg-muted/20">
            <Label className="text-xs">URL pública</Label>
            <div className="flex gap-2">
              <Input value={publicUrl} readOnly className="text-xs font-mono" />
              <Button size="sm" variant="outline" onClick={handleCopy}><Copy className="h-3.5 w-3.5" /></Button>
              <Button size="sm" variant="outline" onClick={handleRegenerate} disabled={saving} title="Regenerar token"><RefreshCw className="h-3.5 w-3.5" /></Button>
            </div>
            <p className="text-[11px] text-muted-foreground">O solicitante precisará informar um e-mail vinculado a um cliente cadastrado para acessar o formulário.</p>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div>
          <h3 className="text-sm font-medium">Log de solicitações</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Todas as solicitações recebidas, incluindo origem e IP quando disponível.</p>
        </div>
        <Input placeholder="Buscar por título, nome ou e-mail" value={search} onChange={(e) => setSearch(e.target.value)} className="text-xs max-w-sm" />
        <div className="rounded-md border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Título</TableHead>
                <TableHead className="text-xs">Data</TableHead>
                <TableHead className="text-xs">Solicitante</TableHead>
                <TableHead className="text-xs">Origem</TableHead>
                <TableHead className="text-xs">IP</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-xs text-center text-muted-foreground py-6">Nenhuma solicitação encontrada</TableCell></TableRow>
              ) : filtered.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="text-xs">{r.title}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{format(new Date(r.created_at), "dd/MM/yyyy HH:mm")}</TableCell>
                  <TableCell className="text-xs">
                    <div>{r.requester_name || "—"}</div>
                    <div className="text-muted-foreground">{r.requester_email || "—"}</div>
                  </TableCell>
                  <TableCell className="text-xs">
                    <Badge variant={r.source === "public_link" ? "default" : "secondary"} className="text-[10px]">
                      {r.source === "public_link" ? "Link público" : "Logado"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground font-mono">{r.requester_ip || "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  );
};