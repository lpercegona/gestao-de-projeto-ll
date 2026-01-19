import React, { useState, useEffect, useMemo } from 'react';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { PageHeader } from '@/components/layout/PageHeader';
import { NoProjectsAssigned } from '@/components/collaborator/NoProjectsAssigned';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Plus, Pencil, Trash2, ChevronRight, Loader2, Users, Settings, ChevronDown, X } from 'lucide-react';
import { Project } from '@/types';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';

interface Collaborator {
  user_id: string;
  full_name: string | null;
  email: string | null;
}

interface ProjectColumn {
  id: string;
  name: string;
  type: string;
  options: string[] | null;
  client_id: string | null;
}

export const Projects: React.FC = () => {
  const { data, loading, createProject, updateProject, deleteProject, getProjectHours, grantProjectAccess, revokeProjectAccess, refreshData, createColumn, updateColumn, deleteColumn, getClientColumns } = useData();
  const { user, isAdminOrMaster, isCollaborator } = useAuth();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [deletingProject, setDeletingProject] = useState<Project | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '', description: '', client_id: '', status: 'active', custom_fields: {} as Record<string, string>,
  });
  
  // Collaborator management
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [selectedCollaborators, setSelectedCollaborators] = useState<string[]>([]);
  const [loadingCollaborators, setLoadingCollaborators] = useState(false);

  // Custom fields management
  const [customFieldsOpen, setCustomFieldsOpen] = useState(false);
  const [isColumnDialogOpen, setIsColumnDialogOpen] = useState(false);
  const [editingColumn, setEditingColumn] = useState<ProjectColumn | null>(null);
  const [deletingColumn, setDeletingColumn] = useState<ProjectColumn | null>(null);
  const [isDeleteColumnDialogOpen, setIsDeleteColumnDialogOpen] = useState(false);
  const [columnFormData, setColumnFormData] = useState({ name: '', type: 'text' as 'text' | 'select', options: [] as string[] });
  const [newOption, setNewOption] = useState('');
  const [submittingColumn, setSubmittingColumn] = useState(false);

  // Get columns for selected client
  const clientColumns = useMemo(() => {
    if (!formData.client_id) return [];
    return getClientColumns(formData.client_id);
  }, [formData.client_id, getClientColumns, data.projectColumns]);

  // Fetch collaborators for admin
  useEffect(() => {
    const fetchCollaborators = async () => {
      if (!isAdminOrMaster) return;
      
      setLoadingCollaborators(true);
      try {
        const { data: roles, error: rolesError } = await supabase
          .from('user_roles')
          .select('user_id')
          .eq('role', 'collaborator');

        if (rolesError) throw rolesError;

        if (roles && roles.length > 0) {
          const userIds = roles.map(r => r.user_id);
          const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('user_id, full_name, email')
            .in('user_id', userIds);

          if (profilesError) throw profilesError;
          setCollaborators(profiles || []);
        }
      } catch (error) {
        console.error('Error fetching collaborators:', error);
      } finally {
        setLoadingCollaborators(false);
      }
    };

    fetchCollaborators();
  }, [isAdminOrMaster]);

  // Filter projects for collaborators
  const visibleProjects = useMemo(() => {
    if (isAdminOrMaster) return data.projects;
    
    const accessibleProjectIds = data.projectAccess
      .filter(access => access.user_id === user?.id)
      .map(access => access.project_id);
    
    return data.projects.filter(project => accessibleProjectIds.includes(project.id));
  }, [data.projects, data.projectAccess, user?.id, isAdminOrMaster]);

  const handleOpenDialog = async (project?: Project) => {
    if (project) {
      setEditingProject(project);
      setFormData({ 
        name: project.name, 
        description: project.description || '', 
        client_id: project.client_id, 
        status: project.status, 
        custom_fields: { ...project.custom_fields } 
      });
      
      const projectAccess = data.projectAccess.filter(a => a.project_id === project.id);
      setSelectedCollaborators(projectAccess.map(a => a.user_id));
    } else {
      setEditingProject(null);
      const defaultClientId = data.clients[0]?.id || '';
      const clientCols = defaultClientId ? getClientColumns(defaultClientId) : [];
      const defaultCustomFields: Record<string, string> = {};
      clientCols.forEach(col => { defaultCustomFields[col.id] = col.options?.[0] || ''; });
      setFormData({ name: '', description: '', client_id: defaultClientId, status: 'active', custom_fields: defaultCustomFields });
      setSelectedCollaborators([]);
    }
    setCustomFieldsOpen(false);
    setIsDialogOpen(true);
  };

  // Update custom_fields when client changes
  const handleClientChange = (newClientId: string) => {
    const clientCols = getClientColumns(newClientId);
    const newCustomFields: Record<string, string> = {};
    clientCols.forEach(col => { 
      // Keep existing value if column exists, otherwise set default
      newCustomFields[col.id] = formData.custom_fields[col.id] || col.options?.[0] || ''; 
    });
    setFormData({ ...formData, client_id: newClientId, custom_fields: newCustomFields });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      let projectId: string | undefined;
      
      if (editingProject) {
        await updateProject(editingProject.id, formData);
        projectId = editingProject.id;
        toast.success('Projeto atualizado!');
      } else {
        const newProject = await createProject(formData);
        projectId = newProject?.id;
        toast.success('Projeto criado!');
      }

      if (isAdminOrMaster && projectId) {
        const currentAccess = data.projectAccess.filter(a => a.project_id === projectId);
        const currentUserIds = currentAccess.map(a => a.user_id);
        
        for (const userId of selectedCollaborators) {
          if (!currentUserIds.includes(userId)) {
            await grantProjectAccess(userId, projectId, true);
          }
        }
        
        for (const userId of currentUserIds) {
          if (!selectedCollaborators.includes(userId)) {
            await revokeProjectAccess(userId, projectId);
          }
        }
        
        await refreshData();
      }
    } catch (error) {
      console.error('Error saving project:', error);
      toast.error('Erro ao salvar projeto');
    }
    
    setSubmitting(false);
    setIsDialogOpen(false);
  };

  const handleDelete = async () => {
    if (deletingProject) { 
      await deleteProject(deletingProject.id); 
      toast.success('Projeto excluído!'); 
      setIsDeleteDialogOpen(false); 
      setDeletingProject(null); 
    }
  };

  const toggleCollaborator = (userId: string) => {
    setSelectedCollaborators(prev => 
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  // Custom field column management
  const handleOpenColumnDialog = (column?: ProjectColumn) => {
    if (column) {
      setEditingColumn(column);
      setColumnFormData({ name: column.name, type: column.type as 'text' | 'select', options: column.options || [] });
    } else {
      setEditingColumn(null);
      setColumnFormData({ name: '', type: 'text', options: [] });
    }
    setNewOption('');
    setIsColumnDialogOpen(true);
  };

  const handleAddOption = () => {
    if (newOption.trim() && !columnFormData.options.includes(newOption.trim())) {
      setColumnFormData({ ...columnFormData, options: [...columnFormData.options, newOption.trim()] });
      setNewOption('');
    }
  };

  const handleRemoveOption = (option: string) => {
    setColumnFormData({ ...columnFormData, options: columnFormData.options.filter(o => o !== option) });
  };

  const handleSubmitColumn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (columnFormData.type === 'select' && columnFormData.options.length === 0) { 
      toast.error('Adicione pelo menos uma opção.'); 
      return; 
    }
    if (!formData.client_id) {
      toast.error('Selecione um cliente primeiro.');
      return;
    }
    
    setSubmittingColumn(true);
    const columnData = { 
      name: columnFormData.name, 
      type: columnFormData.type, 
      options: columnFormData.type === 'select' ? columnFormData.options : null,
      client_id: formData.client_id
    };
    
    if (editingColumn) { 
      await updateColumn(editingColumn.id, columnData); 
      toast.success('Campo atualizado!'); 
    } else { 
      const newCol = await createColumn(columnData); 
      if (newCol) {
        // Add the new column to custom_fields with default value
        setFormData(prev => ({
          ...prev,
          custom_fields: { ...prev.custom_fields, [newCol.id]: newCol.options?.[0] || '' }
        }));
      }
      toast.success('Campo criado!'); 
    }
    setSubmittingColumn(false);
    setIsColumnDialogOpen(false);
  };

  const handleDeleteColumn = async () => {
    if (deletingColumn) { 
      await deleteColumn(deletingColumn.id); 
      // Remove from custom_fields
      const newCustomFields = { ...formData.custom_fields };
      delete newCustomFields[deletingColumn.id];
      setFormData(prev => ({ ...prev, custom_fields: newCustomFields }));
      toast.success('Campo excluído!'); 
      setIsDeleteColumnDialogOpen(false); 
      setDeletingColumn(null); 
    }
  };

  const getStatusLabel = (s: string) => s === 'active' ? 'Ativo' : s === 'paused' ? 'Pausado' : 'Concluído';
  const getStatusColor = (s: string) => s === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : s === 'paused' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' : 'bg-muted text-muted-foreground';

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>;

  if (isCollaborator && !isAdminOrMaster && visibleProjects.length === 0) {
    return <NoProjectsAssigned />;
  }

  if (isAdminOrMaster && data.clients.length === 0) return (
    <div><PageHeader title="Projetos" description="Gerencie seus projetos e tarefas" />
      <Card><CardContent className="py-12 text-center"><p className="text-muted-foreground mb-4">Você precisa cadastrar um cliente antes de criar projetos.</p><Button asChild><Link to="/clients">Ir para Clientes</Link></Button></CardContent></Card></div>
  );

  return (
    <div>
      <PageHeader 
        title={isCollaborator && !isAdminOrMaster ? "Meus Projetos" : "Projetos"} 
        description={isCollaborator && !isAdminOrMaster ? "Projetos atribuídos a você" : "Gerencie seus projetos e tarefas"} 
      />
      
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-foreground">
          {visibleProjects.length} {visibleProjects.length === 1 ? 'projeto' : 'projetos'}
        </h2>
        {isAdminOrMaster && (
          <Button onClick={() => handleOpenDialog()} size="sm" className="px-3">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline ml-2">Novo Projeto</span>
          </Button>
        )}
      </div>
      {visibleProjects.length === 0 ? (
        <Card><CardContent className="py-12 text-center"><p className="text-muted-foreground mb-4">Nenhum projeto criado ainda.</p>{isAdminOrMaster && <Button onClick={() => handleOpenDialog()}><Plus className="w-4 h-4 mr-2" />Criar primeiro projeto</Button>}</CardContent></Card>
      ) : (
        <div className="space-y-4">
          {visibleProjects.map((project) => {
            const client = data.clients.find(c => c.id === project.client_id);
            const taskCount = data.tasks.filter(t => t.project_id === project.id).length;
            const hours = getProjectHours(project.id);
            const projectCollaborators = data.projectAccess.filter(a => a.project_id === project.id);
            const projectColumns = client ? getClientColumns(client.id) : [];
            
            return (
              <Card key={project.id} className="relative">
                <CardContent className="p-4 sm:p-6">
                  {isAdminOrMaster && (
                    <div className="absolute top-3 right-3 flex items-center gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(project)}><Pencil className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => { setDeletingProject(project); setIsDeleteDialogOpen(true); }}><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  )}
                  
                  <div className="flex flex-col sm:flex-row sm:items-start gap-4 sm:justify-between pr-20">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
                        <h3 className="font-semibold text-lg text-foreground">{project.name}</h3>
                        <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(project.status)}`}>{getStatusLabel(project.status)}</span>
                        {isAdminOrMaster && projectCollaborators.length > 0 && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {projectCollaborators.length}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{project.description}</p>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                        <div><span className="text-muted-foreground">Cliente: </span><span className="font-medium text-foreground">{client?.name}</span></div>
                        <div><span className="text-muted-foreground">Tarefas: </span><span className="font-medium text-foreground">{taskCount}</span></div>
                        <div><span className="text-muted-foreground">Horas: </span><span className="font-medium text-foreground">{hours}h</span></div>
                        {projectColumns.map(col => project.custom_fields[col.id] && <div key={col.id}><span className="text-muted-foreground">{col.name}: </span><span className="font-medium text-foreground">{project.custom_fields[col.id]}</span></div>)}
                      </div>
                    </div>
                    <div className="flex items-center self-end sm:self-start flex-shrink-0">
                      <Button variant="ghost" size="icon" asChild><Link to={`/projects/${project.id}`}><ChevronRight className="w-4 h-4" /></Link></Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
      
      {/* Project Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editingProject ? 'Editar Projeto' : 'Novo Projeto'}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
              <div className="space-y-2"><Label htmlFor="name">Nome do Projeto</Label><Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required disabled={submitting} /></div>
              <div className="space-y-2"><Label htmlFor="description">Descrição</Label><Textarea id="description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={3} disabled={submitting} /></div>
              <div className="space-y-2"><Label>Cliente</Label><Select value={formData.client_id} onValueChange={handleClientChange} disabled={submitting}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{data.clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><Label>Status</Label><Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })} disabled={submitting}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="active">Ativo</SelectItem><SelectItem value="paused">Pausado</SelectItem><SelectItem value="completed">Concluído</SelectItem></SelectContent></Select></div>
              
              {/* Collaborator selection - only for admins */}
              {isAdminOrMaster && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Colaboradores
                  </Label>
                  {loadingCollaborators ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Carregando...
                    </div>
                  ) : collaborators.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Nenhum colaborador cadastrado.
                    </p>
                  ) : (
                    <div className="border rounded-md p-3 space-y-2 max-h-32 overflow-y-auto">
                      {collaborators.map((collab) => (
                        <div key={collab.user_id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`collab-${collab.user_id}`}
                            checked={selectedCollaborators.includes(collab.user_id)}
                            onCheckedChange={() => toggleCollaborator(collab.user_id)}
                            disabled={submitting}
                          />
                          <label
                            htmlFor={`collab-${collab.user_id}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                          >
                            {collab.full_name || collab.email || 'Sem nome'}
                          </label>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Custom Fields Section */}
              {isAdminOrMaster && formData.client_id && (
                <Collapsible open={customFieldsOpen} onOpenChange={setCustomFieldsOpen}>
                  <CollapsibleTrigger asChild>
                    <Button variant="outline" type="button" className="w-full justify-between">
                      <span className="flex items-center gap-2">
                        <Settings className="w-4 h-4" />
                        Campos Personalizados ({clientColumns.length})
                      </span>
                      <ChevronDown className={`w-4 h-4 transition-transform ${customFieldsOpen ? 'rotate-180' : ''}`} />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-4 space-y-4">
                    {/* List existing columns for this client */}
                    {clientColumns.length > 0 && (
                      <div className="space-y-3">
                        {clientColumns.map((column) => (
                          <div key={column.id} className="space-y-2">
                            <div className="flex items-center justify-between">
                              <Label className="flex items-center gap-2">
                                {column.name}
                                <Badge variant="secondary" className="text-xs">{column.type === 'text' ? 'Texto' : 'Seleção'}</Badge>
                              </Label>
                              <div className="flex gap-1">
                                <Button variant="ghost" size="icon" type="button" className="h-6 w-6" onClick={() => handleOpenColumnDialog(column)}><Pencil className="w-3 h-3" /></Button>
                                <Button variant="ghost" size="icon" type="button" className="h-6 w-6 text-destructive hover:text-destructive" onClick={() => { setDeletingColumn(column); setIsDeleteColumnDialogOpen(true); }}><Trash2 className="w-3 h-3" /></Button>
                              </div>
                            </div>
                            {column.type === 'select' && column.options ? (
                              <Select value={formData.custom_fields[column.id] || ''} onValueChange={(v) => setFormData({ ...formData, custom_fields: { ...formData.custom_fields, [column.id]: v } })} disabled={submitting}>
                                <SelectTrigger><SelectValue placeholder={`Selecione ${column.name}`} /></SelectTrigger>
                                <SelectContent>{column.options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                              </Select>
                            ) : (
                              <Input value={formData.custom_fields[column.id] || ''} onChange={(e) => setFormData({ ...formData, custom_fields: { ...formData.custom_fields, [column.id]: e.target.value } })} disabled={submitting} />
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    
                    <Button type="button" variant="outline" size="sm" onClick={() => handleOpenColumnDialog()} className="w-full">
                      <Plus className="w-4 h-4 mr-2" />
                      Novo Campo para este Cliente
                    </Button>
                  </CollapsibleContent>
                </Collapsible>
              )}
              
              {/* Show custom fields values for non-admins or when section is collapsed */}
              {(!isAdminOrMaster || !customFieldsOpen) && clientColumns.length > 0 && (
                <div className="space-y-4">
                  {clientColumns.map((column) => (
                    <div key={column.id} className="space-y-2">
                      <Label>{column.name}</Label>
                      {column.type === 'select' && column.options ? (
                        <Select value={formData.custom_fields[column.id] || ''} onValueChange={(v) => setFormData({ ...formData, custom_fields: { ...formData.custom_fields, [column.id]: v } })} disabled={submitting}>
                          <SelectTrigger><SelectValue placeholder={`Selecione ${column.name}`} /></SelectTrigger>
                          <SelectContent>{column.options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                        </Select>
                      ) : (
                        <Input value={formData.custom_fields[column.id] || ''} onChange={(e) => setFormData({ ...formData, custom_fields: { ...formData.custom_fields, [column.id]: e.target.value } })} disabled={submitting} />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <DialogFooter><Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} disabled={submitting}>Cancelar</Button><Button type="submit" disabled={submitting}>{submitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}{editingProject ? 'Salvar' : 'Criar'}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Column Dialog */}
      <Dialog open={isColumnDialogOpen} onOpenChange={setIsColumnDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingColumn ? 'Editar Campo' : 'Novo Campo Personalizado'}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmitColumn}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nome do Campo</Label>
                <Input value={columnFormData.name} onChange={(e) => setColumnFormData({ ...columnFormData, name: e.target.value })} placeholder="Ex: Categoria" required disabled={submittingColumn} />
              </div>
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={columnFormData.type} onValueChange={(v: 'text' | 'select') => setColumnFormData({ ...columnFormData, type: v })} disabled={submittingColumn}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">Texto livre</SelectItem>
                    <SelectItem value="select">Lista de opções</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {columnFormData.type === 'select' && (
                <div className="space-y-2">
                  <Label>Opções</Label>
                  <div className="flex gap-2">
                    <Input value={newOption} onChange={(e) => setNewOption(e.target.value)} placeholder="Nova opção" onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddOption(); } }} disabled={submittingColumn} />
                    <Button type="button" onClick={handleAddOption} disabled={submittingColumn}>Adicionar</Button>
                  </div>
                  {columnFormData.options.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {columnFormData.options.map((o) => (
                        <Badge key={o} variant="secondary" className="gap-1">
                          {o}
                          <button type="button" onClick={() => handleRemoveOption(o)} className="ml-1 hover:text-destructive"><X className="w-3 h-3" /></button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsColumnDialogOpen(false)} disabled={submittingColumn}>Cancelar</Button>
              <Button type="submit" disabled={submittingColumn}>{submittingColumn && <Loader2 className="w-4 h-4 animate-spin mr-2" />}{editingColumn ? 'Salvar' : 'Criar'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Column Dialog */}
      <AlertDialog open={isDeleteColumnDialogOpen} onOpenChange={setIsDeleteColumnDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir campo?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita. O campo "{deletingColumn?.name}" será removido de todos os projetos deste cliente.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteColumn}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Project Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Excluir projeto?</AlertDialogTitle><AlertDialogDescription>Esta ação não pode ser desfeita. Isso excluirá permanentemente o projeto "{deletingProject?.name}".</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </div>
  );
};
