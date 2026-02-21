import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trash2, Plus, Loader2, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ProfileSummary {
  user_id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
}

interface ProjectShareDialogProps {
  projectId: string;
  projectOwnerId?: string | null;
  isOpen: boolean;
  onClose: () => void;
  isAdminOrMaster: boolean;
}

export const ProjectShareDialog: React.FC<ProjectShareDialogProps> = ({
  projectId,
  projectOwnerId,
  isOpen,
  onClose,
  isAdminOrMaster,
}) => {
  const [members, setMembers] = useState<(ProfileSummary & { accessId: string })[]>([]);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [adding, setAdding] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const { data: accessData, error: accessError } = await supabase
        .from("user_project_access")
        .select("id, user_id")
        .eq("project_id", projectId);

      if (accessError) throw accessError;

      const userIds = (accessData || []).map((a) => a.user_id);
      if (projectOwnerId && !userIds.includes(projectOwnerId)) {
        userIds.push(projectOwnerId);
      }

      if (userIds.length === 0) {
        setMembers([]);
        setLoading(false);
        return;
      }

      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, full_name, email, avatar_url")
        .in("user_id", userIds);

      if (profilesError) throw profilesError;

      const membersList = (profiles || []).map((profile) => {
        const access = (accessData || []).find((a) => a.user_id === profile.user_id);
        return {
          ...profile,
          accessId: access?.id || "",
        };
      });

      setMembers(membersList);
    } catch (error) {
      console.error("Erro ao buscar membros do projeto:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchMembers();
      setEmail("");
    }
  }, [isOpen, projectId]);

  const handleAdd = async () => {
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) return;

    setAdding(true);
    try {
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("user_id, full_name, email, avatar_url")
        .eq("email", trimmedEmail)
        .maybeSingle();

      if (profileError) throw profileError;

      if (!profileData) {
        toast.error("Usuário não encontrado com esse email.");
        setAdding(false);
        return;
      }

      if (members.some((m) => m.user_id === profileData.user_id)) {
        toast.info("Esse usuário já tem acesso ao projeto.");
        setAdding(false);
        return;
      }

      const { data: session } = await supabase.auth.getSession();
      const grantedBy = session?.session?.user?.id;

      if (!grantedBy) {
        toast.error("Erro de autenticação.");
        setAdding(false);
        return;
      }

      const { error: insertError } = await supabase
        .from("user_project_access")
        .insert({
          project_id: projectId,
          user_id: profileData.user_id,
          granted_by: grantedBy,
          can_edit: true,
        });

      if (insertError) throw insertError;

      toast.success(`${profileData.full_name || profileData.email} adicionado ao projeto.`);
      setEmail("");
      await fetchMembers();
    } catch (error) {
      console.error("Erro ao adicionar membro:", error);
      toast.error("Erro ao adicionar membro.");
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (member: (typeof members)[0]) => {
    if (member.user_id === projectOwnerId) {
      toast.error("Não é possível remover o proprietário do projeto.");
      return;
    }

    if (!member.accessId) {
      toast.error("Não é possível remover este membro.");
      return;
    }

    setRemovingId(member.accessId);
    try {
      const { error } = await supabase
        .from("user_project_access")
        .delete()
        .eq("id", member.accessId);

      if (error) throw error;

      toast.success(`${member.full_name || member.email} removido do projeto.`);
      await fetchMembers();
    } catch (error) {
      console.error("Erro ao remover membro:", error);
      toast.error("Erro ao remover membro.");
    } finally {
      setRemovingId(null);
    }
  };

  const getInitial = (profile: ProfileSummary) => {
    if (profile.full_name?.trim()) return profile.full_name.trim()[0].toUpperCase();
    if (profile.email?.trim()) return profile.email.trim()[0].toUpperCase();
    return "?";
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Compartilhar Projeto
          </DialogTitle>
        </DialogHeader>

        {isAdminOrMaster && (
          <div className="flex gap-2">
            <Input
              placeholder="Email do usuário"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              disabled={adding}
            />
            <Button size="sm" onClick={handleAdd} disabled={adding || !email.trim()}>
              {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            </Button>
          </div>
        )}

        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : members.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhum membro com acesso.</p>
          ) : (
            members.map((member) => {
              const isOwner = member.user_id === projectOwnerId;
              return (
                <div key={member.user_id} className="flex items-center justify-between gap-2 p-2 rounded-md hover:bg-muted/50">
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarImage src={member.avatar_url?.trim() || undefined} />
                      <AvatarFallback className="text-xs bg-muted text-muted-foreground">
                        {getInitial(member)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate text-foreground">
                        {member.full_name || member.email}
                        {isOwner && <span className="text-muted-foreground ml-1">(proprietário)</span>}
                      </p>
                      {member.full_name && (
                        <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                      )}
                    </div>
                  </div>
                  {isAdminOrMaster && !isOwner && member.accessId && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0 text-destructive hover:text-destructive"
                      onClick={() => handleRemove(member)}
                      disabled={removingId === member.accessId}
                    >
                      {removingId === member.accessId ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                    </Button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
