import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Layers3, ShoppingCart, X, Check } from 'lucide-react';
import { toast } from 'sonner';

interface ServiceItem {
  id: string;
  service: string;
  description: string;
  hours: number;
  pricePerHour: number;
  imageUrl?: string;
  image?: string;
  billingType?: 'unique' | 'monthly';
}

interface DisplayService {
  id: string;
  service: string;
  description: string;
  hours: number;
  pricePerHour: number;
  total: number;
  imageUrl?: string;
  billingType: 'unique' | 'monthly';
}

export const ClientServices: React.FC = () => {
  const { user } = useAuth();
  const [services, setServices] = useState<DisplayService[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) return;

    const fetchServices = async () => {
      setLoading(true);
      try {
        // Get client record for this user
        const { data: cuData } = await supabase
          .from('client_users')
          .select('client_id')
          .eq('user_id', user.id)
          .maybeSingle();

        let clientId = cuData?.client_id;

        if (!clientId) {
          const { data: clientData } = await supabase
            .from('clients')
            .select('id')
            .eq('user_id', user.id)
            .maybeSingle();
          clientId = clientData?.id;
        }

        if (!clientId) {
          setLoading(false);
          return;
        }

        // Fetch proposals linked to this client with items
        const { data: proposals } = await supabase
          .from('proposals')
          .select('id, items')
          .eq('client_id', clientId)
          .in('status', ['sent', 'accepted', 'viewed']);

        if (!proposals?.length) {
          setLoading(false);
          return;
        }

        const catalogMap = new Map<string, DisplayService>();

        proposals.forEach((proposal) => {
          const items = (proposal.items as unknown as ServiceItem[]) || [];
          items
            .filter((item) => item.service?.trim())
            .forEach((item, index) => {
              const itemId = item.id || `${proposal.id}-${index}`;
              if (catalogMap.has(itemId)) return;

              catalogMap.set(itemId, {
                id: itemId,
                service: item.service,
                description: item.description || '',
                hours: Number(item.hours || 0),
                pricePerHour: Number(item.pricePerHour || 0),
                total: Number(item.hours || 0) * Number(item.pricePerHour || 0),
                imageUrl: item.imageUrl || item.image,
                billingType: item.billingType || 'unique',
              });
            });
        });

        setServices(Array.from(catalogMap.values()));
      } catch (error) {
        console.error('Erro ao carregar serviços:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchServices();
  }, [user]);

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectedServices = useMemo(
    () => services.filter((s) => selectedIds.has(s.id)),
    [services, selectedIds]
  );

  const selectedTotal = useMemo(
    () => selectedServices.reduce((sum, s) => sum + s.total, 0),
    [selectedServices]
  );

  const handleRequestContract = () => {
    toast.info('Método de pagamento será configurado em breve.');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-muted-foreground">Carregando serviços...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-32">
      <div className="flex items-center gap-3">
        <Layers3 className="h-5 w-5 text-muted-foreground" />
        <h1 className="text-lg font-semibold">Serviços disponíveis</h1>
      </div>

      {services.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nenhum serviço disponível no momento.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service) => {
            const isSelected = selectedIds.has(service.id);
            return (
              <Card
                key={service.id}
                className={`flex flex-col overflow-hidden transition-shadow ${
                  isSelected ? 'ring-2 ring-primary shadow-md' : ''
                }`}
              >
                <div className="w-full">
                  {service.imageUrl ? (
                    <img
                      src={service.imageUrl}
                      alt={service.service}
                      className="aspect-[4/3] w-full object-cover"
                    />
                  ) : (
                    <div className="flex aspect-[4/3] w-full items-center justify-center border-b border-dashed text-xs text-muted-foreground">
                      Sem imagem
                    </div>
                  )}
                </div>

                <CardContent className="flex flex-1 flex-col gap-3 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-sm">{service.service}</h3>
                        <Badge variant="outline" className="text-[10px]">
                          {service.billingType === 'monthly' ? 'Mensal' : 'Único'}
                        </Badge>
                      </div>
                      <p className="text-lg font-bold text-foreground">
                        {service.total.toLocaleString('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        })}
                      </p>
                    </div>
                  </div>

                  {service.description && (
                    <p className="text-xs text-muted-foreground line-clamp-3">
                      {service.description}
                    </p>
                  )}

                  <div className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">Horas:</span>{' '}
                    {service.hours}h
                  </div>

                  <div className="mt-auto pt-2">
                    <Button
                      variant={isSelected ? 'default' : 'outline'}
                      size="sm"
                      className="w-full"
                      onClick={() => toggleSelection(service.id)}
                    >
                      {isSelected ? (
                        <>
                          <Check className="mr-1.5 h-3.5 w-3.5" />
                          Selecionado
                        </>
                      ) : (
                        'Selecionar'
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Floating cart summary */}
      {selectedServices.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t bg-card p-4 shadow-lg lg:left-64">
          <div className="mx-auto flex max-w-4xl items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              <div className="text-sm">
                <span className="font-semibold">{selectedServices.length}</span>{' '}
                {selectedServices.length === 1 ? 'serviço selecionado' : 'serviços selecionados'}
                <span className="mx-2 text-muted-foreground">·</span>
                <span className="font-bold">
                  {selectedTotal.toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  })}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedIds(new Set())}
              >
                <X className="mr-1 h-3.5 w-3.5" />
                Limpar
              </Button>
              <Button size="sm" onClick={handleRequestContract}>
                Solicitar contratação
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
