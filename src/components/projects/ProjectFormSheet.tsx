import React, { useEffect, useMemo, useState } from 'react';
import { FormSheet } from '@/components/ui/form-sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { WysiwygEditor } from '@/components/ui/wysiwyg-editor';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Loader2, Users, Settings, ChevronDown, Plus, Pencil, Trash2 } from 'lucide-react';
import { useEditingLock } from '@/hooks/useEditingLock';
import { useData } from '@/contexts/DataContext';
import { RequestAttachmentsUploader, RequestAttachment } from '@/components/client/RequestAttachmentsUploader';
import { RequestedTasksBlock, DraftTask } from '@/components/projects/RequestedTasksBlock';
import type { Project } from '@/types';

// Accept the loose shape from DataContext (type is `string`).
type LoosePColumn = {
  id: string;
  name: string;
  type: string;
  options?: string[] | null;
  client_id?: string | null;
  show_in_report?: boolean;
};

export interface ProjectFormPayload {
  name: string;
  description: string;
  client_id: string;
  status: string;
  due_date: string;
  custom_fields: Record<string, string>;
  attachments: RequestAttachment[];
  collaboratorIds: string[];
  tasks: DraftTask[];
}

export interface CollaboratorOption {
  user_id: string;
  full_name: string | null;
  email: string | null;
}

interface ProjectFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit';
  editingProject?: Project | null;
  /** When set, hides the client selector and locks the form to this client. */
  lockedClientId?: string;
  /** Initial collaborator user_ids when editing. */
  initialCollaboratorIds?: string[];

  /** When true (admin/master), shows collaborator picker. */
  showCollaborators?: boolean;
  collaborators?: CollaboratorOption[];
  loadingCollaborators?: boolean;

  /** When true, shows column management actions (admin only). */
  showColumnManagement?: boolean;
  onCreateColumn?: () => void;
  onEditColumn?: (column: LoosePColumn) => void;
  onDeleteColumn?: (column: LoosePColumn) => void;

  /** Called with the assembled payload on submit. */
  onSubmit: (payload: ProjectFormPayload) => Promise<void> | void;
  submitting?: boolean;
}

