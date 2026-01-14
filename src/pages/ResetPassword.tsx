import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, Loader2, Lock, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

export const ResetPassword: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const [isValidSession, setIsValidSession] = useState(false);
  const [checking, setChecking] = useState(true);

  // Check if we have a valid recovery session
  useEffect(() => {
    const checkSession = async () => {
      setChecking(true);
      
      // Supabase handles the recovery token automatically via URL hash
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        setIsValidSession(true);
      } else {
        // Listen for auth state change (when user clicks recovery link)
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
          if (event === 'PASSWORD_RECOVERY' && session) {
            setIsValidSession(true);
          }
        });
        
        // Cleanup subscription after a short delay
        setTimeout(() => {
          subscription.unsubscribe();
          setChecking(false);
        }, 2000);
        return;
      }
      
      setChecking(false);
    };
    
    checkSession();
  }, []);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      toast.error('As senhas não coincidem.');
      return;
    }
    
    if (newPassword.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres.');
      return;
    }
    
    setLoading(true);
    
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });
      
      if (error) {
        toast.error('Erro ao redefinir senha: ' + error.message);
      } else {
        setIsComplete(true);
        toast.success('Senha redefinida com sucesso!');
        
        // Sign out and redirect to login after 3 seconds
        setTimeout(async () => {
          await supabase.auth.signOut();
          navigate('/login', { replace: true });
        }, 3000);
      }
    } catch (err) {
      toast.error('Erro ao redefinir senha.');
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Verificando link de recuperação...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isValidSession && !checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center">
                <Lock className="w-7 h-7 text-destructive" />
              </div>
            </div>
            <CardTitle className="text-2xl">Link Inválido</CardTitle>
            <CardDescription>
              Este link de recuperação é inválido ou expirou.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              className="w-full" 
              onClick={() => navigate('/login', { replace: true })}
            >
              Voltar para Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <CheckCircle className="w-7 h-7 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl">Senha Redefinida!</CardTitle>
            <CardDescription>
              Sua senha foi alterada com sucesso. Você será redirecionado para o login.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              className="w-full" 
              onClick={() => navigate('/login', { replace: true })}
            >
              Ir para Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
              <Clock className="w-7 h-7 text-primary-foreground" />
            </div>
          </div>
          <CardTitle className="text-2xl">Redefinir Senha</CardTitle>
          <CardDescription>Digite sua nova senha abaixo</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">Nova Senha</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                disabled={loading}
                minLength={6}
                placeholder="Mínimo 6 caracteres"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirmar Senha</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
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
                  Redefinindo...
                </>
              ) : (
                'Redefinir Senha'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};