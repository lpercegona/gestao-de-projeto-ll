import React, { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Loader2, Mail, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import simboloOras from "@/assets/simbolo-oras.svg";

type ClientLoginStep = "email" | "password" | "set-password";

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const {
    signIn,
    signUp,
    signInWithGoogle,
    resetPassword,
    user,
    userRole,
    loading: authLoading,
    roleLoading,
    refreshRole,
  } = useAuth();

  const [loading, setLoading] = useState(false);

  const [loginData, setLoginData] = useState({ email: "", password: "" });
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");

  const [showCreateAccount, setShowCreateAccount] = useState(false);
  const [signupData, setSignupData] = useState({ email: "", password: "", fullName: "", confirmPassword: "" });

  const [clientEmail, setClientEmail] = useState(searchParams.get("email") ?? "");
  const [clientPassword, setClientPassword] = useState("");
  const [clientNewPassword, setClientNewPassword] = useState("");
  const [clientConfirmPassword, setClientConfirmPassword] = useState("");
  const [clientLoginStep, setClientLoginStep] = useState<ClientLoginStep>(searchParams.get("email") ? "password" : "email");
  const [clientId, setClientId] = useState<string | null>(null);

  const isClientAccessFlow = searchParams.get("clientAccess") === "1";

  React.useEffect(() => {
    if (user && !roleLoading && userRole !== undefined) {
      if (userRole === null) {
        navigate("/first-access", { replace: true });
      } else {
        navigate("/", { replace: true });
      }
    }
  }, [user, userRole, roleLoading, navigate]);

  const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await signIn(loginData.email, loginData.password);

    if (error) {
      toast.error("Erro ao entrar: " + error.message);
      setLoading(false);
      return;
    }

    toast.success("Login realizado com sucesso!");
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    const normalizedEmail = signupData.email.trim().toLowerCase();

    if (!signupData.fullName.trim()) {
      toast.error("Informe seu nome completo.");
      return;
    }

    if (!emailRegex.test(normalizedEmail)) {
      toast.error("Digite um email válido.");
      return;
    }

    if (signupData.password.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres.");
      return;
    }

    if (signupData.password !== signupData.confirmPassword) {
      toast.error("As senhas não coincidem.");
      return;
    }

    setLoading(true);

    const { error } = await signUp(normalizedEmail, signupData.password, signupData.fullName.trim());

    if (error) {
      toast.error("Erro ao criar conta: " + error.message);
      setLoading(false);
      return;
    }

    toast.success("Conta criada! Verifique seu email para confirmar o acesso.");
    setShowCreateAccount(false);
    setSignupData({ email: "", password: "", fullName: "", confirmPassword: "" });
    setLoading(false);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedEmail = forgotEmail.toLowerCase().trim();

    if (!trimmedEmail || !emailRegex.test(trimmedEmail)) {
      toast.error("Digite um email válido.");
      return;
    }

    setLoading(true);

    const { error } = await resetPassword(trimmedEmail);

    if (error) {
      toast.error("Erro ao enviar email de recuperação.");
    } else {
      toast.success("Email de recuperação enviado! Verifique sua caixa de entrada.");
      setShowForgotPassword(false);
      setForgotEmail("");
    }

    setLoading(false);
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    const { error } = await signInWithGoogle();
    if (error) {
      toast.error("Erro ao conectar com Google: " + error.message);
      setLoading(false);
    }
  };

  const checkRateLimit = (key: string, maxAttempts: number, windowMs: number): boolean => {
    const storageKey = `ratelimit_${key}`;
    const data = localStorage.getItem(storageKey);
    const now = Date.now();

    if (data) {
      try {
        const { count, timestamp } = JSON.parse(data);
        if (now - timestamp < windowMs) {
          if (count >= maxAttempts) {
            return false;
          }
          localStorage.setItem(storageKey, JSON.stringify({ count: count + 1, timestamp }));
        } else {
          localStorage.setItem(storageKey, JSON.stringify({ count: 1, timestamp: now }));
        }
      } catch {
        localStorage.setItem(storageKey, JSON.stringify({ count: 1, timestamp: now }));
      }
    } else {
      localStorage.setItem(storageKey, JSON.stringify({ count: 1, timestamp: now }));
    }
    return true;
  };

  const handleClientEmailCheck = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedEmail = clientEmail.toLowerCase().trim();

    if (!trimmedEmail || trimmedEmail.length > 255 || !emailRegex.test(trimmedEmail)) {
      toast.error("Email inválido");
      return;
    }

    if (!checkRateLimit("check_client_email", 5, 300000)) {
      toast.error("Muitas tentativas. Aguarde alguns minutos.");
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.rpc("check_client_email", {
        check_email: trimmedEmail,
      });

      if (error || !data || data.length === 0) {
        toast.error("Credenciais inválidas ou conta não encontrada.");
        setLoading(false);
        return;
      }

      const clientInfo = data[0];
      setClientId(clientInfo.client_id);
      setClientLoginStep(clientInfo.has_password ? "password" : "set-password");
    } catch {
      toast.error("Erro ao processar solicitação.");
    }

    setLoading(false);
  };

  const handleClientLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await signIn(clientEmail.toLowerCase().trim(), clientPassword);

    if (error) {
      toast.error("Senha incorreta. Tente novamente.");
      setLoading(false);
      return;
    }

    toast.success("Login realizado com sucesso!");
  };

  const handleClientSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (clientNewPassword !== clientConfirmPassword) {
      toast.error("As senhas não coincidem.");
      return;
    }

    if (clientNewPassword.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres.");
      return;
    }

    setLoading(true);

    try {
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: clientEmail.toLowerCase().trim(),
        password: clientNewPassword,
        options: {
          emailRedirectTo: window.location.origin,
        },
      });

      if (signUpError) {
        if (signUpError.message.includes("already registered")) {
          toast.error("Este e-mail já possui uma conta. Use a opção de entrar com senha.");
          setClientLoginStep("password");
          setLoading(false);
          return;
        }
        toast.error("Erro ao criar conta: " + signUpError.message);
        setLoading(false);
        return;
      }

      if (signUpData.user) {
        const { error: setupError } = await supabase.rpc("setup_client_account", {
          p_user_id: signUpData.user.id,
          p_client_id: clientId,
          p_email: clientEmail.toLowerCase().trim(),
        });

        if (setupError) {
          toast.error("Erro ao configurar conta. Tente novamente.");
          setLoading(false);
          return;
        }

        await refreshRole();
        toast.success("Senha definida com sucesso! Você já está logado.");
        navigate("/", { replace: true });
      }
    } catch {
      toast.error("Erro ao definir senha.");
    }

    setLoading(false);
  };

  const resetClientLogin = () => {
    setClientEmail("");
    setClientPassword("");
    setClientNewPassword("");
    setClientConfirmPassword("");
    setClientLoginStep("email");
    setClientId(null);
  };

  if (authLoading || (user && roleLoading)) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <img src={simboloOras} alt="Carregando ORAS" className="w-12 h-12 animate-spin [animation-duration:3s]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center space-y-3">
          <img src="/logo-oras.svg" alt="ORAS" className="h-10 mx-auto" />
          <CardDescription>Gestão de Projetos e Horas</CardDescription>
        </CardHeader>
        <CardContent>
          {isClientAccessFlow ? (
            <div className="space-y-4 pt-4">
              {clientLoginStep === "email" && (
                <form onSubmit={handleClientEmailCheck} className="space-y-4">
                  <div className="text-center mb-4">
                    <p className="text-sm text-muted-foreground">
                      Primeiro acesso do cliente: informe o email cadastrado para continuar.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="client-email">Email</Label>
                    <Input
                      id="client-email"
                      type="email"
                      value={clientEmail}
                      onChange={(e) => setClientEmail(e.target.value)}
                      required
                      disabled={loading}
                      placeholder="seu@email.com"
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Verificando...
                      </>
                    ) : (
                      "Continuar"
                    )}
                  </Button>
                </form>
              )}

              {clientLoginStep === "password" && (
                <form onSubmit={handleClientLogin} className="space-y-4">
                  <div className="text-center mb-4">
                    <p className="text-sm text-muted-foreground">Digite sua senha para acessar</p>
                    <p className="text-xs text-muted-foreground mt-1">{clientEmail}</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="client-password">Senha</Label>
                    <Input
                      id="client-password"
                      type="password"
                      value={clientPassword}
                      onChange={(e) => setClientPassword(e.target.value)}
                      required
                      disabled={loading}
                      placeholder="••••••••"
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Entrando...
                      </>
                    ) : (
                      "Entrar"
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="link"
                    className="w-full text-xs text-muted-foreground hover:text-primary"
                    onClick={() => setShowForgotPassword(true)}
                    disabled={loading}
                  >
                    Esqueci minha senha
                  </Button>
                  <Button type="button" variant="ghost" className="w-full" onClick={resetClientLogin} disabled={loading}>
                    Voltar
                  </Button>
                </form>
              )}

              {clientLoginStep === "set-password" && (
                <form onSubmit={handleClientSetPassword} className="space-y-4">
                  <div className="text-center mb-4">
                    <p className="text-sm font-medium text-foreground">Bem-vindo! 🎉</p>
                    <p className="text-sm text-muted-foreground">Este é seu primeiro acesso. Defina uma senha para continuar.</p>
                    <p className="text-xs text-muted-foreground mt-1">{clientEmail}</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="client-new-password">Nova Senha</Label>
                    <Input
                      id="client-new-password"
                      type="password"
                      value={clientNewPassword}
                      onChange={(e) => setClientNewPassword(e.target.value)}
                      required
                      disabled={loading}
                      minLength={6}
                      placeholder="Mínimo 6 caracteres"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="client-confirm-password">Confirmar Senha</Label>
                    <Input
                      id="client-confirm-password"
                      type="password"
                      value={clientConfirmPassword}
                      onChange={(e) => setClientConfirmPassword(e.target.value)}
                      required
                      disabled={loading}
                      minLength={6}
                      placeholder="Repita a senha"
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Definindo senha...
                      </>
                    ) : (
                      "Definir Senha e Entrar"
                    )}
                  </Button>
                  <Button type="button" variant="ghost" className="w-full" onClick={resetClientLogin} disabled={loading}>
                    Voltar
                  </Button>
                </form>
              )}
            </div>
          ) : showForgotPassword ? (
            <form onSubmit={handleForgotPassword} className="space-y-4 pt-4">
              <div className="text-center mb-4">
                <p className="text-sm text-muted-foreground">Digite seu email para receber um link de recuperação de senha.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="forgot-email">Email</Label>
                <Input
                  id="forgot-email"
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  required
                  disabled={loading}
                  placeholder="seu@email.com"
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4 mr-2" />
                    Enviar Link de Recuperação
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => {
                  setShowForgotPassword(false);
                  setForgotEmail("");
                }}
                disabled={loading}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar para Login
              </Button>
            </form>
          ) : showCreateAccount ? (
            <form onSubmit={handleSignup} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="signup-name">Nome completo</Label>
                <Input
                  id="signup-name"
                  type="text"
                  value={signupData.fullName}
                  onChange={(e) => setSignupData({ ...signupData, fullName: e.target.value })}
                  required
                  disabled={loading}
                  placeholder="Seu nome"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-email">Email</Label>
                <Input
                  id="signup-email"
                  type="email"
                  value={signupData.email}
                  onChange={(e) => setSignupData({ ...signupData, email: e.target.value })}
                  required
                  disabled={loading}
                  placeholder="seu@email.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-password">Senha</Label>
                <Input
                  id="signup-password"
                  type="password"
                  value={signupData.password}
                  onChange={(e) => setSignupData({ ...signupData, password: e.target.value })}
                  required
                  minLength={6}
                  disabled={loading}
                  placeholder="Mínimo 6 caracteres"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-confirm-password">Confirmar senha</Label>
                <Input
                  id="signup-confirm-password"
                  type="password"
                  value={signupData.confirmPassword}
                  onChange={(e) => setSignupData({ ...signupData, confirmPassword: e.target.value })}
                  required
                  minLength={6}
                  disabled={loading}
                  placeholder="Repita a senha"
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Criando conta...
                  </>
                ) : (
                  "Criar conta"
                )}
              </Button>

              <Button type="button" variant="ghost" className="w-full" onClick={() => setShowCreateAccount(false)}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar para Login
              </Button>
            </form>
          ) : (
            <>
              <form onSubmit={handleLogin} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <Input
                    id="login-email"
                    type="email"
                    value={loginData.email}
                    onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                    required
                    disabled={loading}
                    placeholder="seu@email.com"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="login-password">Senha</Label>
                    <Button
                      type="button"
                      variant="link"
                      className="px-0 h-auto text-xs text-muted-foreground hover:text-primary"
                      onClick={() => setShowForgotPassword(true)}
                    >
                      Esqueci minha senha
                    </Button>
                  </div>
                  <Input
                    id="login-password"
                    type="password"
                    value={loginData.password}
                    onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                    required
                    disabled={loading}
                    placeholder="••••••••"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Entrando...
                    </>
                  ) : (
                    "Entrar"
                  )}
                </Button>
              </form>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <Separator className="w-full" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">ou</span>
                </div>
              </div>

              <Button type="button" variant="outline" className="w-full" onClick={handleGoogleLogin} disabled={loading}>
                <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Continuar com Google
              </Button>

              <Button type="button" variant="ghost" className="w-full mt-2" onClick={() => setShowCreateAccount(true)} disabled={loading}>
                Criar conta
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