export const ProjectFormSheet: React.FC<ProjectFormSheetProps> = ({
  open,
  onOpenChange,
  mode,
  editingProject,
  lockedClientId,
  initialCollaboratorIds = [],
  showCollaborators = false,
  collaborators = [],
  loadingCollaborators = false,
  showColumnManagement = false,
  onCreateColumn,
  onEditColumn,
  onDeleteColumn,
  onSubmit,
  submitting = false,
}) => {
  const { data, getClientColumns } = useData();
  useEditingLock(open);

  const defaultClientId = lockedClientId || data.clients[0]?.id || '';

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [clientId, setClientId] = useState<string>(defaultClientId);
  const [status, setStatus] = useState('active');
  const [dueDate, setDueDate] = useState('');
  const [customFields, setCustomFields] = useState<Record<string, string>>({});
  const [attachments, setAttachments] = useState<RequestAttachment[]>([]);
  const [collaboratorIds, setCollaboratorIds] = useState<string[]>(initialCollaboratorIds);
  const [tasks, setTasks] = useState<DraftTask[]>([]);
  const [customFieldsOpen, setCustomFieldsOpen] = useState(false);

  // Reset state whenever the sheet (re)opens.
  useEffect(() => {
    if (!open) return;
    if (mode === 'edit' && editingProject) {
      setName(editingProject.name);
      setDescription(editingProject.description || '');
      setClientId(editingProject.client_id);
      setStatus(editingProject.status);
      setDueDate(editingProject.due_date || '');
      setCustomFields({ ...(editingProject.custom_fields || {}) });
      setAttachments(
        Array.isArray((editingProject as unknown as { attachments?: RequestAttachment[] }).attachments)
          ? [...((editingProject as unknown as { attachments: RequestAttachment[] }).attachments)]
          : [],
      );
      setCollaboratorIds(initialCollaboratorIds);
      setTasks([]);
    } else {
      const cid = lockedClientId || data.clients[0]?.id || '';
      const cols = cid ? getClientColumns(cid) : [];
      const defaults: Record<string, string> = {};
      cols.forEach((c) => { defaults[c.id] = c.options?.[0] || ''; });
      setName('');
      setDescription('');
      setClientId(cid);
      setStatus('active');
      setDueDate('');
      setCustomFields(defaults);
      setAttachments([]);
      setCollaboratorIds([]);
      setTasks([]);
    }
    setCustomFieldsOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode, editingProject?.id, lockedClientId]);

  const clientColumns = useMemo(() => {
    if (!clientId) return [];
    return getClientColumns(clientId);
  }, [clientId, getClientColumns, data.projectColumns]);

  const handleClientChange = (newClientId: string) => {
    const cols = getClientColumns(newClientId);
    const next: Record<string, string> = {};
    cols.forEach((c) => { next[c.id] = customFields[c.id] || c.options?.[0] || ''; });
    setClientId(newClientId);
    setCustomFields(next);
  };

  const toggleCollaborator = (userId: string) => {
    setCollaboratorIds((prev) => prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    await onSubmit({
      name,
      description,
      client_id: clientId,
      status,
      due_date: dueDate,
      custom_fields: customFields,
      attachments,
      collaboratorIds,
      tasks,
    });
  };

  const isCreate = mode === 'create';

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title={isCreate ? 'Novo Projeto' : 'Editar Projeto'}
      footer={
        <>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Cancelar</Button>
          <Button onClick={() => handleSubmit()} disabled={submitting || !name.trim() || !clientId}>
            {submitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            {isCreate ? 'Criar' : 'Salvar'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit}>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="project-name">Nome do Projeto</Label>
            <Input
              id="project-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={submitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="project-description">Descrição</Label>
            <WysiwygEditor
              value={description}
              onChange={setDescription}
              disabled={submitting}
              minHeight="80px"
            />
          </div>

          <div className={lockedClientId ? 'space-y-2' : 'grid grid-cols-2 gap-4'}>
            {!lockedClientId && (
              <div className="space-y-2">
                <Label>Cliente</Label>
                <Select value={clientId} onValueChange={handleClientChange} disabled={submitting}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {data.clients.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.company || c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus} disabled={submitting}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="paused">Pausado</SelectItem>
                  <SelectItem value="completed">Concluído</SelectItem>
                  <SelectItem value="archived">Arquivo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="project-due-date">Prazo (opcional)</Label>
            <Input
              id="project-due-date"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              disabled={submitting}
            />
          </div>

          {clientId && (
            <RequestAttachmentsUploader
              clientId={clientId}
              folderId={editingProject ? `project-${editingProject.id}` : undefined}
              attachments={attachments}
              onChange={setAttachments}
              disabled={submitting}
            />
          )}

          {/* Tarefas vinculadas — disponível em criação para todos os papéis */}
          {isCreate && (
            <RequestedTasksBlock
              tasks={tasks}
              onChange={setTasks}
              disabled={submitting}
            />
          )}

          {showCollaborators && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2"><Users className="w-4 h-4" />Colaboradores</Label>
              {loadingCollaborators ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />Carregando...
                </div>
              ) : collaborators.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum colaborador cadastrado.</p>
              ) : (
                <div className="border rounded-md p-3 space-y-2 max-h-32 overflow-y-auto">
                  {collaborators.map((collab) => (
                    <div key={collab.user_id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`collab-${collab.user_id}`}
                        checked={collaboratorIds.includes(collab.user_id)}
                        onCheckedChange={() => toggleCollaborator(collab.user_id)}
                        disabled={submitting}
                      />
                      <label htmlFor={`collab-${collab.user_id}`} className="text-sm font-medium leading-none cursor-pointer">
                        {collab.full_name || collab.email || 'Sem nome'}
                      </label>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {showColumnManagement && clientId && (
            <Collapsible open={customFieldsOpen} onOpenChange={setCustomFieldsOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" type="button" className="w-full justify-between">
                  <span className="flex items-center gap-2">
                    <Settings className="w-4 h-4" />Campos Personalizados ({clientColumns.length})
                  </span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${customFieldsOpen ? 'rotate-180' : ''}`} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-4 space-y-4">
                {clientColumns.length > 0 && (
                  <div className="space-y-3">
                    {clientColumns.map((column) => (
                      <div key={column.id} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="flex items-center gap-2">
                            {column.name}
                            <Badge variant="secondary" className="text-xs">
                              {column.type === 'text' ? 'Texto' : 'Seleção'}
                            </Badge>
                          </Label>
                          <div className="flex gap-1">
                            {onEditColumn && (
                              <Button variant="ghost" size="icon" type="button" className="h-6 w-6" onClick={() => onEditColumn(column)}>
                                <Pencil className="w-3 h-3" />
                              </Button>
                            )}
                            {onDeleteColumn && (
                              <Button variant="ghost" size="icon" type="button" className="h-6 w-6 text-destructive hover:text-destructive" onClick={() => onDeleteColumn(column)}>
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                        {column.type === 'select' && column.options ? (
                          <Select
                            value={customFields[column.id] || ''}
                            onValueChange={(v) => setCustomFields((prev) => ({ ...prev, [column.id]: v }))}
                            disabled={submitting}
                          >
                            <SelectTrigger><SelectValue placeholder={`Selecione ${column.name}`} /></SelectTrigger>
                            <SelectContent>
                              {column.options.map((o) => (<SelectItem key={o} value={o}>{o}</SelectItem>))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input
                            value={customFields[column.id] || ''}
                            onChange={(e) => setCustomFields((prev) => ({ ...prev, [column.id]: e.target.value }))}
                            disabled={submitting}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {onCreateColumn && (
                  <Button type="button" variant="outline" size="sm" onClick={onCreateColumn} className="w-full">
                    <Plus className="w-4 h-4 mr-2" />Novo Campo para este Cliente
                  </Button>
                )}
              </CollapsibleContent>
            </Collapsible>
          )}

          {(!showColumnManagement || !customFieldsOpen) && clientColumns.length > 0 && (
            <div className="space-y-4">
              {clientColumns.map((column) => (
                <div key={column.id} className="space-y-2">
                  <Label>{column.name}</Label>
                  {column.type === 'select' && column.options ? (
                    <Select
                      value={customFields[column.id] || ''}
                      onValueChange={(v) => setCustomFields((prev) => ({ ...prev, [column.id]: v }))}
                      disabled={submitting}
                    >
                      <SelectTrigger><SelectValue placeholder={`Selecione ${column.name}`} /></SelectTrigger>
                      <SelectContent>
                        {column.options.map((o) => (<SelectItem key={o} value={o}>{o}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      value={customFields[column.id] || ''}
                      onChange={(e) => setCustomFields((prev) => ({ ...prev, [column.id]: e.target.value }))}
                      disabled={submitting}
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </form>
    </FormSheet>
  );
};