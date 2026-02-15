import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { WysiwygEditor } from '@/components/ui/wysiwyg-editor';
import { supabase } from '@/integrations/supabase/client';
import {
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Type,
  FileText,
  ImageIcon,
  Loader2,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

export interface TemplateSection {
  id: string;
  type: 'title' | 'text' | 'image';
  content: string;
  order: number;
}

interface TemplateSectionEditorProps {
  sections: TemplateSection[];
  onChange: (sections: TemplateSection[]) => void;
}

export const TemplateSectionEditor: React.FC<TemplateSectionEditorProps> = ({
  sections,
  onChange,
}) => {
  const [uploadingId, setUploadingId] = React.useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingSectionIdRef = useRef<string | null>(null);

  const addSection = (type: 'title' | 'text' | 'image') => {
    const newSection: TemplateSection = {
      id: crypto.randomUUID(),
      type,
      content: '',
      order: sections.length,
    };
    onChange([...sections, newSection]);
  };

  const updateSection = (id: string, content: string) => {
    onChange(sections.map((s) => (s.id === id ? { ...s, content } : s)));
  };

  const removeSection = (id: string) => {
    onChange(
      sections
        .filter((s) => s.id !== id)
        .map((s, i) => ({ ...s, order: i })),
    );
  };

  const moveSection = (id: string, direction: 'up' | 'down') => {
    const idx = sections.findIndex((s) => s.id === id);
    if (idx < 0) return;
    const newIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= sections.length) return;

    const updated = [...sections];
    [updated[idx], updated[newIdx]] = [updated[newIdx], updated[idx]];
    onChange(updated.map((s, i) => ({ ...s, order: i })));
  };

  const handleImageUpload = async (file: File, sectionId: string) => {
    setUploadingId(sectionId);
    try {
      const ext = file.name.split('.').pop();
      const path = `${crypto.randomUUID()}.${ext}`;

      const { error } = await supabase.storage
        .from('proposal-images')
        .upload(path, file);

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from('proposal-images')
        .getPublicUrl(path);

      updateSection(sectionId, urlData.publicUrl);
      toast.success('Imagem enviada!');
    } catch (err) {
      console.error('Upload error:', err);
      toast.error('Erro ao enviar imagem');
    } finally {
      setUploadingId(null);
    }
  };

  const triggerImageUpload = (sectionId: string) => {
    pendingSectionIdRef.current = sectionId;
    fileInputRef.current?.click();
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && pendingSectionIdRef.current) {
      handleImageUpload(file, pendingSectionIdRef.current);
    }
    e.target.value = '';
  };

  const getSectionLabel = (type: string) => {
    switch (type) {
      case 'title': return 'Título';
      case 'text': return 'Texto';
      case 'image': return 'Imagem';
      default: return type;
    }
  };

  return (
    <div className="space-y-3">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onFileChange}
      />

      {sections
        .sort((a, b) => a.order - b.order)
        .map((section, idx) => (
          <Card key={section.id} className="relative">
            <CardContent className="pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {getSectionLabel(section.type)}
                </Label>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    disabled={idx === 0}
                    onClick={() => moveSection(section.id, 'up')}
                  >
                    <ChevronUp className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    disabled={idx === sections.length - 1}
                    onClick={() => moveSection(section.id, 'down')}
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-destructive"
                    onClick={() => removeSection(section.id)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              {section.type === 'title' && (
                <Input
                  value={section.content}
                  onChange={(e) => updateSection(section.id, e.target.value)}
                  placeholder="Digite o título da seção..."
                  className="text-lg font-semibold"
                />
              )}

              {section.type === 'text' && (
                <WysiwygEditor
                  value={section.content}
                  onChange={(val) => updateSection(section.id, val)}
                  placeholder="Escreva o conteúdo desta seção..."
                  minHeight="120px"
                />
              )}

              {section.type === 'image' && (
                <div className="space-y-2">
                  {section.content ? (
                    <div className="relative">
                      <img
                        src={section.content}
                        alt="Seção de imagem"
                        className="max-w-full rounded-md border"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="mt-2"
                        onClick={() => triggerImageUpload(section.id)}
                      >
                        Trocar imagem
                      </Button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full h-24 border-dashed"
                      onClick={() => triggerImageUpload(section.id)}
                      disabled={uploadingId === section.id}
                    >
                      {uploadingId === section.id ? (
                        <Loader2 className="w-5 h-5 animate-spin mr-2" />
                      ) : (
                        <ImageIcon className="w-5 h-5 mr-2" />
                      )}
                      {uploadingId === section.id ? 'Enviando...' : 'Selecionar imagem'}
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="outline" className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            Adicionar seção
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center">
          <DropdownMenuItem onClick={() => addSection('title')}>
            <Type className="w-4 h-4 mr-2" />
            Título
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => addSection('text')}>
            <FileText className="w-4 h-4 mr-2" />
            Texto (WYSIWYG)
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => addSection('image')}>
            <ImageIcon className="w-4 h-4 mr-2" />
            Imagem
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
