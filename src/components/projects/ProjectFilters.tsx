import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { Filter, LayoutList, Columns3, Plus, X, CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DateRange } from "react-day-picker";

interface Client {
  id: string;
  name: string;
  company?: string | null;
}

interface KanbanStage {
  id: string;
  name: string;
  color: string | null;
  order_position: number;
}

interface ProjectFiltersProps {
  projectCount: number;
  clients: Client[];
  kanbanStages: KanbanStage[];
  selectedClientId: string;
  selectedStageId: string;
  dateRange: DateRange | undefined;
  onClientChange: (clientId: string) => void;
  onStageChange: (stageId: string) => void;
  onDateRangeChange: (range: DateRange | undefined) => void;
  viewMode: "list" | "kanban";
  onViewModeChange: (mode: "list" | "kanban") => void;
  onAddProject: () => void;
  isAdminOrMaster: boolean;
}

export const ProjectFilters: React.FC<ProjectFiltersProps> = ({
  projectCount,
  clients,
  kanbanStages,
  selectedClientId,
  selectedStageId,
  dateRange,
  onClientChange,
  onStageChange,
  onDateRangeChange,
  viewMode,
  onViewModeChange,
  onAddProject,
  isAdminOrMaster,
}) => {
  const [filterOpen, setFilterOpen] = useState(false);

  // Count active filters
  const activeFilters = [
    selectedClientId !== "all" ? 1 : 0,
    selectedStageId !== "all" ? 1 : 0,
    dateRange?.from ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  const clearFilters = () => {
    onClientChange("all");
    onStageChange("all");
    onDateRangeChange(undefined);
  };

  return (
    <div className="flex items-center justify-between gap-4 flex-wrap">
      {/* Left: Project count + Filter button + View toggle */}
      <div className="flex items-center gap-3">
        {/* Project count */}
        <span className="text-lg font-semibold text-foreground whitespace-nowrap">
          {projectCount} {projectCount === 1 ? "projeto" : "projetos"}
        </span>

        {/* Filter button */}
        <Popover open={filterOpen} onOpenChange={setFilterOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="icon" className={cn("relative h-8 w-8 rounded-lg text-xs font-medium text-slate-500 bg-slate-100 border-0", "hover:bg-slate-200 hover:text-slate-500", activeFilters > 0 && "bg-slate-200")}>
              <Filter className="w-3.5 h-3.5" />
              {activeFilters > 0 && (
                <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-[10px]">
                  {activeFilters}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-4" align="start">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-sm">Filtros</h4>
                {activeFilters > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    className="h-auto px-2 py-1 text-xs text-muted-foreground"
                  >
                    Limpar filtros
                  </Button>
                )}
              </div>

              {/* Client filter */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Cliente</Label>
                <Select value={selectedClientId} onValueChange={onClientChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Todos os clientes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os clientes</SelectItem>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.company || client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Stage filter */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Etapa</Label>
                <Select value={selectedStageId} onValueChange={onStageChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Todas as etapas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as etapas</SelectItem>
                    {kanbanStages.map((stage) => (
                      <SelectItem key={stage.id} value={stage.id}>
                        <div className="flex items-center gap-2">
                          {stage.color && (
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: stage.color }} />
                          )}
                          {stage.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Date range filter */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Período</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !dateRange?.from && "text-muted-foreground",
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange?.from ? (
                        dateRange.to ? (
                          <>
                            {format(dateRange.from, "dd/MM/yy", { locale: ptBR })} -{" "}
                            {format(dateRange.to, "dd/MM/yy", { locale: ptBR })}
                          </>
                        ) : (
                          format(dateRange.from, "dd/MM/yyyy", { locale: ptBR })
                        )
                      ) : (
                        <span>Selecionar período</span>
                      )}
                      {dateRange?.from && (
                        <X
                          className="ml-auto h-4 w-4 hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDateRangeChange(undefined);
                          }}
                        />
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      initialFocus
                      mode="range"
                      defaultMonth={dateRange?.from}
                      selected={dateRange}
                      onSelect={onDateRangeChange}
                      numberOfMonths={2}
                      locale={ptBR}
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* View toggle */}
        <ToggleGroup
          type="single"
          value={viewMode}
          onValueChange={(v) => v && onViewModeChange(v as "list" | "kanban")}
          className="rounded-full p-1 bg-[#f1f5f9]"
        >
          <ToggleGroupItem
            value="list"
            aria-label="Visualização em lista"
            className={cn("px-3 h-8 text-[#64748b] rounded-full data-[state=on]:bg-[#e2e8f0] data-[state=on]:shadow-none")}
          >
            <LayoutList className="w-4 h-4 mr-2" />
            Lista
          </ToggleGroupItem>
          <ToggleGroupItem
            value="kanban"
            aria-label="Visualização Kanban"
            className={cn("px-3 h-8 text-[#64748b] rounded-full data-[state=on]:bg-[#e2e8f0] data-[state=on]:shadow-none")}
          >
            <Columns3 className="w-4 h-4 mr-2" />
            Kanban
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* Right: Add button */}
      {isAdminOrMaster && (
        <Button onClick={onAddProject} size="icon" className="h-8 w-8 shrink-0">
          <Plus className="w-3.5 h-3.5" />
        </Button>
      )}
    </div>
  );
};
