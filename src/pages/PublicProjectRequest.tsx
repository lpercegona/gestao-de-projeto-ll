import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { WysiwygEditor } from "@/components/ui/wysiwyg-editor";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export const PublicProjectRequest: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [checking, setChecking] = useState(true);
  const [linkValid, setLinkValid] = useState(false);
  const [step, setStep] = useState<"email" | "form" | "done">("email");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [validating, setValidating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [title, setTitle] = useState("");
  const [briefing, setBriefing] = useState("");
  const [deadline, setDeadline] = useState("");

  useEffect(() => {
    const check = async () => {
      if (!token) { setChecking(false); return; }
      const { data, error } = await supabase.rpc("get_public_request_link", { p_token: token });
      setLinkValid(!error && !!data && data.length > 0);
      setChecking(false);
    };
    check();
  }, [token]);

  const handleValidate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setValidating(true);
    const { data, error } = await supabase.rpc("validate_request_email", { p_token: token, p_email: email });
    setValidating(false);
    if (error || !data || data.length === 0) {
      toast.error("E-mail não vinculado a nenhum cliente cadastrado.");
      return;
    }
    setStep("form");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !title.trim() || !briefing.replace(/<[^>]*>/g, "").trim()) return;
    setSubmitting(true);
    const { data, error } = await supabase.functions.invoke("submit-public-project-request", {
      body: { token, email, name, title: title.trim(), briefing, desired_deadline: deadline || null },
    });
    setSubmitting(false);
    if (error || (data as { error?: string })?.error) {
      toast.error("Erro ao enviar solicitação.");
      return;
    }
    setStep("done");
  };

  if (checking) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;

  if (!linkValid) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
        <Card className="max-w-md"><CardContent className="p-6 text-center space-y-2">
          <h1 className="text-lg font-semibold">Link indisponível</h1>
          <p className="text-sm text-muted-foreground">Este link de solicitação não está ativo no momento.</p>
        </CardContent></Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
      <Card className="w-full max-w-2xl">
        <CardContent className="p-6 space-y-4">
          <h1 className="text-xl font-semibold">Solicitar novo projeto</h1>

          {step === "email" && (
            <form onSubmit={handleValidate} className="space-y-3">
              <p className="text-sm text-muted-foreground">Informe seu e-mail e nome para acessar o formulário. Apenas e-mails vinculados a clientes cadastrados são autorizados.</p>
              <div className="space-y-2"><Label>Nome *</Label><Input value={name} onChange={(e) => setName(e.target.value)} required /></div>
              <div className="space-y-2"><Label>E-mail *</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
              <Button type="submit" disabled={validating || !email || !name}>{validating && <Loader2 className="w-4 h-4 animate-spin mr-2" />}Continuar</Button>
            </form>
          )}

          {step === "form" && (
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="space-y-2"><Label>Título do projeto *</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} required /></div>
              <div className="space-y-2"><Label>Briefing detalhado *</Label><WysiwygEditor value={briefing} onChange={setBriefing} minHeight="120px" /></div>
              <div className="space-y-2"><Label>Prazo desejado (opcional)</Label><Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} /></div>
              <Button type="submit" disabled={submitting}>{submitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}Enviar solicitação</Button>
            </form>
          )}

          {step === "done" && (
            <div className="text-center space-y-2 py-6">
              <h2 className="text-lg font-semibold">Solicitação enviada!</h2>
              <p className="text-sm text-muted-foreground">Recebemos seu pedido. A equipe entrará em contato em breve.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};