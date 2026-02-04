

## Plano: Ajustes Visuais no Menu e Cards

### Alteracoes Solicitadas

1. **Icones do menu** - Alterar para 12px (w-3 h-3)
2. **Largura do menu colapsado** - Ajustar proporcionalmente (de 16 para 12)
3. **Remover sombras dos cards** - Manter apenas bordas sutis
4. **Workspace no header** - Ajustar altura para alinhar com header fixo
5. **Menu colapsado** - Mostrar icone do workspace ao inves do simbolo Oras

---

### 1. Icones do Menu (12px)

**Arquivo:** `src/components/layout/AppLayout.tsx`

**Alteracoes:**
- Icones de navegacao: `w-5 h-5` → `w-3 h-3`
- Icones de configuracoes e logout: `w-5 h-5` → `w-3 h-3`

**Linhas afetadas:**
- Linha 352: `<item.icon className="w-5 h-5 flex-shrink-0" />`
- Linha 431: `<Settings className="w-5 h-5 flex-shrink-0" />`
- Linha 445, 460: `<Settings className="w-5 h-5" />`
- Linha 474, 483, 493: `<LogOut className="w-5 h-5" />` e `<LogOut className="w-4 h-4 mr-2" />`
- Linhas 310-313: Icones do collapse button

---

### 2. Largura do Menu Colapsado

**Arquivo:** `src/components/layout/AppLayout.tsx`

**Alteracao:**
- Sidebar colapsada: `lg:w-16` → `lg:w-12` (48px para acomodar icones de 12px)
- Header margin-left: `ml-16` → `ml-12`

**Linhas afetadas:**
- Linha 268: `isCollapsed ? "lg:w-16" : "lg:w-64"`
- Linha 93: `ml-16` no DesktopHeader

---

### 3. Remover Sombras dos Cards

**Arquivo:** `src/components/ui/card.tsx`

**Alteracao:**
```typescript
// Antes
className={cn("rounded-lg border bg-card text-card-foreground shadow-sm", className)}

// Depois
className={cn("rounded-lg border bg-card text-card-foreground", className)}
```

---

### 4. Workspace Alinhado com Header

**Arquivo:** `src/components/layout/AppLayout.tsx`

**Alteracao no container do workspace:**
```typescript
// Antes
<div className={cn(
  "relative p-4 border-b border-border flex-shrink-0",
  isCollapsed && "lg:px-2"
)}>

// Depois - altura fixa de 14 (h-14 = 56px, mesma do header)
<div className={cn(
  "relative h-14 flex items-center border-b border-border flex-shrink-0",
  isCollapsed ? "lg:px-2 lg:justify-center" : "px-4"
)}>
```

---

### 5. Menu Colapsado - Icone do Workspace

**Arquivo:** `src/components/layout/AppLayout.tsx`

**Alteracao:**
Quando colapsado, mostrar Avatar do workspace (com iniciais) ao inves do simbolo Oras

```typescript
// Antes (linha 283-286)
{isCollapsed ? (
  <div className="flex items-center justify-center">
    <img src={SimboloOras} alt="ORAS" className="h-8 w-8" />
  </div>
) : (

// Depois
{isCollapsed ? (
  <WorkspaceSelector isCollapsed={isCollapsed} />
) : (
```

**Arquivo:** `src/components/layout/WorkspaceSelector.tsx`

**Ajustar para modo colapsado mostrar apenas o Avatar:**
```typescript
// Avatar menor quando colapsado
<Avatar className={cn("shrink-0", isCollapsed ? "h-7 w-7" : "h-8 w-8")}>
```

---

### Resumo Visual

**Antes:**
```text
┌────────────────┐
│ [Simbolo Oras] │  ← Menu colapsado (w-16)
├────────────────┤
│ [🏠] Painel    │  ← Icone 20px
│ [👥] Clientes  │
└────────────────┘
```

**Depois:**
```text
┌────────────┐
│    [A]     │  ← Avatar do workspace (w-12)
├────────────┤
│ [🏠]       │  ← Icone 12px
│ [👥]       │
└────────────┘
```

---

### Arquivos a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `src/components/ui/card.tsx` | Remover `shadow-sm` |
| `src/components/layout/AppLayout.tsx` | Icones 12px, sidebar w-12, header ml-12, workspace height |
| `src/components/layout/WorkspaceSelector.tsx` | Avatar responsivo para modo colapsado |
| `src/lib/design-tokens.ts` | Atualizar ICON_SIZES.md para 12px |

---

### Secao Tecnica

**Tamanho dos icones:**
- 12px = `w-3 h-3` (0.75rem)
- Sidebar colapsada: 48px = `w-12` (3rem)
- Header altura: 56px = `h-14` (3.5rem)

**Card sem sombra:**
```css
.card {
  border-radius: 0.5rem;
  border: 1px solid hsl(var(--border));
  background: hsl(var(--card));
  /* sem shadow */
}
```

**WorkspaceSelector colapsado:**
```typescript
export const WorkspaceSelector: React.FC<WorkspaceSelectorProps> = ({ isCollapsed = false }) => {
  // ...
  
  if (isCollapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" className="p-1">
            <Avatar className="h-7 w-7">
              <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                {getInitials()}
              </AvatarFallback>
            </Avatar>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right">{getWorkspaceName()}</TooltipContent>
      </Tooltip>
    );
  }
  
  return (
    <DropdownMenu>
      {/* versao expandida */}
    </DropdownMenu>
  );
};
```

