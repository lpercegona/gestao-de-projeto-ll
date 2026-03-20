import React, { useEffect, useMemo, useState } from 'react';
import { useEditingLock } from '@/hooks/useEditingLock';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Json } from '@/integrations/supabase/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Proposals } from '@/pages/Proposals';
import { Contracts } from '@/pages/Contracts';
import { PortfolioTab } from '@/components/services/PortfolioTab';
import { Layers3, Search, Plus, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle } from
'@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger } from
'@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue } from
'@/components/ui/select';

type BillingType = 'unique' | 'monthly';

interface ProposalItem {
  id: string;
  catalogItemId?: string;
  service: string;
  description: string;
  hours: number;
  pricePerHour: number;
  imageUrl?: string;
  image?: string;
  billingType?: BillingType;
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
  source: 'manual' | 'proposal' | 'mixed';
  proposalId?: string;
  proposalTitle?: string;
  recipientName?: string;
  service: string;
  description: string;
  hours: number;
  pricePerHour: number;
  total: number;
  imageUrl?: string;
  billingType: BillingType;
  isActive: boolean;
}

type ServicesTab = 'services' | 'proposals' | 'contracts' | 'portfolio';

const tabByPath: Record<string, ServicesTab> = {
  '/services': 'services',
  '/proposals': 'proposals',
  '/contracts': 'contracts',
  '/portfolio': 'portfolio'
};

