import React from 'react';
import { FileText, FileSpreadsheet, FileType2, File as FileIcon, FileArchive, FileCode } from 'lucide-react';

export const ALLOWED_FILE_ACCEPT =
  'image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv';

export const ALLOWED_FILE_EXT_LABEL = 'imagens, PDF, DOC, XLS, PPT, TXT, CSV';

export const isImageMime = (mime?: string, name?: string) => {
  if (mime && mime.startsWith('image/')) return true;
  if (name && /\.(png|jpe?g|gif|webp|svg|bmp|avif)$/i.test(name)) return true;
  return false;
};

export const isAllowedAttachment = (file: File) => {
  if (isImageMime(file.type, file.name)) return true;
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  return ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'csv'].includes(ext);
};

const getFileMeta = (name: string, mime?: string) => {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  if (isImageMime(mime, name)) return { Icon: FileIcon, label: ext.toUpperCase() || 'IMG', tone: 'text-muted-foreground' };
  if (ext === 'pdf') return { Icon: FileType2, label: 'PDF', tone: 'text-red-600' };
  if (['doc', 'docx'].includes(ext)) return { Icon: FileText, label: 'DOC', tone: 'text-blue-600' };
  if (['xls', 'xlsx', 'csv'].includes(ext)) return { Icon: FileSpreadsheet, label: ext.toUpperCase(), tone: 'text-emerald-600' };
  if (['ppt', 'pptx'].includes(ext)) return { Icon: FileText, label: 'PPT', tone: 'text-orange-600' };
  if (['zip', 'rar', '7z'].includes(ext)) return { Icon: FileArchive, label: ext.toUpperCase(), tone: 'text-amber-600' };
  if (['txt', 'md', 'json', 'xml', 'yml', 'yaml'].includes(ext)) return { Icon: FileCode, label: ext.toUpperCase(), tone: 'text-muted-foreground' };
  return { Icon: FileIcon, label: ext.toUpperCase() || 'FILE', tone: 'text-muted-foreground' };
};

interface AttachmentThumbnailProps {
  name: string;
  url?: string;
  mime?: string;
  className?: string;
}

export const AttachmentThumbnail: React.FC<AttachmentThumbnailProps> = ({ name, url, mime, className }) => {
  if (isImageMime(mime, name) && url) {
    return <img src={url} alt={name} className={className ?? 'h-full w-full object-cover'} />;
  }
  const { Icon, label, tone } = getFileMeta(name, mime);
  return (
    <div className={`flex h-full w-full flex-col items-center justify-center gap-1 bg-muted/40 p-1 ${tone}`}>
      <Icon className="h-7 w-7" />
      <span className="text-[9px] font-semibold tracking-wide">{label}</span>
    </div>
  );
};