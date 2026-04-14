import React, { useState } from 'react';
import { useEditingLock } from '@/hooks/useEditingLock';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { FormSheet } from '@/components/ui/form-sheet';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Loader2, Share2, Copy, Check, Globe, Lock, KeyRound, RefreshCw, Trash2, AlertTriangle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';

export interface ReportShare {
  id: string;
  client_id: string;
  share_token: string;
  is_public: boolean;
  share_password: string | null;
  created_at?: string;
}

interface ReportShareDialogProps {
  clientId: string;
  clientName: string;
  userId: string;
  share: ReportShare | null;
  onShareChange: (share: ReportShare | null) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  triggerButton?: React.ReactNode;
}

export const ReportShareDialog: React.FC<ReportShareDialogProps> = ({
  clientId,
  clientName,
  userId,
  share,
  onShareChange,
  open,
  onOpenChange,
  triggerButton,
}) => {
  const [shareLoading, setShareLoading] = useState(false);
  const [sharePassword, setSharePassword] = useState('');
  const [copiedToken, setCopiedToken] = useState(false);
  const [internalOpen, setInternalOpen] = useState(false);

  const isOpen = open !== undefined ? open : internalOpen;
  const setIsOpen = onOpenChange || setInternalOpen;
  useEditingLock(isOpen);

  const handleCreateShare = async (password: string) => {
    if (!password || password.length < 4) {
      toast.error('A senha deve ter pelo menos 4 caracteres');
      return;
    }
    
    setShareLoading(true);
    try {
      // Hash the password server-side before storing
      const { data: hashedPassword, error: hashError } = await supabase.rpc('hash_report_password', {
        p_password: password
      });
      if (hashError) throw hashError;

      const { data: shareData, error } = await supabase
        .from('report_shares')
        .insert({
          client_id: clientId,
          created_by: userId,
          is_public: false,
          share_password: hashedPassword
        })
        .select()
        .single();

      if (error) throw error;
      onShareChange(shareData);
      setSharePassword('');
      toast.success('Link de compartilhamento criado!');
    } catch (error) {
      console.error('Error creating share:', error);
      toast.error('Erro ao criar link de compartilhamento');
    } finally {
      setShareLoading(false);
    }
  };

  const handleUpdatePassword = async (newPassword: string) => {
    if (!share) return;
    if (!newPassword || newPassword.length < 4) {
      toast.error('A senha deve ter pelo menos 4 caracteres');
      return;
    }
    
    setShareLoading(true);
    try {
      // Hash the password server-side before storing
      const { data: hashedPassword, error: hashError } = await supabase.rpc('hash_report_password', {
        p_password: newPassword
      });
      if (hashError) throw hashError;

      const { data: updatedShare, error } = await supabase
        .from('report_shares')
        .update({ share_password: hashedPassword })
        .eq('id', share.id)
        .select()
        .single();

      if (error) throw error;
      onShareChange(updatedShare);
      setSharePassword('');
      toast.success('Senha atualizada com sucesso!');
    } catch (error) {
      console.error('Error updating password:', error);
      toast.error('Erro ao atualizar senha');
    } finally {
      setShareLoading(false);
    }
  };

  const handleTogglePublic = async () => {
    if (!share) return;
    setShareLoading(true);
    try {
      const { data: updatedShare, error } = await supabase
        .from('report_shares')
        .update({ is_public: !share.is_public })
        .eq('id', share.id)
        .select()
        .single();

      if (error) throw error;
      onShareChange(updatedShare);
      toast.success(updatedShare.is_public ? 'Relatório agora é público' : 'Relatório agora é privado');
    } catch (error) {
      console.error('Error updating share:', error);
      toast.error('Erro ao atualizar configuração');
    } finally {
      setShareLoading(false);
    }
  };

  const handleRegenerateLink = async () => {
    if (!share) return;
    setShareLoading(true);
    try {
      const newToken = crypto.randomUUID();
      const { data: updatedShare, error } = await supabase
        .from('report_shares')
        .update({ share_token: newToken })
        .eq('id', share.id)
        .select()
        .single();

      if (error) throw error;
      onShareChange(updatedShare);
      toast.success('Link regenerado! O link anterior foi invalidado.');
    } catch (error) {
      console.error('Error regenerating link:', error);
      toast.error('Erro ao regenerar link');
    } finally {
      setShareLoading(false);
    }
  };

  const handleDeleteShare = async () => {
    if (!share) return;
    setShareLoading(true);
    try {
      const { error } = await supabase
        .from('report_shares')
        .delete()
        .eq('id', share.id);

      if (error) throw error;
      onShareChange(null);
      setIsOpen(false);
      toast.success('Compartilhamento excluído');
    } catch (error) {
      console.error('Error deleting share:', error);
      toast.error('Erro ao excluir compartilhamento');
    } finally {
      setShareLoading(false);
    }
  };

  const handleCopyLink = async () => {
    if (!share) return;
    const shareUrl = `${window.location.origin}/report/${share.share_token}`;
    await navigator.clipboard.writeText(shareUrl);
    setCopiedToken(true);
    toast.success('Link copiado!');
    setTimeout(() => setCopiedToken(false), 2000);
  };

  const handleOpenChange = (newOpen: boolean) => {
    setIsOpen(newOpen);
    if (!newOpen) setSharePassword('');
  };

  return (
    <>
      {triggerButton ? (
        <span onClick={() => setIsOpen(true)}>{triggerButton}</span>
      ) : (
        <span onClick={() => setIsOpen(true)}>
          <Button variant="ghost" size="sm" className="gap-1.5 px-2 sm:px-3">
            <Share2 className="w-4 h-4" />
            <span className="hidden sm:inline">Compartilhar</span>
          </Button>
        </span>
      )}
      <FormSheet
        open={isOpen}
        onOpenChange={handleOpenChange}
        title="Compartilhar Relatório"
        description={`Gere um link protegido por senha para compartilhar o relatório de ${clientName}.`}
      >
        <div className="space-y-4">
          {!share ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="share-password" className="flex items-center gap-2">
                  <KeyRound className="w-4 h-4" />
                  Senha de acesso (obrigatória)
                </Label>
                <Input
                  id="share-password"
                  type="password"
                  placeholder="Mínimo 4 caracteres"
                  value={sharePassword}
                  onChange={(e) => setSharePassword(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Quem acessar o link precisará informar esta senha.
                </p>
              </div>
              <Button 
                onClick={() => handleCreateShare(sharePassword)} 
                disabled={shareLoading || sharePassword.length < 4}
                className="w-full"
              >
                {shareLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Criando...
                  </>
                ) : (
                  'Criar Link de Compartilhamento'
                )}
              </Button>
            </div>
          ) : (
            <>
              {/* Public/Private toggle */}
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-3">
                  {share.is_public ? (
                    <Globe className="w-5 h-5 text-primary" />
                  ) : (
                    <Lock className="w-5 h-5 text-muted-foreground" />
                  )}
                  <div>
                    <p className="font-medium text-foreground">
                      {share.is_public ? 'Público' : 'Privado'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {share.is_public 
                        ? 'Qualquer pessoa com o link e senha pode ver' 
                        : 'Link desabilitado'}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={share.is_public}
                  onCheckedChange={handleTogglePublic}
                  disabled={shareLoading}
                />
              </div>
              
              {/* Password indicator */}
              <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                <KeyRound className="w-4 h-4 text-primary" />
                <span className="text-sm text-foreground">Protegido por senha</span>
              </div>
              
              {/* Update password */}
              <div className="space-y-2">
                <Label htmlFor="update-password">Alterar senha</Label>
                <div className="flex gap-2">
                  <Input
                    id="update-password"
                    type="password"
                    placeholder="Nova senha"
                    value={sharePassword}
                    onChange={(e) => setSharePassword(e.target.value)}
                    className="flex-1 min-w-0"
                  />
                  <Button 
                    variant="outline"
                    className="shrink-0"
                    onClick={() => handleUpdatePassword(sharePassword)}
                    disabled={shareLoading || sharePassword.length < 4}
                  >
                    {shareLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar'}
                  </Button>
                </div>
              </div>

              {/* Link section */}
              {share.is_public && (
                <div className="space-y-2">
                  <Label>Link de compartilhamento</Label>
                  <div className="flex gap-2 items-center">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex-1 min-w-0 p-3 bg-muted rounded-lg overflow-hidden cursor-help">
                          <span className="block truncate font-mono text-xs text-muted-foreground">
                            /report/{share.share_token.slice(0, 8)}...
                          </span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs break-all">
                        <p className="font-mono text-xs">{`${window.location.origin}/report/${share.share_token}`}</p>
                      </TooltipContent>
                    </Tooltip>
                    <Button 
                      variant="outline" 
                      size="icon"
                      className="shrink-0"
                      onClick={handleCopyLink}
                      title="Copiar link"
                    >
                      {copiedToken ? (
                        <Check className="w-4 h-4 text-primary" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="icon"
                          className="shrink-0"
                          title="Regenerar link"
                          disabled={shareLoading}
                        >
                          <RefreshCw className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-destructive" />
                            Regenerar Link?
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            Um novo link será gerado e o link anterior deixará de funcionar. 
                            Qualquer pessoa que tenha o link antigo não conseguirá mais acessar o relatório.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={handleRegenerateLink}>
                            Regenerar Link
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              )}

              {!share.is_public && (
                <p className="text-sm text-muted-foreground text-center">
                  Ative o modo público para compartilhar o link do relatório.
                </p>
              )}

              {/* Delete share section */}
              <div className="pt-4 border-t border-border">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button 
                      variant="ghost" 
                      className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
                      disabled={shareLoading}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Excluir compartilhamento
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle className="flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-destructive" />
                        Excluir Compartilhamento?
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        O link de compartilhamento e a senha serão removidos permanentemente. 
                        Para compartilhar novamente, você precisará criar uma nova configuração.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={handleDeleteShare}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Excluir
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </>
          )}
        </div>
      </FormSheet>
    </>
  );
};
