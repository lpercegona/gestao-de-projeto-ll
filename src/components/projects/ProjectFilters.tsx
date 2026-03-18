import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Filter, LayoutList, Columns3, ClipboardList, Plus, X, CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DateRange } from "react-day-picker";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface Client {
  id: string;
  name: string;
  company?: string | null;
}

interface ProjectStatusOption {
  value: string;
  label: string;
}

interface ProjectFiltersProps {
  projectCount: number;
  clients: Client[];
  projectStatusOptions: ProjectStatusOption[];
  selectedClientId: string;
  selectedStageId: string;
  dateRange: DateRange | undefined;
  onClientChange: (clientId: string) => void;
  onStageChange: (stageId: string) => void;
  onDateRangeChange: (range: DateRange | undefined) => void;
  pendingRequestsCount: number;
  showOnlyRequests: boolean;
  onShowOnlyRequestsChange: (value: boolean) => void;
  viewMode: "list" | "kanban" | "table";
  onViewModeChange: (mode: "list" | "kanban" | "table") => void;
  onAddProject: () => void;
  isAdminOrMaster: boolean;
  showClientFilter?: boolean;
  showRequestsFilter?: boolean;
  showViewToggle?: boolean;
  showAddButton?: boolean;
}

export const ProjectFilters: React.FC<ProjectFiltersProps> = ({
  projectCount,
  clients,
  projectStatusOptions,
  selectedClientId,
  selectedStageId,
  dateRange,
  onClientChange,
  onStageChange,
  onDateRangeChange,
  pendingRequestsCount,
  showOnlyRequests,
  onShowOnlyRequestsChange,
  viewMode,
  onViewModeChange,
  onAddProject,
  isAdminOrMaster,
  showClientFilter = true,
  showRequestsFilter = true,
  showViewToggle = true,
  showAddButton = isAdminOrMaster,
}) => {
  const [filterOpen, setFilterOpen] = useState(false);

  // Count active filters
  const activeFilters = [
    showClientFilter && selectedClientId !== "all" ? 1 : 0,
    selectedStageId !== "all" ? 1 : 0,
    dateRange?.from ? 1 : 0,
    showRequestsFilter && showOnlyRequests ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  const clearFilters = () => {
    if (showClientFilter) {
      onClientChange("all");
    }
    onStageChange("all");
    onDateRangeChange(undefined);
    if (showRequestsFilter) {
      onShowOnlyRequestsChange(false);
    }
  };

  const pendingRequestsLabel =
    pendingRequestsCount === 1 ? "1 solicitação pendente" : `${pendingRequestsCount} solicitações pendentes`;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      {/* Mobile: Line 1 - Filter, Toggle, Add | Desktop: All in one line */}
      <div className="block sm:hidden text-sm font-semibold text-foreground whitespace-nowrap">
        <span>
          {projectCount} {projectCount === 1 ? "projeto" : "projetos"}
        </span>
        {pendingRequestsCount > 0 && (
          <Badge
            variant={showOnlyRequests ? "default" : "outline"}
            className="ml-2 h-6 px-2 text-[10px] cursor-pointer"
            role="button"
            onClick={() => onShowOnlyRequestsChange(!showOnlyRequests)}
          >
            {pendingRequestsLabel}
          </Badge>
        )}
      </div>

      <div className="flex items-center justify-between sm:justify-start gap-3">
        {/* Desktop only */}
        <div className="hidden sm:flex items-center gap-2 text-sm font-semibold text-foreground whitespace-nowrap">
          <span>
            {projectCount} {projectCount === 1 ? "projeto" : "projetos"}
          </span>
          {pendingRequestsCount > 0 && (
            <Badge
              variant={showOnlyRequests ? "default" : "outline"}
              className="h-6 px-2 text-[10px] cursor-pointer"
              role="button"
              onClick={() => onShowOnlyRequestsChange(!showOnlyRequests)}
            >
              {pendingRequestsLabel}
            </Badge>
          )}
        </div>
        {/* Filter button */}
        <Popover open={filterOpen} onOpenChange={setFilterOpen}>
          <PopoverTrigger asChild>
            <Button
              title="Filtrar"
              variant="outline"
              size="icon"
              className={cn(
                "relative h-8 w-8 rounded-lg text-xs font-medium text-slate-500 bg-slate-100 border-0",
                "hover:bg-slate-200 hover:text-slate-500",
                activeFilters > 0 && "bg-slate-200",
              )}
            >
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
                    className="h-auto px-2 py-1 text-[0.6] text-muted-foreground"
                  >
                    Limpar filtros
                  </Button>
                )}
              </div>

              {/* Client filter */}
              {showClientFilter && (
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
              )}

              {/* Stage filter */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Etapa</Label>
                <Select value={selectedStageId} onValueChange={onStageChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Todas as etapas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as etapas</SelectItem>
                    {projectStatusOptions.map((statusOption) => (
                      <SelectItem key={statusOption.value} value={statusOption.value}>
                        {statusOption.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Requests filter */}
              {isAdminOrMaster && showRequestsFilter && (
                <div className="flex items-center justify-between rounded-md border p-3">
                  <Label htmlFor="show-only-requests" className="text-xs text-muted-foreground cursor-pointer">
                    solicitações
                  </Label>
                  <Checkbox
                    id="show-only-requests"
                    checked={showOnlyRequests}
                    onCheckedChange={(checked) => onShowOnlyRequestsChange(Boolean(checked))}
                  />
                </div>
              )}

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

        {activeFilters > 0 && (
          <button
            type="button"
            onClick={clearFilters}
            className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
          >
            Limpar filtro
          </button>
        )}

        {/* View toggle */}
        {showViewToggle && (
          <TooltipProvider delayDuration={0}>
            <ToggleGroup
              type="single"
              value={viewMode}
              onValueChange={(v) => v && onViewModeChange(v as "list" | "kanban" | "table")}
              className="inline-flex h-8 items-center justify-center rounded-lg bg-muted px-0.5 py-1 text-muted-foreground"
            >
              <Tooltip>
                <TooltipTrigger asChild>
                  <ToggleGroupItem
                    value="list"
                    aria-label="Visualização em cards"
                    variant="tab"
                    size="tb"
                    className="hover:bg-muted data-[state=on]:bg-background"
                  >
                    <LayoutList className={cn("w-3.5 h-3.5", viewMode === "list" && "mr-1.5")} />
                    {viewMode === "list" && "Cards"}
                  </ToggleGroupItem>
                </TooltipTrigger>
                <TooltipContent side="bottom">Cards</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <ToggleGroupItem
                    value="kanban"
                    aria-label="Visualização Kanban"
                    variant="tab"
                    size="tb"
                    className="hover:bg-muted data-[state=on]:bg-background"
                  >
                    <Columns3 className={cn("w-3.5 h-3.5", viewMode === "kanban" && "mr-1.5")} />
                    {viewMode === "kanban" && "Kanban"}
                  </ToggleGroupItem>
                </TooltipTrigger>
                <TooltipContent side="bottom">Kanban</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <ToggleGroupItem
                    value="table"
                    aria-label="Visualização em lista"
                    variant="tab"
                    size="tb"
                    className="hover:bg-muted data-[state=on]:bg-background"
                  >
                    <ClipboardList className={cn("w-3.5 h-3.5", viewMode === "table" && "mr-1.5")} />
                    {viewMode === "table" && "Lista"}
                  </ToggleGroupItem>
                </TooltipTrigger>
                <TooltipContent side="bottom">Lista</TooltipContent>
              </Tooltip>
            </ToggleGroup>
          </TooltipProvider>
        )}

        {/* Mobile only: Add button */}
        {showAddButton && (
          <Button onClick={onAddProject} size="icon" className="sm:hidden h-8 w-8 shrink-0 rounded-lg">
            <Plus className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>

      {/* Desktop only: Add button */}
      {showAddButton && (
        <Button onClick={onAddProject} size="icon" className="hidden sm:flex h-8 w-8 shrink-0 rounded-lg">
          <Plus className="w-3.5 h-3.5" />
        </Button>
      )}
    </div>
  );
};
