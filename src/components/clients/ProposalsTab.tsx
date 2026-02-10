import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, FileText, FileSignature, Plus, Eye, ExternalLink, Folder, Upload, Search, ChevronRight } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

interface ProposalFile {
  id: string;
  title: string;
  status: string;
  created_at: string;
  share_token: string;
  client_id: string | null;
}

interface ContractFile {
  id: string;
  title: string;
  status: string;
  created_at: string;
  share_token: string;
  client_id: string | null;
}

type DocumentType = 'proposal' | 'contract';

interface DocumentItem {
  id: string;
  title: string;
  status: string;
  created_at: string;
  share_token: string;
  client_id: string | null;
  type: DocumentType;
}

interface UploadedFile {
  id: string;
  title: string;
  created_at: string;
}

interface CustomFolder {
  id: string;
  name: string;
  created_at: string;
}

type ExplorerFolderKey = 'root' | 'proposals' | 'contracts' | 'uploads' | 'custom';

type ExplorerItem =
  | { id: string; title: string; kind: 'folder'; folderKey: ExplorerFolderKey; status: string; createdAt: string }
  | { id: string; title: string; kind: 'proposal' | 'contract'; status: string; createdAt: string; shareToken: string }
  | { id: string; title: string; kind: 'upload'; status: string; createdAt: string };

const getStatusBadge = (status: string) => {
  const normalized = status.toLowerCase();
  if (['accepted', 'signed'].includes(normalized)) return <Badge className="bg-green-100 text-green-800">{status}</Badge>;
  if (['sent', 'viewed'].includes(normalized)) return <Badge variant="secondary">{status}</Badge>;
  if (['rejected', 'cancelled'].includes(normalized)) return <Badge variant="destructive">{status}</Badge>;
  return <Badge variant="outline">{status}</Badge>;
};

interface ProposalsTabProps {
  onDocumentsCountChange?: (count: number) => void;
}

