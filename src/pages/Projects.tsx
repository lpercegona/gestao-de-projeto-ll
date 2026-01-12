import React, { useState } from 'react';
import { useData } from '@/contexts/DataContext';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, Pencil, Trash2, ChevronRight } from 'lucide-react';
import { Project } from '@/types';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

export const Projects: React.FC = () => {
  const { data, createProject, updateProject, deleteProject, getProjectHours } = useData();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [deletingProject, setDeletingProject] = useState<Project | null>(null);
  const [formData, setFormData] = useState<{
    name: string;
    description: string;
    clientId: string;
    status: 'active' | 'paused' | 'completed';
    customFields: Record<string, string>;
  }>({
    name: '',
    description: '',
    clientId: '',
    status: 'active',
    customFields: {},
  });

  const handleOpenDialog = (project?: Project) => {
    if (project) {
      setEditingProject(project);
      setFormData({
        name: project.name,
        description: project.description,
        clientId: project.clientId,
        status: project.status,
        customFields: { ...project.customFields },
      });
    } else {
      setEditingProject(null);
      const defaultCustomFields: Record<string, string> = {};
      data.projectColumns.forEach(col => {
        defaultCustomFields[col.id] = col.options?.[0] || '';
      });
      setFormData({
        name: '',
        description: '',
        clientId: data.clients[0]?.id || '',
        status: 'active',
        customFields: defaultCustomFields,
      });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingProject) {
      updateProject(editingProject.id, formData);
      toast.success('Projeto atualizado com sucesso!');
    } else {
      createProject(formData);
      toast.success('Projeto criado com sucesso!');
    }
    setIsDialogOpen(false);
  };

  const handleDelete = () => {
    if (deletingProject) {
      deleteProject(deletingProject.id);
      toast.success('Projeto excluído com sucesso!');
      setIsDeleteDialogOpen(false);
      setDeletingProject(null);
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return 'Ativo';
      case 'paused': return 'Pausado';
      case 'completed': return 'Concluído';
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'paused': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-muted text-muted-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  if (data.clients.length === 0) {
    return (
      <div>
        <PageHeader
          title="Projetos"
          description="Gerencie seus projetos e tarefas"
        />
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">
              Você precisa cadastrar um cliente antes de criar projetos.
            </p>
            <Button asChild>
              <Link to="/clients">Ir para Clientes</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Projetos"
        description="Gerencie seus projetos e tarefas"
        actions={
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="w-4 h-4 mr-2" />
            Novo Projeto
          </Button>
        }
      />

      {data.projects.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">Nenhum projeto criado ainda.</p>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="w-4 h-4 mr-2" />
              Criar primeiro projeto
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {data.projects.map((project) => {
            const client = data.clients.find(c => c.id === project.clientId);
            const taskCount = data.tasks.filter(t => t.projectId === project.id).length;
            const hours = getProjectHours(project.id);
            
            return (
              <Card key={project.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-lg text-foreground">{project.name}</h3>
                        <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(project.status)}`}>
                          {getStatusLabel(project.status)}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">{project.description}</p>
                      
                      <div className="flex flex-wrap gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Cliente: </span>
                          <span className="font-medium text-foreground">{client?.name}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Tarefas: </span>
                          <span className="font-medium text-foreground">{taskCount}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Horas: </span>
                          <span className="font-medium text-foreground">{hours}h</span>
                        </div>
                        {data.projectColumns.map(col => (
                          project.customFields[col.id] && (
                            <div key={col.id}>
                              <span className="text-muted-foreground">{col.name}: </span>
                              <span className="font-medium text-foreground">{project.customFields[col.id]}</span>
                            </div>
                          )
                        ))}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenDialog(project)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setDeletingProject(project);
                          setIsDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" asChild>
                        <Link to={`/projects/${project.id}`}>
                          <ChevronRight className="w-4 h-4" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingProject ? 'Editar Projeto' : 'Novo Projeto'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
              <div className="space-y-2">
                <Label htmlFor="name">Nome do Projeto</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="client">Cliente</Label>
                <Select
                  value={formData.clientId}
                  onValueChange={(value) => setFormData({ ...formData, clientId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {data.clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value: 'active' | 'paused' | 'completed') => 
                    setFormData({ ...formData, status: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="paused">Pausado</SelectItem>
                    <SelectItem value="completed">Concluído</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {data.projectColumns.map((column) => (
                <div key={column.id} className="space-y-2">
                  <Label>{column.name}</Label>
                  {column.type === 'select' && column.options ? (
                    <Select
                      value={formData.customFields[column.id] || ''}
                      onValueChange={(value) => 
                        setFormData({
                          ...formData,
                          customFields: { ...formData.customFields, [column.id]: value }
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={`Selecione ${column.name}`} />
                      </SelectTrigger>
                      <SelectContent>
                        {column.options.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      value={formData.customFields[column.id] || ''}
                      onChange={(e) => 
                        setFormData({
                          ...formData,
                          customFields: { ...formData.customFields, [column.id]: e.target.value }
                        })
                      }
                    />
                  )}
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">
                {editingProject ? 'Salvar' : 'Criar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir projeto?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso excluirá permanentemente o projeto
              "{deletingProject?.name}" e todas as suas tarefas e registros de horas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
