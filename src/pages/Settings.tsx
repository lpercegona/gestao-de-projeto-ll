import React, { useState } from 'react';
import { useData } from '@/contexts/DataContext';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, Pencil, Trash2, X, Loader2 } from 'lucide-react';
import { ProjectColumn } from '@/types';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';

export const Settings: React.FC = () => {
  const { data, loading, createColumn, updateColumn, deleteColumn } = useData();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingColumn, setEditingColumn] = useState<ProjectColumn | null>(null);
  const [deletingColumn, setDeletingColumn] = useState<ProjectColumn | null>(null);
  const [newOption, setNewOption] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({ name: '', type: 'text' as 'text' | 'select', options: [] as string[] });

  const handleOpenDialog = (column?: ProjectColumn) => {
    if (column) {
      setEditingColumn(column);
      setFormData({ name: column.name, type: column.type as 'text' | 'select', options: column.options || [] });
    } else {
      setEditingColumn(null);
      setFormData({ name: '', type: 'text', options: [] });
    }
    setIsDialogOpen(true);
  };

  const handleAddOption = () => {
    if (newOption.trim() && !formData.options.includes(newOption.trim())) {
      setFormData({ ...formData, options: [...formData.options, newOption.trim()] });
      setNewOption('');
    }
  };

  const handleRemoveOption = (option: string) => setFormData({ ...formData, options: formData.options.filter(o => o !== option) });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.type === 'select' && formData.options.length === 0) { toast.error('Adicione pelo menos uma opção.'); return; }
    setSubmitting(true);
    const columnData = { name: formData.name, type: formData.type, options: formData.type === 'select' ? formData.options : null };
    if (editingColumn) { await updateColumn(editingColumn.id, columnData); toast.success('Campo atualizado!'); }
    else { await createColumn(columnData); toast.success('Campo criado!'); }
    setSubmitting(false);
    setIsDialogOpen(false);
  };

  const handleDelete = async () => {
    if (deletingColumn) { await deleteColumn(deletingColumn.id); toast.success('Campo excluído!'); setIsDeleteDialogOpen(false); setDeletingColumn(null); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>;

  return (
    <div>
      <PageHeader title="Configurações" description="Personalize os campos de projetos" />
      <Card><CardHeader><div className="flex items-center justify-between"><div><CardTitle>Campos de Projeto</CardTitle><CardDescription>Configure campos personalizados para categorizar seus projetos</CardDescription></div><Button onClick={() => handleOpenDialog()}><Plus className="w-4 h-4 mr-2" />Novo Campo</Button></div></CardHeader>
        <CardContent>{data.projectColumns.length === 0 ? <p className="text-muted-foreground text-center py-8">Nenhum campo personalizado criado ainda.</p> : (
          <div className="space-y-4">{data.projectColumns.map((column) => (
            <div key={column.id} className="flex items-center justify-between p-4 border border-border rounded-lg">
              <div><div className="flex items-center gap-2"><h4 className="font-medium text-foreground">{column.name}</h4><Badge variant="secondary">{column.type === 'text' ? 'Texto' : 'Seleção'}</Badge></div>
                {column.options && column.options.length > 0 && <div className="flex flex-wrap gap-1 mt-2">{column.options.map((o) => <Badge key={o} variant="outline">{o}</Badge>)}</div>}
              </div>
              <div className="flex gap-1"><Button variant="ghost" size="icon" onClick={() => handleOpenDialog(column)}><Pencil className="w-4 h-4" /></Button><Button variant="ghost" size="icon" onClick={() => { setDeletingColumn(column); setIsDeleteDialogOpen(true); }}><Trash2 className="w-4 h-4" /></Button></div>
            </div>
          ))}</div>
        )}</CardContent>
      </Card>
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}><DialogContent><DialogHeader><DialogTitle>{editingColumn ? 'Editar Campo' : 'Novo Campo'}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2"><Label>Nome do Campo</Label><Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Ex: Categoria" required disabled={submitting} /></div>
            <div className="space-y-2"><Label>Tipo</Label><Select value={formData.type} onValueChange={(v: 'text' | 'select') => setFormData({ ...formData, type: v })} disabled={submitting}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="text">Texto livre</SelectItem><SelectItem value="select">Lista de opções</SelectItem></SelectContent></Select></div>
            {formData.type === 'select' && <div className="space-y-2"><Label>Opções</Label><div className="flex gap-2"><Input value={newOption} onChange={(e) => setNewOption(e.target.value)} placeholder="Nova opção" onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddOption(); } }} disabled={submitting} /><Button type="button" onClick={handleAddOption} disabled={submitting}>Adicionar</Button></div>
              {formData.options.length > 0 && <div className="flex flex-wrap gap-2 mt-2">{formData.options.map((o) => <Badge key={o} variant="secondary" className="gap-1">{o}<button type="button" onClick={() => handleRemoveOption(o)} className="ml-1 hover:text-destructive"><X className="w-3 h-3" /></button></Badge>)}</div>}
            </div>}
          </div>
          <DialogFooter><Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} disabled={submitting}>Cancelar</Button><Button type="submit" disabled={submitting}>{submitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}{editingColumn ? 'Salvar' : 'Criar'}</Button></DialogFooter>
        </form>
      </DialogContent></Dialog>
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Excluir campo?</AlertDialogTitle><AlertDialogDescription>Esta ação não pode ser desfeita. O campo "{deletingColumn?.name}" será removido de todos os projetos.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </div>
  );
};
