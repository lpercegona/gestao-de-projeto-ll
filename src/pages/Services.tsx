import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Proposals } from '@/pages/Proposals';
import { Contracts } from '@/pages/Contracts';
import { LayerPlus, Search } from 'lucide-react';

interface ProposalItem {
  id: string;
  service: string;
  description: string;
  hours: number;
  pricePerHour: number;
}

interface ProposalRow {
  id: string;
  title: string;
  recipient_name: string;
  status: string;
  created_at: string;
  items: ProposalItem[];
}

type ServicesTab = 'services' | 'proposals' | 'contracts';

const tabByPath: Record<string, ServicesTab> = {
  '/services': 'services',
  '/proposals': 'proposals',
  '/contracts': 'contracts',
};

export const Services: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [proposals, setProposals] = useState<ProposalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const activeTab = tabByPath[location.pathname] || 'services';

  useEffect(() => {
    const fetchProposals = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('proposals')
          .select('id, title, recipient_name, status, created_at, items')
          .order('created_at', { ascending: false });

        if (error) throw error;

        setProposals(
          (data || []).map((proposal) => ({
            ...proposal,
            items: (proposal.items as unknown as ProposalItem[]) || [],
          })),
        );
      } catch (error) {
        console.error('Erro ao carregar serviços/produtos das propostas:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProposals();
  }, []);

  const serviceRows = useMemo(() => {
    return proposals.flatMap((proposal) =>
      proposal.items
        .filter((item) => item.service?.trim() || item.description?.trim())
        .map((item) => ({
          proposalId: proposal.id,
          proposalTitle: proposal.title,
          recipientName: proposal.recipient_name,
          status: proposal.status,
          service: item.service || 'Sem título',
          description: item.description || 'Sem descrição',
          hours: Number(item.hours || 0),
          pricePerHour: Number(item.pricePerHour || 0),
          total: Number(item.hours || 0) * Number(item.pricePerHour || 0),
        })),
    );
  }, [proposals]);

  const filteredRows = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    if (!term) return serviceRows;

    return serviceRows.filter((row) =>
      [row.service, row.description, row.proposalTitle, row.recipientName].some((value) =>
        value.toLowerCase().includes(term),
      ),
    );
  }, [searchTerm, serviceRows]);

  const handleTabChange = (tab: string) => {
    navigate(`/${tab}`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Serviços"
        description="Visualize serviços e produtos cadastrados nas propostas e acesse propostas/contratos em abas dedicadas."
      />

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="services">Serviços</TabsTrigger>
          <TabsTrigger value="proposals">Propostas</TabsTrigger>
          <TabsTrigger value="contracts">Contratos</TabsTrigger>
        </TabsList>

        <TabsContent value="services" className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Card className="md:col-span-1">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Itens cadastrados</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center gap-2">
                <Layers3 className="h-4 w-4 text-muted-foreground" />
                <span className="text-2xl font-semibold">{serviceRows.length}</span>
              </CardContent>
            </Card>
          </div>

          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por serviço/produto, proposta ou destinatário"
              className="pl-9"
            />
          </div>

          <Card>
            <CardContent className="pt-6">
              {loading ? (
                <p className="text-sm text-muted-foreground">Carregando serviços/produtos...</p>
              ) : filteredRows.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum serviço/produto encontrado.</p>
              ) : (
                <div className="space-y-3">
                  {filteredRows.map((row, index) => (
                    <div key={`${row.proposalId}-${row.service}-${index}`} className="rounded-lg border p-4">
                      <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                        <h3 className="font-semibold">{row.service}</h3>
                        <span className="text-sm text-muted-foreground">{row.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">{row.description}</p>
                      <div className="mt-2 text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">Proposta:</span> {row.proposalTitle} • {row.recipientName} • {row.hours}h ×{' '}
                        {row.pricePerHour.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="proposals" className="space-y-4">
          <Proposals />
        </TabsContent>

        <TabsContent value="contracts" className="space-y-4">
          <Contracts />
        </TabsContent>
      </Tabs>
    </div>
  );
};
