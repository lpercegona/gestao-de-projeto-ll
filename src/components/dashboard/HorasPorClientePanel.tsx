import React, { useState } from 'react';
import { Users, ChevronDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { useData } from '@/contexts/DataContext';
import { formatHours } from '@/lib/formatHours';

export const HorasPorClientePanel: React.FC = () => {
  const [isOpen, setIsOpen] = useState(true);
  const { data, getClientHours, getClientMonthlyHours, getClientPreviousMonthOverflow } = useData();

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors rounded-t-lg pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Users className="h-4 w-4" />
                Horas por Cliente
              </CardTitle>
              <ChevronDown className={cn(
                "h-4 w-4 text-muted-foreground transition-transform",
                isOpen && "rotate-180"
              )} />
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0">
            {data.clients.length === 0 ? (
              <p className="text-muted-foreground text-sm">Nenhum cliente cadastrado ainda.</p>
            ) : (
              <ul className="space-y-3">
                {data.clients.slice(0, 5).map((client) => {
                  const isMonthly = (client as any).contract_type === 'monthly';
                  const totalUsedHours = getClientHours(client.id);
                  const monthlyUsedHours = getClientMonthlyHours(client.id);
                  const previousOverflow = isMonthly ? getClientPreviousMonthOverflow(client.id) : 0;
                  const availableHours = isMonthly ? Math.max(0, client.contracted_hours - previousOverflow) : client.contracted_hours;
                  const displayedHours = isMonthly ? monthlyUsedHours : totalUsedHours;
                  const percentage = availableHours > 0 
                    ? Math.min((displayedHours / availableHours) * 100, 100)
                    : 0;
                  
                  return (
                    <li key={client.id} className="py-2 border-b border-border last:border-0">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-1 gap-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap min-w-0">
                          <span className="font-medium text-foreground text-sm truncate">
                            {(client as any).company || client.name}
                          </span>
                          {isMonthly && (
                            <Badge variant="outline" className="text-xs shrink-0">Mensal</Badge>
                          )}
                          {isMonthly && previousOverflow > 0 && (
                            <Badge variant="secondary" className="text-xs shrink-0">
                              Saldo: {formatHours(previousOverflow)}
                            </Badge>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground sm:shrink-0 sm:ml-2">
                          {formatHours(displayedHours)} / {formatHours(availableHours)}
                        </span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className={cn(
                            "h-2 rounded-full transition-all",
                            percentage >= 100 ? "bg-destructive" : 
                            percentage >= 80 ? "bg-muted-foreground" : "bg-primary"
                          )}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};
