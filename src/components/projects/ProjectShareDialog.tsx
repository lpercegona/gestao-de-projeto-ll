import React, { useCallback, useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trash2, Plus, Loader2, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useEditingLock } from "@/hooks/useEditingLock";

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
  canManageShare: boolean;
}

type Member = ProfileSummary & {
  accessId: string;
};

export const ProjectShareDialog: React.FC<ProjectShareDialogProps> = ({
  projectId,
  projectOwnerId,
  isOpen,
  onClose,
  canManageShare,
}) => {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [adding, setAdding] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  useEditingLock(isOpen);

  const getMemberName = (member: Pick<Member, "full_name" | "email">) => {
    const fullName = member.full_name?.trim();
    if (fullName) return fullName;

    const safeEmail = member.email?.trim();
    if (safeEmail) return "Usuário sem perfil";

    return "Usuário";
  };

  const getMemberEmail = (member: Pick<Member, "email">) => {
    const safeEmail = member.email?.trim();
    return safeEmail || "Email indisponível";
  };

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    try {
      const { data: accessData, error: accessError } = await supabase
        .from("user_project_access")
        .select("id, user_id")
        .eq("project_id", projectId);

      if (accessError) throw accessError;

      const accessByUserId: Record<string, string> = {};
      (accessData || []).forEach((entry) => {
        accessByUserId[entry.user_id] = entry.id;
      });

      const userIds = new Set((accessData || []).map((a) => a.user_id));
      if (projectOwnerId) {
        userIds.add(projectOwnerId);
      }

      if (userIds.size === 0) {
        setMembers([]);
        setLoading(false);
        return;
      }

      const userIdList = Array.from(userIds);
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, full_name, email, avatar_url")
        .in("user_id", userIdList);

      if (profilesError) throw profilesError;

      const profilesByUserId: Record<string, ProfileSummary> = {};
      (profiles || []).forEach((profile) => {
        profilesByUserId[profile.user_id] = profile;
      });

      const membersList: Member[] = userIdList.map((userId) => {
        const profile = profilesByUserId[userId];
        return {
          user_id: userId,
          full_name: profile?.full_name || null,
          email: profile?.email || null,
          avatar_url: profile?.avatar_url || null,
          accessId: accessByUserId[userId] || "",
        };
      });

      const sortedMembers = membersList.sort((a, b) => {
        const aIsOwner = a.user_id === projectOwnerId;
        const bIsOwner = b.user_id === projectOwnerId;

        if (aIsOwner && !bIsOwner) return -1;
        if (!aIsOwner && bIsOwner) return 1;

        return getMemberName(a).localeCompare(getMemberName(b), "pt-BR", {
          sensitivity: "base",
        });
      });

      setMembers(sortedMembers);
    } catch (error) {
      console.error("Erro ao buscar membros do projeto:", error);
    } finally {
      setLoading(false);
    }
  }, [projectId, projectOwnerId]);

  useEffect(() => {
    if (isOpen) {
      fetchMembers();
      setEmail("");
    }
  }, [fetchMembers, isOpen]);

  const handleAdd = async () => {
    if (!canManageShare) return;

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

      toast.success(
        `${profileData.full_name || profileData.email} adicionado ao projeto.`,
      );
      setEmail("");
      await fetchMembers();
    } catch (error) {
      console.error("Erro ao adicionar membro:", error);
      toast.error("Erro ao adicionar membro.");
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (member: Member) => {
    if (!canManageShare) return;

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

      toast.success(
        `${member.full_name || member.email || "Usuário"} removido do projeto.`,
      );
      await fetchMembers();
    } catch (error) {
      console.error("Erro ao remover membro:", error);
      toast.error("Erro ao remover membro.");
    } finally {
      setRemovingId(null);
    }
  };

  const getInitial = (member: Member) => {
    if (member.full_name?.trim())
      return member.full_name.trim()[0].toUpperCase();
    if (member.email?.trim()) return member.email.trim()[0].toUpperCase();
    if (member.user_id.trim()) return member.user_id.trim()[0].toUpperCase();
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

        {canManageShare && (
          <div className="flex gap-2">
            <Input
              placeholder="Email do usuário"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              disabled={adding}
            />
            <Button
              size="sm"
              onClick={handleAdd}
              disabled={adding || !email.trim()}
            >
              {adding ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
            </Button>
          </div>
        )}

        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : members.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhum membro com acesso.
            </p>
          ) : (
            members.map((member) => {
              const isOwner = member.user_id === projectOwnerId;
              return (
                <div
                  key={member.user_id}
                  className="flex items-center justify-between gap-2 p-2 rounded-md hover:bg-muted/50"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarImage
                        src={member.avatar_url?.trim() || undefined}
                      />
                      <AvatarFallback className="text-xs bg-muted text-muted-foreground">
                        {getInitial(member)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate text-foreground">
                        {getMemberName(member)}
                        {isOwner && (
                          <span className="text-muted-foreground ml-1">
                            (proprietário)
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {getMemberEmail(member)}
                      </p>
                    </div>
                  </div>
                  {canManageShare && !isOwner && member.accessId && (
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