export const Services: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [proposals, setProposals] = useState<ProposalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [createItemOpen, setCreateItemOpen] = useState(false);
  const [catalogItems, setCatalogItems] = useState<ServiceRow[]>([]);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  useEditingLock(createItemOpen || editingItemId !== null);
  const [newItem, setNewItem] = useState({
    service: '',
    description: '',
    hours: 0,
    pricePerHour: 0,
    imageUrl: '',
    billingType: 'unique' as BillingType
  });
  const [savingItem, setSavingItem] = useState(false);

  const activeTab = tabByPath[location.pathname] || 'services';

  // Fetch catalog items from database + migrate localStorage if needed
  useEffect(() => {
    if (!user) return;
    const fetchCatalog = async () => {
      const { data, error } = await supabase
        .from('service_catalog')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao carregar catálogo:', error);
        return;
      }

      // Auto-migrate localStorage items if catalog is empty
      if ((!data || data.length === 0)) {
        const lsKey = `services:manual-items:${user.id}`;
        const raw = localStorage.getItem(lsKey);
        if (raw) {
          try {
            const localItems = JSON.parse(raw) as Array<{
              id?: string;
              service: string;
              description?: string;
              hours?: number;
              pricePerHour?: number;
              imageUrl?: string;
              image?: string;
              billingType?: string;
            }>;

            if (localItems.length > 0) {
              const rows = localItems.map((item) => ({
                owner_id: user.id,
                service: item.service || 'Sem título',
                description: item.description || '',
                hours: Number(item.hours || 0),
                price_per_hour: Number(item.pricePerHour || 0),
                image_url: item.imageUrl || item.image || null,
                billing_type: item.billingType || 'unique',
              }));

              const { data: inserted, error: insertError } = await supabase
                .from('service_catalog')
                .insert(rows)
                .select();

              if (!insertError && inserted) {
                localStorage.removeItem(lsKey);
                setCatalogItems(
                  inserted.map((item) => ({
                    id: item.id,
                    source: 'manual' as const,
                    service: item.service,
                    description: item.description || '',
                    hours: Number(item.hours || 0),
                    pricePerHour: Number(item.price_per_hour || 0),
                    total: Number(item.hours || 0) * Number(item.price_per_hour || 0),
                    imageUrl: item.image_url || undefined,
                    billingType: (item.billing_type || 'unique') as BillingType,
                    isActive: item.is_active,
                  }))
                );
                toast.success(`${inserted.length} item(ns) migrado(s) do armazenamento local`);
                return;
              } else {
                console.error('Erro na migração localStorage:', insertError);
              }
            }
          } catch (e) {
            console.error('Erro ao parsear localStorage:', e);
          }
        }
      }

      setCatalogItems(
        (data || []).map((item) => ({
          id: item.id,
          source: 'manual' as const,
          service: item.service,
          description: item.description || '',
          hours: Number(item.hours || 0),
          pricePerHour: Number(item.price_per_hour || 0),
          total: Number(item.hours || 0) * Number(item.price_per_hour || 0),
          imageUrl: item.image_url || undefined,
          billingType: (item.billing_type || 'unique') as BillingType,
          isActive: item.is_active,
        }))
      );
    };
    fetchCatalog();
  }, [user]);

  useEffect(() => {
    const fetchProposals = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.
        from('proposals').
        select('id, title, recipient_name, status, created_at, items').
        order('created_at', { ascending: false });

        if (error) throw error;

        setProposals(
          (data || []).map((proposal) => ({
            ...proposal,
            items: proposal.items as unknown as ProposalItem[] || []
          }))
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
    const catalogMap = new Map<string, ServiceRow>();

    catalogItems.forEach((item) => {
      catalogMap.set(item.id, { ...item, source: 'manual' });
    });

    proposals.forEach((proposal) => {
      proposal.items.
      filter((item) => item.service?.trim() || item.description?.trim()).
      forEach((item, index) => {
        const catalogId = item.catalogItemId || item.id || `${proposal.id}-${index}`;
        const existing = catalogMap.get(catalogId);

        if (existing) {
          catalogMap.set(catalogId, {
            ...existing,
            source: existing.source === 'manual' ? 'mixed' : 'proposal'
          });
          return;
        }

        catalogMap.set(catalogId, {
          id: catalogId,
          source: 'proposal',
          proposalId: proposal.id,
          proposalTitle: proposal.title,
          recipientName: proposal.recipient_name,
          service: item.service || 'Sem título',
          description: item.description || 'Sem descrição',
          hours: Number(item.hours || 0),
          pricePerHour: Number(item.pricePerHour || 0),
          total: Number(item.hours || 0) * Number(item.pricePerHour || 0),
          imageUrl: item.imageUrl || item.image,
          billingType: item.billingType || 'unique',
          isActive: true,
        });
      });
    });

    return Array.from(catalogMap.values());
  }, [catalogItems, proposals]);

  const filteredRows = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    if (!term) return serviceRows;

    return serviceRows.filter((row) =>
    [row.service, row.description, row.proposalTitle, row.recipientName].some((value) =>
    value?.toLowerCase().includes(term)
    )
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
    setNewItem({ service: '', description: '', hours: 0, pricePerHour: 0, imageUrl: '', billingType: 'unique' });
  };

  const handleSaveItem = async () => {
    if (!newItem.service.trim() || !user) return;
    setSavingItem(true);

    try {
      if (editingItemId) {
        // Check if it's a catalog item (exists in catalogItems)
        const isCatalogItem = catalogItems.some((item) => item.id === editingItemId);

        if (isCatalogItem) {
          const { error } = await supabase
            .from('service_catalog')
            .update({
              service: newItem.service.trim(),
              description: newItem.description.trim() || '',
              hours: Number(newItem.hours || 0),
              price_per_hour: Number(newItem.pricePerHour || 0),
              image_url: newItem.imageUrl || null,
              billing_type: newItem.billingType,
              updated_at: new Date().toISOString(),
            })
            .eq('id', editingItemId);

          if (error) throw error;

          setCatalogItems((prev) =>
            prev.map((item) =>
              item.id === editingItemId
                ? {
                    ...item,
                    service: newItem.service.trim(),
                    description: newItem.description.trim() || '',
                    hours: Number(newItem.hours || 0),
                    pricePerHour: Number(newItem.pricePerHour || 0),
                    total: Number(newItem.hours || 0) * Number(newItem.pricePerHour || 0),
                    imageUrl: newItem.imageUrl || undefined,
                    billingType: newItem.billingType,
                  }
                : item
            )
          );
        } else {
          // It's a proposal-only item being "adopted" into catalog
          const { data, error } = await supabase
            .from('service_catalog')
            .insert({
              owner_id: user.id,
              service: newItem.service.trim(),
              description: newItem.description.trim() || '',
              hours: Number(newItem.hours || 0),
              price_per_hour: Number(newItem.pricePerHour || 0),
              image_url: newItem.imageUrl || null,
              billing_type: newItem.billingType,
            })
            .select()
            .single();

          if (error) throw error;

          setCatalogItems((prev) => [
            {
              id: data.id,
              source: 'manual',
              service: data.service,
              description: data.description || '',
              hours: Number(data.hours || 0),
              pricePerHour: Number(data.price_per_hour || 0),
              total: Number(data.hours || 0) * Number(data.price_per_hour || 0),
              imageUrl: data.image_url || undefined,
              billingType: (data.billing_type || 'unique') as BillingType,
              isActive: data.is_active,
            },
            ...prev,
          ]);
        }

        // Sync with draft proposals
        const draftProposalsToUpdate = proposals.filter(
          (proposal) =>
          proposal.status === 'draft' &&
          proposal.items.some((proposalItem) => (proposalItem.catalogItemId || proposalItem.id) === editingItemId)
        );

        if (draftProposalsToUpdate.length > 0) {
          await Promise.all(
            draftProposalsToUpdate.map(async (proposal) => {
              const updatedItems = proposal.items.map((proposalItem) => {
                const itemCatalogId = proposalItem.catalogItemId || proposalItem.id;
                if (itemCatalogId !== editingItemId) return proposalItem;
                return {
                  ...proposalItem,
                  catalogItemId: editingItemId,
                  service: newItem.service.trim(),
                  description: newItem.description.trim(),
                  hours: Number(newItem.hours || 0),
                  pricePerHour: Number(newItem.pricePerHour || 0),
                  imageUrl: newItem.imageUrl,
                  billingType: newItem.billingType
                };
              });

              const totalHours = updatedItems.reduce((sum, currentItem) => sum + Number(currentItem.hours || 0), 0);
              const totalValue = updatedItems.reduce(
                (sum, currentItem) => sum + Number(currentItem.hours || 0) * Number(currentItem.pricePerHour || 0),
                0
              );

              const { error } = await supabase
                .from('proposals')
                .update({
                  items: updatedItems as unknown as Json,
                  total_hours: totalHours,
                  total_value: totalValue
                })
                .eq('id', proposal.id)
                .eq('status', 'draft');

              if (error) throw error;
            })
          );

          setProposals((prev) =>
            prev.map((proposal) => {
              if (proposal.status !== 'draft') return proposal;
              return {
                ...proposal,
                items: proposal.items.map((proposalItem) => {
                  const itemCatalogId = proposalItem.catalogItemId || proposalItem.id;
                  if (itemCatalogId !== editingItemId) return proposalItem;
                  return {
                    ...proposalItem,
                    catalogItemId: editingItemId,
                    service: newItem.service.trim(),
                    description: newItem.description.trim(),
                    hours: Number(newItem.hours || 0),
                    pricePerHour: Number(newItem.pricePerHour || 0),
                    imageUrl: newItem.imageUrl,
                    billingType: newItem.billingType
                  };
                })
              };
            })
          );
        }

        toast.success('Item atualizado com sucesso');
      } else {
        // Create new item
        const { data, error } = await supabase
          .from('service_catalog')
          .insert({
            owner_id: user.id,
            service: newItem.service.trim(),
            description: newItem.description.trim() || '',
            hours: Number(newItem.hours || 0),
            price_per_hour: Number(newItem.pricePerHour || 0),
            image_url: newItem.imageUrl || null,
            billing_type: newItem.billingType,
          })
          .select()
          .single();

        if (error) throw error;

        setCatalogItems((prev) => [
          {
            id: data.id,
            source: 'manual',
            service: data.service,
            description: data.description || '',
            hours: Number(data.hours || 0),
            pricePerHour: Number(data.price_per_hour || 0),
            total: Number(data.hours || 0) * Number(data.price_per_hour || 0),
            imageUrl: data.image_url || undefined,
            billingType: (data.billing_type || 'unique') as BillingType,
            isActive: data.is_active,
          },
          ...prev,
        ]);

        toast.success('Item adicionado com sucesso');
      }
    } catch (error) {
      console.error('Erro ao salvar item:', error);
      toast.error('Erro ao salvar item de serviço');
    } finally {
      setSavingItem(false);
      setCreateItemOpen(false);
      setEditingItemId(null);
      resetNewItem();
    }
  };

  const handleImageChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Selecione um arquivo de imagem válido.');
      return;
    }

    // Upload to storage
    const fileExt = file.name.split('.').pop();
    const filePath = `${user.id}/${crypto.randomUUID()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('proposal-images')
      .upload(filePath, file);

    if (uploadError) {
      console.error('Erro ao fazer upload:', uploadError);
      toast.error('Erro ao fazer upload da imagem');
      return;
    }

    const { data: urlData } = supabase.storage
      .from('proposal-images')
      .getPublicUrl(filePath);

    setNewItem((prev) => ({ ...prev, imageUrl: urlData.publicUrl }));
  };

  const handleEditItem = (item: ServiceRow) => {
    setNewItem({
      service: item.service,
      description: item.description === 'Sem descrição' ? '' : item.description,
      hours: item.hours,
      pricePerHour: item.pricePerHour,
      imageUrl: item.imageUrl || '',
      billingType: item.billingType || 'unique'
    });
    setEditingItemId(item.id);
    setCreateItemOpen(true);
  };

  const handleDeleteItem = async (item: ServiceRow) => {
    if (item.source === 'proposal') {
      toast.info('A exclusão de itens vinculados a propostas ainda deve ser feita na proposta.');
      return;
    }

    try {
      const { error } = await supabase
        .from('service_catalog')
        .delete()
        .eq('id', item.id);

      if (error) throw error;

      setCatalogItems((prev) => prev.filter((existingItem) => existingItem.id !== item.id));
      toast.success('Item removido com sucesso');
    } catch (error) {
      console.error('Erro ao excluir item:', error);
      toast.error('Erro ao excluir item');
    }
  };

  const handleToggleActive = async (row: ServiceRow) => {
    const isCatalogItem = catalogItems.some((item) => item.id === row.id);
    if (!isCatalogItem) {
      toast.info('Apenas itens do catálogo podem ser ocultados.');
      return;
    }
    const newActive = !row.isActive;
    try {
      const { error } = await supabase
        .from('service_catalog')
        .update({ is_active: newActive })
        .eq('id', row.id);
      if (error) throw error;
      setCatalogItems((prev) =>
        prev.map((item) => item.id === row.id ? { ...item, isActive: newActive } : item)
      );
      toast.success(newActive ? 'Serviço apresentado' : 'Serviço ocultado');
    } catch (error) {
      console.error('Erro ao alterar visibilidade:', error);
      toast.error('Erro ao alterar visibilidade');
    }
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="services">Serviços</TabsTrigger>
          <TabsTrigger value="proposals">Propostas</TabsTrigger>
          <TabsTrigger value="contracts">Contratos</TabsTrigger>
          <TabsTrigger value="portfolio">Portfólio</TabsTrigger>
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
                className="pl-9" />
            </div>

            <Button onClick={handleAddItem}>
              <Plus className="mr-2 h-4 w-4" />
              Adicionar item
            </Button>
          </div>

          <Card className="border-0">
            <CardContent className="p-0 border-0">
              {loading ?
              <p className="text-sm text-muted-foreground">Carregando serviços/produtos...</p> :
              filteredRows.length === 0 ?
              <p className="text-sm text-muted-foreground">Nenhum serviço/produto encontrado.</p> :

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 bg-secondary">
                {filteredRows.map((row) =>
                <div key={row.id} className={`flex flex-col overflow-hidden rounded-md border bg-card ${row.isActive === false ? 'opacity-60' : ''}`}>
                        <div className="w-full">
                          {row.imageUrl ?
                    <img
                      src={row.imageUrl}
                      alt={`Imagem de ${row.service}`}
                      className="aspect-[4/3] w-full object-cover" /> :

                    <div className="flex aspect-[4/3] w-full items-center justify-center border-b border-dashed text-xs text-muted-foreground">
                              Sem imagem
                            </div>
                    }
                        </div>

                        <div className="space-y-3 p-4">
                          <div className="flex items-start justify-between gap-2">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold">{row.service}</h3>
                                <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                                  {row.billingType === 'monthly' ? 'Mensal' : 'Único'}
                                </span>
                              </div>
                              <span className="text-sm text-muted-foreground">
                                {row.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                              </span>
                            </div>

                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleEditItem(row)}>
                                  Editar
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleToggleActive(row)}>
                                  {row.isActive === false ? 'Apresentar' : 'Ocultar'}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => handleDeleteItem(row)}>
                                  Excluir
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>

                          <p className="text-sm text-muted-foreground">{row.description}</p>
                          <div className="mt-2 text-xs text-muted-foreground">
                            <span className="font-medium text-foreground">Quantidade de horas:</span> {row.hours}h
                          </div>
                        </div>
                  </div>
                )}
              </div>
              }
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="proposals" className="space-y-4">
          <Proposals />
        </TabsContent>

        <TabsContent value="contracts" className="space-y-4">
          <Contracts />
        </TabsContent>

        <TabsContent value="portfolio" className="space-y-4">
          <PortfolioTab />
        </TabsContent>
      </Tabs>

      <Dialog open={createItemOpen} onOpenChange={setCreateItemOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingItemId ? 'Editar item de serviço' : 'Adicionar item de serviço'}</DialogTitle>
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
                placeholder="Ex: Consultoria mensal" />
            </div>

            <div className="space-y-2">
              <Label>Descrição</Label>
              <Input
                value={newItem.description}
                onChange={(e) => setNewItem((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Descrição resumida" />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Horas</Label>
                <Input
                  type="number"
                  min={0}
                  value={newItem.hours || ''}
                  onChange={(e) => setNewItem((prev) => ({ ...prev, hours: Number(e.target.value) || 0 }))} />
              </div>
              <div className="space-y-2">
                <Label>Preço/Hora (R$)</Label>
                <Input
                  type="number"
                  min={0}
                  value={newItem.pricePerHour || ''}
                  onChange={(e) => setNewItem((prev) => ({ ...prev, pricePerHour: Number(e.target.value) || 0 }))} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Tipo de cobrança</Label>
              <Select
                value={newItem.billingType}
                onValueChange={(value) => setNewItem((prev) => ({ ...prev, billingType: value as BillingType }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unique">Único</SelectItem>
                  <SelectItem value="monthly">Mensal</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Imagem do item</Label>
              <Input type="file" accept="image/*" onChange={handleImageChange} />
              {newItem.imageUrl ?
              <div className="space-y-2">
                  <img src={newItem.imageUrl} alt="Pré-visualização da imagem do item" className="h-24 w-24 rounded-md border object-cover" />
                  <Button variant="outline" size="sm" onClick={() => setNewItem((prev) => ({ ...prev, imageUrl: '' }))}>
                    Remover imagem
                  </Button>
                </div> :
              null}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {setCreateItemOpen(false);resetNewItem();}}>
              Cancelar
            </Button>
            <Button onClick={handleSaveItem} disabled={!newItem.service.trim() || savingItem}>
              {savingItem ? 'Salvando...' : editingItemId ? 'Salvar alterações' : 'Adicionar item'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>);

};
