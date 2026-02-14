import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Proposals } from '@/pages/Proposals';
import { Contracts } from '@/pages/Contracts';
import { Layers3, Search, Plus, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

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

interface ServiceRow {
  id: string;
  source: 'manual' | 'proposal';
  proposalId: string;
  proposalTitle: string;
  recipientName: string;
  service: string;
  description: string;
  hours: number;
  pricePerHour: number;
  total: number;
}

const MANUAL_ITEMS_STORAGE_KEY = 'services:manual-items';

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
  const [createItemOpen, setCreateItemOpen] = useState(false);
  const [manualItems, setManualItems] = useState<ServiceRow[]>([]);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [newItem, setNewItem] = useState({
    service: '',
    description: '',
    hours: 0,
    pricePerHour: 0,
  });

  const activeTab = tabByPath[location.pathname] || 'services';

  useEffect(() => {
    const storedItems = localStorage.getItem(MANUAL_ITEMS_STORAGE_KEY);

    if (!storedItems) return;

    try {
      const parsedItems = JSON.parse(storedItems) as ServiceRow[];
      setManualItems(Array.isArray(parsedItems) ? parsedItems : []);
    } catch (error) {
      console.error('Erro ao carregar itens manuais de serviço:', error);
      localStorage.removeItem(MANUAL_ITEMS_STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(MANUAL_ITEMS_STORAGE_KEY, JSON.stringify(manualItems));
  }, [manualItems]);

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
    const proposalItems = proposals.flatMap((proposal) =>
      proposal.items
        .filter((item) => item.service?.trim() || item.description?.trim())
        .map((item, index) => ({
          id: item.id || `${proposal.id}-${index}`,
          source: 'proposal' as const,
          proposalId: proposal.id,
          proposalTitle: proposal.title,
          recipientName: proposal.recipient_name,
          service: item.service || 'Sem título',
          description: item.description || 'Sem descrição',
          hours: Number(item.hours || 0),
          pricePerHour: Number(item.pricePerHour || 0),
          total: Number(item.hours || 0) * Number(item.pricePerHour || 0),
        })),
    );

    return [...manualItems, ...proposalItems];
  }, [manualItems, proposals]);

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

  const handleAddItem = () => {
    setEditingItemId(null);
    resetNewItem();
    setCreateItemOpen(true);
  };

  const resetNewItem = () => {
    setNewItem({ service: '', description: '', hours: 0, pricePerHour: 0 });
  };

  const handleSaveItem = () => {
    if (!newItem.service.trim()) return;

    const item: ServiceRow = {
      id: editingItemId || crypto.randomUUID(),
      source: 'manual',
      proposalId: 'manual',
      proposalTitle: 'Item adicionado manualmente',
      recipientName: 'N/A',
      service: newItem.service.trim(),
      description: newItem.description.trim() || 'Sem descrição',
      hours: Number(newItem.hours || 0),
      pricePerHour: Number(newItem.pricePerHour || 0),
      total: Number(newItem.hours || 0) * Number(newItem.pricePerHour || 0),
    };

    if (editingItemId) {
      setManualItems((prev) => prev.map((existingItem) => (existingItem.id === editingItemId ? item : existingItem)));
      toast.success('Item atualizado com sucesso');
    } else {
      setManualItems((prev) => [item, ...prev]);
      toast.success('Item adicionado com sucesso');
    }

    setCreateItemOpen(false);
    setEditingItemId(null);
    resetNewItem();
  };

  const handleEditItem = (item: ServiceRow) => {
    if (item.source !== 'manual') {
      toast.info('Itens vinculados às propostas devem ser alterados na aba de propostas.');
      return;
    }

    setNewItem({
      service: item.service,
      description: item.description === 'Sem descrição' ? '' : item.description,
      hours: item.hours,
      pricePerHour: item.pricePerHour,
    });
    setEditingItemId(item.id);
    setCreateItemOpen(true);
  };

  const handleDeleteItem = (item: ServiceRow) => {
    if (item.source !== 'manual') {
      toast.info('Itens vinculados às propostas devem ser removidos na aba de propostas.');
      return;
    }

    setManualItems((prev) => prev.filter((existingItem) => existingItem.id !== item.id));
    toast.success('Item removido com sucesso');
  };

  return (
    <div className="space-y-6">
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

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por serviço/produto, proposta ou destinatário"
                className="pl-9"
              />
            </div>

            <Button onClick={handleAddItem}>
              <Plus className="mr-2 h-4 w-4" />
              Adicionar item
            </Button>
          </div>

          <Card>
            <CardContent className="pt-6">
              {loading ? (
                <p className="text-sm text-muted-foreground">Carregando serviços/produtos...</p>
              ) : filteredRows.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum serviço/produto encontrado.</p>
              ) : (
                <div className="space-y-3">
                  {filteredRows.map((row) => (
                    <div key={row.id} className="rounded-lg border p-4">
                      <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                        <h3 className="font-semibold">{row.service}</h3>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">
                            {row.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </span>
                          <Button variant="ghost" size="icon" onClick={() => handleEditItem(row)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteItem(row)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
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

      <Dialog open={createItemOpen} onOpenChange={setCreateItemOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar item de serviço</DialogTitle>
            <DialogDescription>
              Preencha os dados para incluir um novo item na listagem de serviços.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Serviço/Produto</Label>
              <Input
                value={newItem.service}
                onChange={(e) => setNewItem((prev) => ({ ...prev, service: e.target.value }))}
                placeholder="Ex: Consultoria mensal"
              />
            </div>

            <div className="space-y-2">
              <Label>Descrição</Label>
              <Input
                value={newItem.description}
                onChange={(e) => setNewItem((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Descrição resumida"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Horas</Label>
                <Input
                  type="number"
                  min={0}
                  value={newItem.hours || ''}
                  onChange={(e) => setNewItem((prev) => ({ ...prev, hours: Number(e.target.value) || 0 }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Preço/Hora (R$)</Label>
                <Input
                  type="number"
                  min={0}
                  value={newItem.pricePerHour || ''}
                  onChange={(e) => setNewItem((prev) => ({ ...prev, pricePerHour: Number(e.target.value) || 0 }))}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setCreateItemOpen(false); resetNewItem(); }}>
              Cancelar
            </Button>
            <Button onClick={handleSaveItem} disabled={!newItem.service.trim()}>
              {editingItemId ? 'Salvar alterações' : 'Adicionar item'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
