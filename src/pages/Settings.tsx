import React, { useState } from 'react';
import { useData } from '@/contexts/DataContext';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Plus, Pencil, Trash2, X } from 'lucide-react';
import { ProjectColumn } from '@/types';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';

export const Settings: React.FC = () => {
  const { data, createColumn, updateColumn, deleteColumn } = useData();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingColumn, setEditingColumn] = useState<ProjectColumn | null>(null);
  const [deletingColumn, setDeletingColumn] = useState<ProjectColumn | null>(null);
  const [newOption, setNewOption] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    type: 'text' as 'text' | 'select',
    options: [] as string[],
  });

  const handleOpenDialog = (column?: ProjectColumn) => {
    if (column) {
      setEditingColumn(column);
      setFormData({
        name: column.name,
        type: column.type,
        options: column.options || [],
      });
    } else {
      setEditingColumn(null);
      setFormData({ name: '', type: 'text', options: [] });
    }
    setIsDialogOpen(true);
  };

  const handleAddOption = () => {
    if (newOption.trim() && !formData.options.includes(newOption.trim())) {
      setFormData({
        ...formData,
        options: [...formData.options, newOption.trim()],
      });
      setNewOption('');
    }
  };

  const handleRemoveOption = (option: string) => {
    setFormData({
      ...formData,
      options: formData.options.filter(o => o !== option),
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.type === 'select' && formData.options.length === 0) {
      toast.error('Adicione pelo menos uma opção para campos de seleção.');
      return;
    }

    const columnData = {
      name: formData.name,
      type: formData.type,
      options: formData.type === 'select' ? formData.options : undefined,
    };

    if (editingColumn) {
      updateColumn(editingColumn.id, columnData);
      toast.success('Campo atualizado com sucesso!');
    } else {
      createColumn(columnData);
      toast.success('Campo criado com sucesso!');
    }
    setIsDialogOpen(false);
  };

  const handleDelete = () => {
    if (deletingColumn) {
      deleteColumn(deletingColumn.id);
      toast.success('Campo excluído com sucesso!');
      setIsDeleteDialogOpen(false);
      setDeletingColumn(null);
    }
  };

  return (
    <div>
      <PageHeader
        title="Configurações"
        description="Personalize os campos de projetos"
      />

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Campos de Projeto</CardTitle>
              <CardDescription>
                Configure campos personalizados para categorizar seus projetos
              </CardDescription>
            </div>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="w-4 h-4 mr-2" />
              Novo Campo
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {data.projectColumns.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Nenhum campo personalizado criado ainda.
            </p>
          ) : (
            <div className="space-y-4">
              {data.projectColumns.map((column) => (
                <div 
                  key={column.id} 
                  className="flex items-center justify-between p-4 border border-border rounded-lg"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-foreground">{column.name}</h4>
                      <Badge variant="secondary">
                        {column.type === 'text' ? 'Texto' : 'Seleção'}
                      </Badge>
                    </div>
                    {column.options && column.options.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {column.options.map((option) => (
                          <Badge key={option} variant="outline">
                            {option}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleOpenDialog(column)}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setDeletingColumn(column);
                        setIsDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingColumn ? 'Editar Campo' : 'Novo Campo'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="columnName">Nome do Campo</Label>
                <Input
                  id="columnName"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Categoria, Tipo, Prioridade"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="columnType">Tipo</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value: 'text' | 'select') => 
                    setFormData({ ...formData, type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">Texto livre</SelectItem>
                    <SelectItem value="select">Lista de opções</SelectItem>
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
                      placeholder="Nova opção"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddOption();
                        }
                      }}
                    />
                    <Button type="button" onClick={handleAddOption}>
                      Adicionar
                    </Button>
                  </div>
                  {formData.options.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {formData.options.map((option) => (
                        <Badge key={option} variant="secondary" className="gap-1">
                          {option}
                          <button
                            type="button"
                            onClick={() => handleRemoveOption(option)}
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
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">
                {editingColumn ? 'Salvar' : 'Criar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir campo?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O campo "{deletingColumn?.name}" 
              será removido de todos os projetos.
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
