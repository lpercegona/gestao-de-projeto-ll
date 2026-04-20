import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ImagePlus, Loader2, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface RequestAttachment {
  name: string;
  url: string;
  uploaded_at: string;
  path?: string;
}

interface RequestAttachmentsUploaderProps {
  clientId: string | null;
  folderId?: string; // grouping folder (request id or tmp uuid)
  attachments: RequestAttachment[];
  onChange: (next: RequestAttachment[]) => void;
  disabled?: boolean;
  maxFiles?: number;
  maxSizeMb?: number;
}

const BUCKET = 'request-attachments';

export const RequestAttachmentsUploader: React.FC<RequestAttachmentsUploaderProps> = ({
  clientId,
  folderId,
  attachments,
  onChange,
  disabled,
  maxFiles = 10,
  maxSizeMb = 2,
}) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [tmpFolder] = useState(() => folderId || `tmp-${crypto.randomUUID()}`);

  const handlePick = () => inputRef.current?.click();

  const handleFiles = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    if (!files.length) return;

    if (!clientId) {
      toast.error('Cliente não identificado. Não é possível anexar.');
      return;
    }
    if (attachments.length + files.length > maxFiles) {
      toast.error(`Máximo de ${maxFiles} imagens.`);
      return;
    }

    setUploading(true);
    const next: RequestAttachment[] = [...attachments];
    try {
      for (const file of files) {
        if (!file.type.startsWith('image/')) {
          toast.error(`"${file.name}" não é uma imagem.`);
          continue;
        }
        if (file.size > maxSizeMb * 1024 * 1024) {
          toast.error(`"${file.name}" excede ${maxSizeMb}MB.`);
          continue;
        }
        const ext = file.name.split('.').pop() || 'bin';
        const safe = file.name.replace(/[^\w.-]+/g, '_');
        const path = `${clientId}/${tmpFolder}/${Date.now()}-${safe}`;
        const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type,
        });
        if (error) {
          console.error('Upload error:', error);
          toast.error(`Falha ao enviar "${file.name}".`);
          continue;
        }
        const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
        next.push({
          name: file.name,
          url: pub.publicUrl,
          uploaded_at: new Date().toISOString(),
          path,
        });
      }
      onChange(next);
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async (att: RequestAttachment) => {
    onChange(attachments.filter((a) => a.url !== att.url));
    if (att.path) {
      await supabase.storage.from(BUCKET).remove([att.path]).catch(() => {});
    }
  };

  return (
    <div className="space-y-2">
      <Label>Imagens de apoio (opcional)</Label>
      <div className="flex flex-wrap items-start gap-2">
        {attachments.map((att) => (
          <div
            key={att.url}
            className="relative h-20 w-20 overflow-hidden rounded-md border border-border bg-muted"
          >
            <img src={att.url} alt={att.name} className="h-full w-full object-cover" />
            {!disabled && (
              <button
                type="button"
                onClick={() => handleRemove(att)}
                className="absolute right-0.5 top-0.5 rounded-full bg-background/90 p-0.5 shadow"
                aria-label={`Remover ${att.name}`}
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handlePick}
          disabled={disabled || uploading || attachments.length >= maxFiles || !clientId}
          className="h-20 w-20 flex-col gap-1 text-xs"
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
          <span>Anexar</span>
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Até {maxFiles} imagens, máx. {maxSizeMb}MB cada.
      </p>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFiles}
      />
    </div>
  );
};