export const ProposalsTab: React.FC<ProposalsTabProps> = ({ onDocumentsCountChange }) => {
  const navigate = useNavigate();
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | DocumentType>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFolder, setActiveFolder] = useState<ExplorerFolderKey>('root');
  const [proposals, setProposals] = useState<ProposalFile[]>([]);
  const [contracts, setContracts] = useState<ContractFile[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [customFolders, setCustomFolders] = useState<CustomFolder[]>([]);

  useEffect(() => {
    const fetchDocuments = async () => {
      setLoading(true);
      try {
        const [{ data: proposalsData }, { data: contractsData }] = await Promise.all([
          supabase.from('proposals').select('id, title, status, created_at, share_token, client_id').order('created_at', { ascending: false }),
          supabase.from('contracts').select('id, title, status, created_at, share_token, client_id').order('created_at', { ascending: false }),
        ]);

        setProposals(proposalsData || []);
        setContracts(contractsData || []);
      } finally {
        setLoading(false);
      }
    };

    fetchDocuments();
  }, []);

  const allDocuments = useMemo<DocumentItem[]>(() => {
    const merged: DocumentItem[] = [
      ...proposals.map((proposal) => ({ ...proposal, type: 'proposal' as const })),
      ...contracts.map((contract) => ({ ...contract, type: 'contract' as const })),
    ];

    return merged.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [contracts, proposals]);

  useEffect(() => {
    onDocumentsCountChange?.(allDocuments.length + uploadedFiles.length);
  }, [allDocuments.length, onDocumentsCountChange, uploadedFiles.length]);

  const rootItems = useMemo<ExplorerItem[]>(() => {
    const latestDate = (items: { created_at: string }[]) => items[0]?.created_at ?? new Date().toISOString();

    const baseFolders: ExplorerItem[] = [
      {
        id: 'folder-proposals',
        title: 'Propostas',
        kind: 'folder',
        folderKey: 'proposals',
        status: `${proposals.length} itens`,
        createdAt: latestDate(proposals),
      },
      {
        id: 'folder-contracts',
        title: 'Contratos',
        kind: 'folder',
        folderKey: 'contracts',
        status: `${contracts.length} itens`,
        createdAt: latestDate(contracts),
      },
      {
        id: 'folder-uploads',
        title: 'Uploads',
        kind: 'folder',
        folderKey: 'uploads',
        status: `${uploadedFiles.length} itens`,
        createdAt: uploadedFiles[0]?.created_at ?? new Date().toISOString(),
      },
    ];

    const dynamicFolders: ExplorerItem[] = customFolders.map((folder) => ({
      id: folder.id,
      title: folder.name,
      kind: 'folder',
      folderKey: 'custom',
      status: 'Pasta personalizada',
      createdAt: folder.created_at,
    }));

    return [...baseFolders, ...dynamicFolders];
  }, [contracts, customFolders, proposals, uploadedFiles]);

  const currentItems = useMemo<ExplorerItem[]>(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    let rawItems: ExplorerItem[];

    if (activeFolder === 'root') {
      rawItems = rootItems;
    } else if (activeFolder === 'proposals') {
      rawItems = allDocuments
        .filter((doc) => doc.type === 'proposal')
        .map((doc) => ({
          id: doc.id,
          title: doc.title,
          kind: 'proposal' as const,
          status: doc.status,
          createdAt: doc.created_at,
          shareToken: doc.share_token,
        }));
    } else if (activeFolder === 'contracts') {
      rawItems = allDocuments
        .filter((doc) => doc.type === 'contract')
        .map((doc) => ({
          id: doc.id,
          title: doc.title,
          kind: 'contract' as const,
          status: doc.status,
          createdAt: doc.created_at,
          shareToken: doc.share_token,
        }));
    } else if (activeFolder === 'uploads') {
      rawItems = uploadedFiles.map((file) => ({
        id: file.id,
        title: file.title,
        kind: 'upload' as const,
        status: 'Enviado',
        createdAt: file.created_at,
      }));
    } else {
      rawItems = [];
    }

    const folderFiltered = rawItems.filter((item) => {
      if (activeFolder !== 'root' && item.kind !== 'proposal' && item.kind !== 'contract' && filter !== 'all') {
        return false;
      }

      if (item.kind === 'proposal') return filter === 'all' || filter === 'proposal';
      if (item.kind === 'contract') return filter === 'all' || filter === 'contract';
      return true;
    });

    return folderFiltered.filter((item) => !normalizedSearch || item.title.toLowerCase().includes(normalizedSearch));
  }, [activeFolder, allDocuments, filter, rootItems, searchTerm, uploadedFiles]);

  const breadcrumbs = useMemo(() => {
    const map: Record<ExplorerFolderKey, string[]> = {
      root: ['Arquivos'],
      proposals: ['Arquivos', 'Propostas'],
      contracts: ['Arquivos', 'Contratos'],
      uploads: ['Arquivos', 'Uploads'],
      custom: ['Arquivos', 'Pastas'],
    };

    return map[activeFolder];
  }, [activeFolder]);

  const handleCreateOption = (option: 'proposal' | 'contract' | 'folder' | 'upload') => {
    if (option === 'proposal') {
      navigate('/proposals');
      return;
    }

    if (option === 'contract') {
      navigate('/contracts');
      return;
    }

    if (option === 'folder') {
      const folderName = window.prompt('Nome da nova pasta');
      if (!folderName || !folderName.trim()) return;

      setCustomFolders((previous) => [
        {
          id: crypto.randomUUID(),
          name: folderName.trim(),
          created_at: new Date().toISOString(),
        },
        ...previous,
      ]);
      toast.success('Pasta criada com sucesso.');
      return;
    }

    uploadInputRef.current?.click();
  };

  const handleUploadFiles = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const parsed: UploadedFile[] = Array.from(files).map((file) => ({
      id: crypto.randomUUID(),
      title: file.name,
      created_at: new Date().toISOString(),
    }));

    setUploadedFiles((previous) => [...parsed, ...previous]);
    toast.success(`${parsed.length} arquivo(s) adicionados à pasta Uploads.`);
    event.target.value = '';
  };

  const openItem = (item: ExplorerItem) => {
    if (item.kind === 'folder') {
      setActiveFolder(item.folderKey);
      return;
    }

    if (item.kind === 'upload') {
      toast.info('Pré-visualização para uploads será disponibilizada em breve.');
      return;
    }

    window.open(item.kind === 'proposal' ? `/proposal/${item.shareToken}` : `/contract/${item.shareToken}`, '_blank');
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <Tabs value={filter} onValueChange={(value) => setFilter(value as 'all' | DocumentType)}>
            <TabsList>
              <TabsTrigger value="all">Todos</TabsTrigger>
              <TabsTrigger value="proposal">Propostas</TabsTrigger>
              <TabsTrigger value="contract">Contratos</TabsTrigger>
            </TabsList>
          </Tabs>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" className="h-9 w-9">
                <Plus className="h-4 w-4" />
                <span className="sr-only">Novo arquivo</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onClick={() => handleCreateOption('contract')}>
                <FileSignature className="mr-2 h-4 w-4" />
                Contrato
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleCreateOption('proposal')}>
                <FileText className="mr-2 h-4 w-4" />
                Proposta
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleCreateOption('folder')}>
                <Folder className="mr-2 h-4 w-4" />
                Pasta
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleCreateOption('upload')}>
                <Upload className="mr-2 h-4 w-4" />
                Upload
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <input ref={uploadInputRef} type="file" multiple className="hidden" onChange={handleUploadFiles} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            {breadcrumbs.map((crumb, index) => (
              <React.Fragment key={`${crumb}-${index}`}>
                <span>{crumb}</span>
                {index < breadcrumbs.length - 1 && <ChevronRight className="h-3.5 w-3.5" />}
              </React.Fragment>
            ))}
          </div>

          {activeFolder !== 'root' && (
            <Button variant="outline" size="sm" onClick={() => setActiveFolder('root')}>
              Voltar para pastas
            </Button>
          )}
        </div>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Pesquisar em arquivos"
            className="pl-9"
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : currentItems.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            Nenhum arquivo encontrado.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <div className="min-w-[760px]">
              <div className="grid grid-cols-[minmax(0,1fr)_140px_150px_220px] bg-muted/40 px-4 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <span>Nome</span>
                <span>Tipo</span>
                <span>Status</span>
                <span>Atualizado em</span>
              </div>
              {currentItems.map((item) => (
                <div
                  key={item.id}
                  className="grid grid-cols-[minmax(0,1fr)_140px_150px_220px] items-center gap-2 border-t border-border px-4 py-3 transition-colors hover:bg-muted/30"
                >
                  <button type="button" className="flex min-w-0 items-center gap-2 text-left" onClick={() => openItem(item)}>
                    {item.kind === 'proposal' ? (
                      <FileText className="h-4 w-4 text-muted-foreground" />
                    ) : item.kind === 'contract' ? (
                      <FileSignature className="h-4 w-4 text-muted-foreground" />
                    ) : item.kind === 'upload' ? (
                      <Upload className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Folder className="h-4 w-4 text-amber-500" />
                    )}
                    <span className="truncate font-medium text-foreground">{item.title}</span>
                  </button>

                  <Badge variant="outline" className="w-fit">
                    {item.kind === 'proposal'
                      ? 'Proposta'
                      : item.kind === 'contract'
                        ? 'Contrato'
                        : item.kind === 'upload'
                          ? 'Upload'
                          : 'Pasta'}
                  </Badge>

                  <div>
                    {item.kind === 'folder' || item.kind === 'upload' ? (
                      <span className="text-sm text-muted-foreground">{item.status}</span>
                    ) : (
                      getStatusBadge(item.status)
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm text-muted-foreground">
                      {format(parseISO(item.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </span>

                    {(item.kind === 'proposal' || item.kind === 'contract') && (
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openItem(item)}>
                          <Eye className="h-4 w-4" />
                          <span className="sr-only">Visualizar</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => navigate(item.kind === 'proposal' ? '/proposals' : '/contracts')}
                        >
                          <ExternalLink className="h-4 w-4" />
                          <span className="sr-only">Abrir</span>
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
