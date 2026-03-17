import React, { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Lock } from "lucide-react";
import { toast } from "sonner";

export const SecuritySection: React.FC = () => {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("As senhas não coincidem.");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("A nova senha deve ter pelo menos 6 caracteres.");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) toast.error("Erro ao alterar senha: " + error.message);
      else {
        toast.success("Senha alterada com sucesso!");
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch {
      toast.error("Erro ao alterar senha.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-medium text-foreground">Alterar Senha</h3>
        <p className="text-xs text-muted-foreground mt-0.5">Defina uma nova senha de acesso</p>
      </div>
      <form onSubmit={handleChangePassword} className="space-y-2 max-w-xs">
        <div className="space-y-1">
          <Label htmlFor="newPassword" className="text-xs">Nova Senha</Label>
          <Input id="newPassword" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Mínimo 6 caracteres" disabled={saving} minLength={6} required className="h-8 text-xs" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="confirmPassword" className="text-xs">Confirmar Nova Senha</Label>
          <Input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Repita a nova senha" disabled={saving} minLength={6} required className="h-8 text-xs" />
        </div>
        <Button type="submit" size="sm" disabled={saving} className="mt-1">
          {saving ? (<><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Alterando...</>) : (<><Lock className="w-3.5 h-3.5 mr-1.5" />Alterar Senha</>)}
        </Button>
      </form>
    </div>
  );
};
