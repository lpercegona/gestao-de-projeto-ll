import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useEditingLock } from '@/hooks/useEditingLock';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { FormSheet } from '@/components/ui/form-sheet';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { Plus, MoreVertical, Eye, EyeOff, Pencil, Trash2, ImagePlus, X } from 'lucide-react';
import { toast } from 'sonner';

interface PortfolioProject {
  id: string;
  title: string;
  description: string;
  cover_url: string | null;
  service_id: string | null;
  service_name?: string;
  is_visible: boolean;
  created_at: string;
}

interface PortfolioImage {
  id: string;
  image_url: string;
  sort_order: number;
}

interface ServiceOption {
  id: string;
  service: string;
}

export const PortfolioTab: React.FC = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState<PortfolioProject[]>([]);
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  useEditingLock(dialogOpen);

  const [form, setForm] = useState({
    title: '',
    description: '',
    cover_url: '',
    service_id: '',
  });
  const [images, setImages] = useState<PortfolioImage[]>([]);
  const [newImageFiles, setNewImageFiles] = useState<File[]>([]);

  useEffect(() => {
    if (!user) return;
    fetchProjects();
    fetchServices();
  }, [user]);

  const fetchProjects = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('portfolio_projects')
      .select('*, service_catalog(service)')
      .order('created_at', { ascending: false });

    if (error) { console.error(error); setLoading(false); return; }

    setProjects((data || []).map((p: any) => ({
      id: p.id,
      title: p.title,
      description: p.description || '',
      cover_url: p.cover_url,
      service_id: p.service_id,
      service_name: p.service_catalog?.service || null,
      is_visible: p.is_visible,
      created_at: p.created_at,
    })));
    setLoading(false);
  };

  const fetchServices = async () => {
    const { data } = await supabase
      .from('service_catalog')
      .select('id, service')
      .eq('is_active', true)
      .order('service');
    setServices(data || []);
  };

  const fetchImages = async (projectId: string) => {
    const { data } = await supabase
      .from('portfolio_images')
      .select('*')
      .eq('project_id', projectId)
      .order('sort_order');
    setImages(data || []);
  };

  const uploadFile = async (file: File, path: string) => {
    const { error } = await supabase.storage.from('portfolio').upload(path, file);
    if (error) throw error;
    const { data } = supabase.storage.from('portfolio').getPublicUrl(path);
    return data.publicUrl;
  };

  const handleOpenCreate = () => {
    setEditingId(null);
    setForm({ title: '', description: '', cover_url: '', service_id: '' });
    setImages([]);
    setNewImageFiles([]);
    setDialogOpen(true);
  };

  const handleOpenEdit = async (project: PortfolioProject) => {
    setEditingId(project.id);
    setForm({
      title: project.title,
      description: project.description,
      cover_url: project.cover_url || '',
      service_id: project.service_id || '',
    });
    await fetchImages(project.id);
    setNewImageFiles([]);
    setDialogOpen(true);
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    try {
      const ext = file.name.split('.').pop();
      const path = `${user.id}/covers/${crypto.randomUUID()}.${ext}`;
      const url = await uploadFile(file, path);
      setForm(prev => ({ ...prev, cover_url: url }));
    } catch {
      toast.error('Erro ao fazer upload da capa');
    }
  };

  const handleAddImages = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setNewImageFiles(prev => [...prev, ...files]);
  };

  const handleRemoveExistingImage = async (imageId: string) => {
    await supabase.from('portfolio_images').delete().eq('id', imageId);
    setImages(prev => prev.filter(i => i.id !== imageId));
  };

  const handleRemoveNewImage = (index: number) => {
    setNewImageFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!form.title.trim() || !user) return;
    setSaving(true);

    try {
      let projectId = editingId;

      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        cover_url: form.cover_url || null,
        service_id: form.service_id || null,
        updated_at: new Date().toISOString(),
      };

      if (editingId) {
        const { error } = await supabase
          .from('portfolio_projects')
          .update(payload)
          .eq('id', editingId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('portfolio_projects')
          .insert({ ...payload, owner_id: user.id })
          .select()
          .single();
        if (error) throw error;
        projectId = data.id;
      }

      // Upload new images
      if (newImageFiles.length > 0 && projectId) {
        const startOrder = images.length;
        const uploadPromises = newImageFiles.map(async (file, i) => {
          const ext = file.name.split('.').pop();
          const path = `${user.id}/images/${crypto.randomUUID()}.${ext}`;
          const url = await uploadFile(file, path);
          return { project_id: projectId!, image_url: url, sort_order: startOrder + i };
        });
        const uploaded = await Promise.all(uploadPromises);
        const { error } = await supabase.from('portfolio_images').insert(uploaded);
        if (error) throw error;
      }

      toast.success(editingId ? 'Projeto atualizado' : 'Projeto criado');
      setDialogOpen(false);
      fetchProjects();
    } catch (err) {
      console.error(err);
      toast.error('Erro ao salvar projeto');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleVisibility = async (project: PortfolioProject) => {
    const { error } = await supabase
      .from('portfolio_projects')
      .update({ is_visible: !project.is_visible })
      .eq('id', project.id);
    if (error) { toast.error('Erro ao alterar visibilidade'); return; }
    setProjects(prev => prev.map(p => p.id === project.id ? { ...p, is_visible: !p.is_visible } : p));
    toast.success(project.is_visible ? 'Projeto ocultado' : 'Projeto visível');
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from('portfolio_projects').delete().eq('id', deleteId);
    if (error) { toast.error('Erro ao excluir'); return; }
    setProjects(prev => prev.filter(p => p.id !== deleteId));
    setDeleteId(null);
    toast.success('Projeto excluído');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Portfólio</h2>
        <Button onClick={handleOpenCreate}>
          <Plus className="mr-2 h-4 w-4" /> Novo Projeto
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : projects.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum projeto no portfólio ainda.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map(project => (
            <Card key={project.id} className="overflow-hidden">
              <div className="relative">
                {project.cover_url ? (
                  <img src={project.cover_url} alt={project.title} className="aspect-[4/3] w-full object-cover" />
                ) : (
                  <div className="flex aspect-[4/3] w-full items-center justify-center bg-muted text-xs text-muted-foreground">
                    Sem capa
                  </div>
                )}
                {!project.is_visible && (
                  <Badge variant="secondary" className="absolute top-2 left-2">
                    <EyeOff className="h-3 w-3 mr-1" /> Oculto
                  </Badge>
                )}
              </div>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1 min-w-0">
                    <h3 className="font-semibold text-sm truncate">{project.title}</h3>
                    {project.service_name && (
                      <p className="text-xs text-muted-foreground truncate">{project.service_name}</p>
                    )}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleOpenEdit(project)}>
                        <Pencil className="h-4 w-4 mr-2" /> Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleToggleVisibility(project)}>
                        {project.is_visible ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                        {project.is_visible ? 'Ocultar' : 'Apresentar'}
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setDeleteId(project.id)}>
                        <Trash2 className="h-4 w-4 mr-2" /> Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar Projeto' : 'Novo Projeto'}</DialogTitle>
            <DialogDescription>Preencha as informações do projeto do portfólio.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            <div className="space-y-2">
              <Label>Título *</Label>
              <Input value={form.title} onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))} placeholder="Nome do projeto" />
            </div>

            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea value={form.description} onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))} placeholder="Descreva o projeto realizado" rows={4} />
            </div>

            <div className="space-y-2">
              <Label>Serviço vinculado (opcional)</Label>
              <Select value={form.service_id || 'none'} onValueChange={v => setForm(prev => ({ ...prev, service_id: v === 'none' ? '' : v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione um serviço" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {services.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.service}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Imagem de capa</Label>
              <Input type="file" accept="image/*" onChange={handleCoverUpload} />
              {form.cover_url && (
                <div className="relative inline-block">
                  <img src={form.cover_url} alt="Capa" className="h-24 rounded-md border object-cover" />
                  <Button variant="destructive" size="icon" className="absolute -top-2 -right-2 h-6 w-6" onClick={() => setForm(prev => ({ ...prev, cover_url: '' }))}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Imagens do projeto</Label>
              <div className="space-y-2">
                {images.map(img => (
                  <div key={img.id} className="flex items-center gap-2">
                    <img src={img.image_url} alt="" className="h-16 w-24 rounded border object-cover" />
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleRemoveExistingImage(img.id)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                {newImageFiles.map((file, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <img src={URL.createObjectURL(file)} alt="" className="h-16 w-24 rounded border object-cover" />
                    <span className="text-xs text-muted-foreground truncate flex-1">{file.name}</span>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleRemoveNewImage(i)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
              <Button variant="outline" size="sm" className="mt-1" onClick={() => document.getElementById('portfolio-images-input')?.click()}>
                <ImagePlus className="h-4 w-4 mr-2" /> Adicionar imagens
              </Button>
              <input id="portfolio-images-input" type="file" accept="image/*" multiple className="hidden" onChange={handleAddImages} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={!form.title.trim() || saving}>
              {saving ? 'Salvando...' : editingId ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={open => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir projeto</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza? Esta ação não pode ser desfeita.</AlertDialogDescription>
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
