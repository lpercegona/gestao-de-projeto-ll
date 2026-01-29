import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Pencil, Trash2, Loader2, X, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

interface ProjectColumn {
  id: string;
  name: string;
  type: string;
  options: string[] | null;
  client_id: string | null;
  show_in_report: boolean;
}

interface ClientCustomFieldsSectionProps {
  clientId: string;
}

export const ClientCustomFieldsSection: React.FC<ClientCustomFieldsSectionProps> = ({
  clientId,
}) => {
  const [columns, setColumns] = useState<ProjectColumn[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingColumn, setEditingColumn] = useState<ProjectColumn | null>(null);
  const [deletingColumn, setDeletingColumn] = useState<ProjectColumn | null>(null);
  const [submitting, setSubmitting] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    type: 'text' as 'text' | 'select',
    options: [] as string[],
    show_in_report: false,
  });
  const [newOption, setNewOption] = useState('');

  // Fetch columns for this client
  useEffect(() => {
    const fetchColumns = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('project_columns')
          .select('*')
          .eq('client_id', clientId)
          .order('created_at', { ascending: true });

        if (error) throw error;
        setColumns((data || []) as ProjectColumn[]);
      } catch (error) {
        console.error('Error fetching columns:', error);
        toast.error('Erro ao carregar campos personalizados');
      } finally {
        setLoading(false);
      }
    };

    fetchColumns();
  }, [clientId]);

  const handleOpenDialog = (column?: ProjectColumn) => {
    if (column) {
      setEditingColumn(column);
      setFormData({
        name: column.name,
        type: column.type as 'text' | 'select',
        options: column.options || [],
        show_in_report: column.show_in_report,
      });
    } else {
      setEditingColumn(null);
      setFormData({
        name: '',
        type: 'text',
        options: [],
        show_in_report: false,
      });
    }
    setNewOption('');
    setIsDialogOpen(true);
  };

  const handleAddOption = () => {
    if (newOption.trim() && !formData.options.includes(newOption.trim())) {
      setFormData({ ...formData, options: [...formData.options, newOption.trim()] });
      setNewOption('');
    }
  };

  const handleRemoveOption = (option: string) => {
    setFormData({ ...formData, options: formData.options.filter(o => o !== option) });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.type === 'select' && formData.options.length === 0) {
      toast.error('Adicione pelo menos uma opção.');
      return;
    }

    setSubmitting(true);
    try {
      const columnData = {
        name: formData.name,
        type: formData.type,
        options: formData.type === 'select' ? formData.options : null,
        client_id: clientId,
        show_in_report: formData.show_in_report,
      };

      if (editingColumn) {
        const { data, error } = await supabase
          .from('project_columns')
          .update(columnData)
          .eq('id', editingColumn.id)
          .select()
          .single();

        if (error) throw error;
        setColumns(prev => prev.map(c => c.id === editingColumn.id ? data as ProjectColumn : c));
        toast.success('Campo atualizado!');
      } else {
        const { data, error } = await supabase
          .from('project_columns')
          .insert([columnData])
          .select()
          .single();

        if (error) throw error;
        setColumns(prev => [...prev, data as ProjectColumn]);
        toast.success('Campo criado!');
      }

      setIsDialogOpen(false);
    } catch (error: any) {
      console.error('Error saving column:', error);
      toast.error(error?.message || 'Erro ao salvar campo');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingColumn) return;

    try {
      const { error } = await supabase
        .from('project_columns')
        .delete()
        .eq('id', deletingColumn.id);

      if (error) throw error;
      setColumns(prev => prev.filter(c => c.id !== deletingColumn.id));
      toast.success('Campo excluído!');
      setIsDeleteDialogOpen(false);
      setDeletingColumn(null);
    } catch (error: any) {
      console.error('Error deleting column:', error);
      toast.error(error?.message || 'Erro ao excluir campo');
    }
  };

  const handleToggleShowInReport = async (column: ProjectColumn) => {
    try {
      const { data, error } = await supabase
        .from('project_columns')
        .update({ show_in_report: !column.show_in_report })
        .eq('id', column.id)
        .select()
        .single();

      if (error) throw error;
      setColumns(prev => prev.map(c => c.id === column.id ? data as ProjectColumn : c));
      toast.success(data.show_in_report ? 'Campo visível no relatório' : 'Campo oculto do relatório');
    } catch (error: any) {
      console.error('Error updating column:', error);
      toast.error('Erro ao atualizar visibilidade');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-foreground">Campos Personalizados</h3>
          <p className="text-xs text-muted-foreground">
            Configure campos adicionais para os projetos deste cliente.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={() => handleOpenDialog()}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Campo
        </Button>
      </div>

      {columns.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-sm text-muted-foreground">
              Nenhum campo personalizado configurado.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {columns.map((column) => (
            <Card key={column.id}>
              <CardContent className="py-3 px-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm text-foreground truncate">
                        {column.name}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {column.type === 'select' ? 'Seleção' : 'Texto'}
                      </Badge>
                    </div>
                    {column.type === 'select' && column.options && column.options.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {column.options.slice(0, 3).map((opt) => (
                          <Badge key={opt} variant="secondary" className="text-xs">
                            {opt}
                          </Badge>
                        ))}
                        {column.options.length > 3 && (
                          <Badge variant="secondary" className="text-xs">
                            +{column.options.length - 3}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={() => handleToggleShowInReport(column)}
                      title={column.show_in_report ? 'Ocultar do relatório' : 'Exibir no relatório'}
                    >
                      {column.show_in_report ? (
                        <Eye className="w-4 h-4 text-primary" />
                      ) : (
                        <EyeOff className="w-4 h-4 text-muted-foreground" />
                      )}
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={() => handleOpenDialog(column)}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => {
                        setDeletingColumn(column);
                        setIsDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Column Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingColumn ? 'Editar Campo' : 'Novo Campo Personalizado'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="column-name">Nome do Campo</Label>
                <Input
                  id="column-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Categoria, Prioridade..."
                  required
                  disabled={submitting}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="column-type">Tipo</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value: 'text' | 'select') => setFormData({ ...formData, type: value })}
                  disabled={submitting}
                >
                  <SelectTrigger id="column-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">Texto Livre</SelectItem>
                    <SelectItem value="select">Seleção (opções pré-definidas)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.type === 'select' && (
                <div className="space-y-2">
                  <Label>Opções</Label>
                  <div className="flex gap-2">
                    <Input
                      value={newOption}
                      onChange={(e) => setNewOption(e.target.value)}
                      placeholder="Nova opção..."
                      disabled={submitting}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddOption();
                        }
                      }}
                    />
                    <Button type="button" variant="secondary" onClick={handleAddOption} disabled={submitting}>
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  {formData.options.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {formData.options.map((opt) => (
                        <Badge key={opt} variant="secondary" className="gap-1">
                          {opt}
                          <button
                            type="button"
                            onClick={() => handleRemoveOption(opt)}
                            className="ml-1 hover:text-destructive"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <Label htmlFor="show-in-report" className="cursor-pointer">
                    Exibir no Relatório
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Este campo será visível nos relatórios compartilhados.
                  </p>
                </div>
                <Switch
                  id="show-in-report"
                  checked={formData.show_in_report}
                  onCheckedChange={(checked) => setFormData({ ...formData, show_in_report: checked })}
                  disabled={submitting}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} disabled={submitting}>
                Cancelar
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                {editingColumn ? 'Salvar' : 'Criar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Campo</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o campo "{deletingColumn?.name}"?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
