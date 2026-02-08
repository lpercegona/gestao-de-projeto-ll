import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, FileText, FileSignature, Plus, Eye, ExternalLink } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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

const getStatusBadge = (status: string) => {
  const normalized = status.toLowerCase();
  if (['accepted', 'signed'].includes(normalized)) {
    return <Badge className="bg-green-100 text-green-800">{status}</Badge>;
  }

  if (['sent', 'viewed'].includes(normalized)) {
    return <Badge variant="secondary">{status}</Badge>;
  }

  if (['rejected', 'cancelled'].includes(normalized)) {
    return <Badge variant="destructive">{status}</Badge>;
  }

  return <Badge variant="outline">{status}</Badge>;
};

export const ProposalsTab: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | DocumentType>('all');
  const [proposals, setProposals] = useState<ProposalFile[]>([]);
  const [contracts, setContracts] = useState<ContractFile[]>([]);

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

  const documents = useMemo<DocumentItem[]>(() => {
    const merged: DocumentItem[] = [
      ...proposals.map((proposal) => ({ ...proposal, type: 'proposal' as const })),
      ...contracts.map((contract) => ({ ...contract, type: 'contract' as const })),
    ];

    return merged
      .filter((doc) => filter === 'all' || doc.type === filter)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [contracts, filter, proposals]);

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

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate('/proposals')}>
              <Plus className="w-4 h-4 mr-2" />
              Nova Proposta
            </Button>
            <Button size="sm" onClick={() => navigate('/contracts')}>
              <Plus className="w-4 h-4 mr-2" />
              Novo Contrato
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : documents.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            Nenhum documento encontrado.
          </div>
        ) : (
          <div className="space-y-3">
            {documents.map((document) => (
              <div
                key={`${document.type}-${document.id}`}
                className="flex flex-col gap-3 rounded-lg border border-border p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    {document.type === 'proposal' ? (
                      <FileText className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <FileSignature className="w-4 h-4 text-muted-foreground" />
                    )}
                    <span className="font-medium text-foreground">{document.title}</span>
                    <Badge variant="outline">{document.type === 'proposal' ? 'Proposta' : 'Contrato'}</Badge>
                    {getStatusBadge(document.status)}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Criado em {format(parseISO(document.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      window.open(
                        document.type === 'proposal'
                          ? `/proposal/${document.share_token}`
                          : `/contract/${document.share_token}`,
                        '_blank',
                      )
                    }
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Visualizar
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => navigate(document.type === 'proposal' ? '/proposals' : '/contracts')}
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Abrir
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
