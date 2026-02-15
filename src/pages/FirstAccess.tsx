import React, { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { BriefcaseBusiness, Building2, Loader2 } from "lucide-react";
import simboloOras from "@/assets/simbolo-oras.svg";

type UsageType = "provider" | "client";

export const FirstAccess: React.FC = () => {
  const navigate = useNavigate();
  const { user, loading, roleLoading, userRole, refreshRole, signOut } = useAuth();

  const [selectedType, setSelectedType] = useState<UsageType | null>(null);
  const [companyName, setCompanyName] = useState("");
  const [responsibleEmail, setResponsibleEmail] = useState(user?.email ?? "");
  const [responsibleName, setResponsibleName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const finishProviderSetup = async () => {
    setSubmitting(true);

    const { error } = await supabase.functions.invoke("complete-onboarding", {
      body: {
        usageType: "provider",
        appOrigin: window.location.origin,
      },
    });

    if (error) {
      toast.error("Não foi possível concluir seu primeiro acesso.");
      setSubmitting(false);
      return;
    }

    await refreshRole();
    toast.success("Perfil configurado com sucesso!");
    navigate("/", { replace: true });
  };

  const finishClientSetup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!companyName.trim()) {
      toast.error("Informe o nome da empresa.");
      return;
    }

    if (!responsibleEmail.trim()) {
      toast.error("Informe o email do responsável.");
      return;
    }

    setSubmitting(true);

    const { error } = await supabase.functions.invoke("complete-onboarding", {
      body: {
        usageType: "client",
        companyName: companyName.trim(),
        responsibleEmail: responsibleEmail.trim().toLowerCase(),
        responsibleName: responsibleName.trim() || null,
        appOrigin: window.location.origin,
      },
    });

    if (error) {
      toast.error("Não foi possível cadastrar a empresa neste momento.");
      setSubmitting(false);
      return;
    }

    await refreshRole();
    toast.success("Empresa cadastrada! Você já pode acessar e aguardar a ativação do responsável.");
    navigate("/", { replace: true });
  };

  const cancelRegistration = async () => {
    setSubmitting(true);

    try {
      await signOut();
    } catch {
      toast.error("Não foi possível cancelar o cadastro neste momento.");
      setSubmitting(false);
      return;
    }

    toast.success("Cadastro cancelado com sucesso.");
    navigate("/login", { replace: true });
  };

  if (loading || roleLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <img src={simboloOras} alt="Carregando ORAS" className="w-12 h-12 animate-spin [animation-duration:3s]" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (userRole) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-muted/40 p-4 flex items-center justify-center">
      <Card className="w-full max-w-3xl shadow-lg">
        <CardHeader>
          <CardTitle>Como você deseja usar a ORAS?</CardTitle>
          <CardDescription>
            Selecione uma opção para concluir seu primeiro acesso.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-end">
            <Button type="button" variant="ghost" onClick={cancelRegistration} disabled={submitting}>
              Cancelar cadastro
            </Button>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <Button
              type="button"
              variant={selectedType === "provider" ? "default" : "outline"}
              className="h-auto py-5 px-4 justify-start text-left"
              onClick={() => setSelectedType("provider")}
              disabled={submitting}
            >
              <div className="flex gap-3">
                <BriefcaseBusiness className="w-5 h-5 mt-0.5" />
                <div>
                  <p className="font-semibold">Sou prestador de serviço</p>
                  <p className="text-xs opacity-80">Quero gerenciar projetos e ter relatórios robustos.</p>
                </div>
              </div>
            </Button>

            <Button
              type="button"
              variant={selectedType === "client" ? "default" : "outline"}
              className="h-auto py-5 px-4 justify-start text-left"
              onClick={() => setSelectedType("client")}
              disabled={submitting}
            >
              <div className="flex gap-3">
                <Building2 className="w-5 h-5 mt-0.5" />
                <div>
                  <p className="font-semibold">Sou cliente</p>
                  <p className="text-xs opacity-80">Quero acompanhar relatórios de horas por projeto.</p>
                </div>
              </div>
            </Button>
          </div>

          {selectedType === "provider" && (
            <div className="rounded-md border p-4 space-y-4">
              <p className="text-sm text-muted-foreground">
                Você receberá acesso administrativo para configurar e gerenciar sua operação.
              </p>
              <Button type="button" onClick={finishProviderSetup} disabled={submitting}>
                {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Concluir como prestador
              </Button>
            </div>
          )}

          {selectedType === "client" && (
            <form onSubmit={finishClientSetup} className="rounded-md border p-4 space-y-4">
              <p className="text-sm text-muted-foreground">
                Cadastre sua empresa e o e-mail do responsável. O responsável receberá acesso de administrador.
              </p>

              <div className="space-y-2">
                <Label htmlFor="company-name">Nome da empresa</Label>
                <Input
                  id="company-name"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  required
                  disabled={submitting}
                  placeholder="Ex.: Empresa XYZ"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="responsible-name">Nome do responsável (opcional)</Label>
                <Input
                  id="responsible-name"
                  value={responsibleName}
                  onChange={(e) => setResponsibleName(e.target.value)}
                  disabled={submitting}
                  placeholder="Ex.: Maria Silva"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="responsible-email">Email do responsável</Label>
                <Input
                  id="responsible-email"
                  type="email"
                  value={responsibleEmail}
                  onChange={(e) => setResponsibleEmail(e.target.value)}
                  required
                  disabled={submitting}
                  placeholder="responsavel@empresa.com"
                />
              </div>

              <Button type="submit" disabled={submitting}>
                {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Cadastrar empresa e concluir
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
