import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { WysiwygEditor } from "@/components/ui/wysiwyg-editor";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, ImagePlus, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface PublicAttachment {
  name: string;
  contentBase64: string;
  mime: string;
  previewUrl: string;
}

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
  const [publicAttachments, setPublicAttachments] = useState<PublicAttachment[]>([]);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const MAX_FILES = 10;
  const MAX_SIZE_MB = 2;

  const handleFilesPicked = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (!files.length) return;
    if (publicAttachments.length + files.length > MAX_FILES) {
      toast.error(`Máximo de ${MAX_FILES} imagens.`);
      return;
    }
    const next: PublicAttachment[] = [...publicAttachments];
    for (const file of files) {
      if (!file.type.startsWith('image/')) { toast.error(`"${file.name}" não é imagem.`); continue; }
      if (file.size > MAX_SIZE_MB * 1024 * 1024) { toast.error(`"${file.name}" excede ${MAX_SIZE_MB}MB.`); continue; }
      const contentBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          const base64 = result.includes(',') ? result.split(',')[1] : result;
          resolve(base64);
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      });
      next.push({ name: file.name, contentBase64, mime: file.type, previewUrl: URL.createObjectURL(file) });
    }
    setPublicAttachments(next);
  };

  const removeAttachment = (idx: number) => {
    setPublicAttachments((prev) => prev.filter((_, i) => i !== idx));
  };

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
      body: {
        token,
        email,
        name,
        title: title.trim(),
        briefing,
        desired_deadline: deadline || null,
        attachments: publicAttachments.map((a) => ({ name: a.name, contentBase64: a.contentBase64, mime: a.mime })),
      },
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
              <div className="space-y-2">
                <Label>Imagens de apoio (opcional)</Label>
                <div className="flex flex-wrap items-start gap-2">
                  {publicAttachments.map((att, idx) => (
                    <div key={idx} className="relative h-20 w-20 overflow-hidden rounded-md border border-border bg-muted">
                      <img src={att.previewUrl} alt={att.name} className="h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeAttachment(idx)}
                        className="absolute right-0.5 top-0.5 rounded-full bg-background/90 p-0.5 shadow"
                        aria-label={`Remover ${att.name}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={publicAttachments.length >= MAX_FILES}
                    className="h-20 w-20 flex-col gap-1 text-xs"
                  >
                    <ImagePlus className="h-4 w-4" />
                    <span>Anexar</span>
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">Até {MAX_FILES} imagens, máx. {MAX_SIZE_MB}MB cada.</p>
                <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFilesPicked} />
              </div>
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