import React, { useState, useCallback } from "react";
import { Plus, Users, FileCheck, FolderPlus, Play, Pause, Square, Expand } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormSheet } from "@/components/ui/form-sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useData } from "@/contexts/DataContext";
import { useGlobalTimer } from "@/contexts/GlobalTimerContext";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { GlobalTimerCompleteDialog } from "@/components/timer/GlobalTimerCompleteDialog";
import { ExpandedTimerModal } from "@/components/timer/ExpandedTimerModal";
import { useEditingLock } from "@/hooks/useEditingLock";

export const QuickActionsPanel: React.FC = () => {
  const [clientDialogOpen, setClientDialogOpen] = useState(false);
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [expandedTimerOpen, setExpandedTimerOpen] = useState(false);
  const { data, createClient } = useData();
  const { isAdminOrMaster } = useAuth();
  const {
    timerState,
    startGlobalTimer,
    pauseGlobalTimer,
    resumeGlobalTimer,
    completeGlobalTimer,
    hasActiveTimer,
    taskBinding,
    showCompleteDialog,
    setShowCompleteDialog,
  } = useGlobalTimer();
  const { toast } = useToast();
  const navigate = useNavigate();
  useEditingLock(clientDialogOpen);

  const formatTime = useCallback((totalSeconds: number): string => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }, []);

  const isRunning = timerState.isRunning && !timerState.isPaused;
  const isPaused = timerState.isPaused;

  // Get linked task info
  const originTaskId = taskBinding?.taskId || timerState.taskId;
  const linkedTask = originTaskId ? data.tasks.find((t) => t.id === originTaskId) : null;
  const linkedProject = linkedTask ? data.projects.find((p) => p.id === linkedTask.project_id) : null;
  const linkedClient = linkedProject ? data.clients.find((c) => c.id === linkedProject.client_id) : null;

  const handleCreateClient = async () => {
    if (!clientName || !clientEmail) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha nome e email do cliente.",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);
    try {
      const newClient = await createClient({
        name: clientName,
        email: clientEmail,
        contracted_hours: 0,
      });

      if (newClient) {
        toast({
          title: "Cliente criado",
          description: `${clientName} foi adicionado com sucesso.`,
        });
        setClientDialogOpen(false);
        setClientName("");
        setClientEmail("");
        navigate(`/clients/${newClient.id}`);
      }
    } catch (error) {
      toast({
        title: "Erro ao criar cliente",
        description: "Ocorreu um erro. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="font-medium flex items-center gap-2 text-muted-foreground">
              
              Ações Rápidas
            </CardTitle>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setExpandedTimerOpen(true)}
              title="Expandir timer"
            >
              <Expand className="h-3.5 w-3.5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 px-2 pb-[8px]">
          {/* Botões na mesma linha */}
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" className="justify-start gap-2" onClick={() => setClientDialogOpen(true)}>
              <Users className="h-4 w-4" />
              Cliente
            </Button>
            {isAdminOrMaster && (
              <Button variant="outline" className="justify-start gap-2" onClick={() => navigate("/projects?new=1")}>
                <FolderPlus className="h-4 w-4" />
                Projeto
              </Button>
            )}
            <Button variant="outline" className="justify-start gap-2" onClick={() => navigate("/proposals")}>
              <FileCheck className="h-4 w-4" />
              Proposta
            </Button>
          </div>

          {/* Timer inline (sem título separado) */}
          <div className="flex flex-col items-center gap-3 pt-4 border-t mt-[8px]">
            <div
              className={`text-3xl font-mono tabular-nums font-bold text-foreground ${isRunning ? "animate-pulse" : ""}`}
            >
              {formatTime(timerState.elapsedSeconds)}
            </div>

            {/* Show linked task info or status */}
            {hasActiveTimer && (
              <div className="w-full text-center">
                {originTaskId && linkedTask ? (
                  <div className="text-xs text-muted-foreground bg-muted/50 rounded-md px-3 py-2">
                    <p className="font-medium text-foreground truncate">{linkedTask.name}</p>
                    <p className="truncate">
                      {linkedProject?.name} • {linkedClient?.company || linkedClient?.name}
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">Registro não vinculado a nenhuma tarefa</p>
                )}
              </div>
            )}

            {!hasActiveTimer ? (
              <Button onClick={() => startGlobalTimer()} className="w-full gap-2">
                <Play className="h-4 w-4" />
                Iniciar
              </Button>
            ) : (
              <div className="flex gap-2 w-full">
                {isPaused ? (
                  <Button onClick={() => resumeGlobalTimer()} className="flex-1 gap-2">
                    <Play className="h-4 w-4" />
                    Retomar
                  </Button>
                ) : (
                  <Button onClick={() => pauseGlobalTimer()} variant="outline" className="flex-1 gap-2">
                    <Pause className="h-4 w-4" />
                    Pausar
                  </Button>
                )}
                <Button
                  onClick={() => completeGlobalTimer()}
                  variant="destructive"
                  className="flex-1 gap-2"
                  title="Concluir registro"
                >
                  <Square className="h-4 w-4" />
                  Concluir
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <FormSheet
        open={clientDialogOpen}
        onOpenChange={setClientDialogOpen}
        title="Novo Cliente"
        description="Adicione um novo cliente rapidamente. Você pode completar os dados depois."
        footer={
          <>
            <Button variant="outline" onClick={() => setClientDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateClient} disabled={isCreating}>
              {isCreating ? "Criando..." : "Criar Cliente"}
            </Button>
          </>
        }
      >
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="client-name">Nome</Label>
              <Input
                id="client-name"
                placeholder="Nome do cliente"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="client-email">Email</Label>
              <Input
                id="client-email"
                type="email"
                placeholder="email@exemplo.com"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
              />
            </div>
          </div>
      </FormSheet>

      <ExpandedTimerModal open={expandedTimerOpen} onOpenChange={setExpandedTimerOpen} />

      <GlobalTimerCompleteDialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog} />
    </>
  );
};
