import React, { useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Loader2, Upload, X, ImageIcon } from 'lucide-react';
import { toast } from 'sonner';

interface ClientLogoUploadProps {
  clientId: string;
  currentLogoUrl: string;
  onLogoChange: (url: string) => void;
  disabled?: boolean;
}

const MAX_FILE_SIZE = 1 * 1024 * 1024; // 1MB
const ALLOWED_TYPES = ['image/svg+xml', 'image/png', 'image/webp'];
const ALLOWED_EXTENSIONS = ['.svg', '.png', '.webp'];

export const ClientLogoUpload: React.FC<ClientLogoUploadProps> = ({
  clientId,
  currentLogoUrl,
  onLogoChange,
  disabled = false,
}) => {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error(`Formato inválido. Use: ${ALLOWED_EXTENSIONS.join(', ')}`);
      return;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      toast.error('Arquivo muito grande. Tamanho máximo: 1MB');
      return;
    }

    setUploading(true);
    try {
      // Get file extension
      const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
      const filePath = `${clientId}/logo.${ext}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('client-logos')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL with cache buster
      const { data: urlData } = supabase.storage
        .from('client-logos')
        .getPublicUrl(filePath);

      const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;
      onLogoChange(publicUrl);
      toast.success('Logo atualizada com sucesso!');
    } catch (error: any) {
      console.error('Error uploading logo:', error);
      toast.error(error?.message || 'Erro ao fazer upload da logo');
    } finally {
      setUploading(false);
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveLogo = () => {
    onLogoChange('');
  };

  return (
    <div className="space-y-2">
      <Label>Logo do Cliente</Label>
      <div className="flex items-start gap-4">
        {/* Logo preview container */}
        <div className="w-20 h-20 flex items-center justify-center bg-muted rounded-lg overflow-hidden border border-border">
          {currentLogoUrl ? (
            <img
              src={currentLogoUrl}
              alt="Logo"
              className="max-w-full max-h-full object-contain"
            />
          ) : (
            <ImageIcon className="w-8 h-8 text-muted-foreground" />
          )}
        </div>

        {/* Upload controls */}
        <div className="flex-1 space-y-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".svg,.png,.webp,image/svg+xml,image/png,image/webp"
            onChange={handleFileSelect}
            className="hidden"
            disabled={disabled || uploading}
          />
          
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled || uploading}
            >
              {uploading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Upload className="w-4 h-4 mr-2" />
              )}
              {currentLogoUrl ? 'Alterar' : 'Upload'}
            </Button>
            
            {currentLogoUrl && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleRemoveLogo}
                disabled={disabled || uploading}
              >
                <X className="w-4 h-4 mr-2" />
                Remover
              </Button>
            )}
          </div>
          
          <p className="text-xs text-muted-foreground">
            SVG, PNG ou WEBP. Máximo 1MB. Ajuste automático.
          </p>
        </div>
      </div>
    </div>
  );
};
