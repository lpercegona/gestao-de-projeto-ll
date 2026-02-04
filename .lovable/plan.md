

## Plano: Corrigir Consistência de Ícones e Botões no Sidebar Colapsado

### Problema

Quando o sidebar está colapsado (48px de largura), os ícones, botões e avatares têm dimensões inconsistentes, causando desalinhamento visual.

### Análise das Inconsistências

| Elemento | Atual | Problema |
|----------|-------|----------|
| Nav items (colapsado) | `lg:px-2 py-2.5` | Sem dimensão fixa |
| WorkspaceSelector avatar | `h-7 w-7` (28px) | Diferente do avatar do usuário |
| Avatar do usuário | `h-9 w-9` (36px) | Muito grande para 48px |
| Botão Settings (colapsado) | `lg:px-2 py-2.5` | Sem dimensão fixa |
| Botão Logout (colapsado) | `px-2` | Sem dimensão fixa |

### Solução

Padronizar todos os elementos clicáveis para **32px x 32px** (h-8 w-8) quando colapsado:
- Deixa 8px de margem em cada lado no sidebar de 48px
- Centraliza perfeitamente os ícones
- Mantém área de clique confortável

---

### Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/components/layout/AppLayout.tsx` | Ajustar dimensões dos nav items, avatar, settings e logout |
| `src/components/layout/WorkspaceSelector.tsx` | Padronizar botão/avatar colapsado |
| `src/lib/design-tokens.ts` | Adicionar token para botão colapsado |

---

### 1. Adicionar Tokens de Design (design-tokens.ts)

```typescript
export const SIDEBAR_COLLAPSED = {
  itemSize: 'h-8 w-8',           // 32px - tamanho padrão de item colapsado
  avatarSize: 'h-7 w-7',         // 28px - avatar ligeiramente menor
  iconSize: 'w-3.5 h-3.5',       // 14px - ícones
  itemClasses: 'flex items-center justify-center rounded-md',
} as const;
```

---

### 2. Ajustar Nav Items (AppLayout.tsx)

**Antes (linhas 329-335):**
```typescript
className={cn(
  'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors',
  isActive ? ... : ...,
  isCollapsed && 'lg:justify-center lg:px-2'
)}
```

**Depois:**
```typescript
className={cn(
  'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors',
  isActive ? ... : ...,
  isCollapsed && 'lg:justify-center lg:px-0 lg:h-8 lg:w-8 lg:mx-auto'
)}
```

---

### 3. Ajustar Avatar do Usuário (AppLayout.tsx)

**Antes (linha 379):**
```typescript
<Avatar className="h-9 w-9 flex-shrink-0">
```

**Depois (tamanho condicional):**
```typescript
<Avatar className={cn(
  "flex-shrink-0",
  isCollapsed ? "h-8 w-8" : "h-9 w-9"
)}>
```

---

### 4. Ajustar Container do Usuário (AppLayout.tsx)

**Antes (linhas 375-378):**
```typescript
<div className={cn(
  "flex items-center gap-3 px-2 py-2",
  isCollapsed && "lg:justify-center lg:px-0"
)}>
```

**Depois:**
```typescript
<div className={cn(
  "flex items-center gap-3 px-2 py-2",
  isCollapsed && "lg:justify-center lg:px-0 lg:py-1"
)}>
```

---

### 5. Ajustar Botão Settings Colapsado (AppLayout.tsx)

**Antes (linhas 408-417):**
```typescript
<Link
  to="/preferences"
  className={cn(
    'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors w-full',
    location.pathname === '/preferences' ? ... : ...,
    'lg:justify-center lg:px-2'
  )}
>
  <Settings className="w-3.5 h-3.5 flex-shrink-0" />
</Link>
```

**Depois:**
```typescript
<Link
  to="/preferences"
  className={cn(
    'flex items-center justify-center h-8 w-8 mx-auto rounded-md text-sm font-medium transition-colors',
    location.pathname === '/preferences' ? ... : ...
  )}
>
  <Settings className="w-3.5 h-3.5" />
</Link>
```

---

### 6. Ajustar Botão Logout Colapsado (AppLayout.tsx)

**Antes (linhas 454-460):**
```typescript
<Button
  variant="ghost"
  className="w-full justify-center text-muted-foreground hover:text-foreground px-2"
  onClick={handleSignOut}
>
  <LogOut className="w-3.5 h-3.5" />
</Button>
```

**Depois:**
```typescript
<Button
  variant="ghost"
  size="icon"
  className="h-8 w-8 mx-auto text-muted-foreground hover:text-foreground"
  onClick={handleSignOut}
>
  <LogOut className="w-3.5 h-3.5" />
</Button>
```

---

### 7. Ajustar WorkspaceSelector (WorkspaceSelector.tsx)

**Antes (linhas 44-50):**
```typescript
<Button variant="ghost" className="p-1 h-auto">
  <Avatar className="h-7 w-7">
    ...
  </Avatar>
</Button>
```

**Depois:**
```typescript
<Button variant="ghost" size="icon" className="h-8 w-8">
  <Avatar className="h-7 w-7">
    ...
  </Avatar>
</Button>
```

---

### Resultado Visual Esperado

```text
┌────────────────────────────────────────────────────────────┐
│ Sidebar Colapsado (48px)                                   │
├────────────────────────────────────────────────────────────┤
│                                                            │
│     ┌────────┐  ← WorkspaceSelector: h-8 w-8 (32px)       │
│     │   W    │    Avatar interno: h-7 w-7 (28px)          │
│     └────────┘                                             │
│                                                            │
│     ┌────────┐  ← Nav Item: h-8 w-8 (32px)                │
│     │   🏠   │    Ícone: w-3.5 h-3.5 (14px)              │
│     └────────┘                                             │
│                                                            │
│     ┌────────┐  ← Nav Item: h-8 w-8 (32px)                │
│     │   👥   │    Ícone: w-3.5 h-3.5 (14px)              │
│     └────────┘                                             │
│                                                            │
│     ┌────────┐  ← Nav Item: h-8 w-8 (32px)                │
│     │   📁   │    Ícone: w-3.5 h-3.5 (14px)              │
│     └────────┘                                             │
│                                                            │
│     ┌────────┐  ← Nav Item: h-8 w-8 (32px)                │
│     │   📅   │    Ícone: w-3.5 h-3.5 (14px)              │
│     └────────┘                                             │
│                                                            │
│  ──────────────  ← Separador                               │
│                                                            │
│     ┌────────┐  ← Avatar usuário: h-8 w-8 (32px)          │
│     │   U    │                                             │
│     └────────┘                                             │
│                                                            │
│     ┌────────┐  ← Settings: h-8 w-8 (32px)                │
│     │   ⚙️   │    Ícone: w-3.5 h-3.5 (14px)              │
│     └────────┘                                             │
│                                                            │
│     ┌────────┐  ← Logout: h-8 w-8 (32px)                  │
│     │   🚪   │    Ícone: w-3.5 h-3.5 (14px)              │
│     └────────┘                                             │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

---

### Seção Técnica

**Dimensões padronizadas:**
- Sidebar colapsado: `lg:w-12` (48px)
- Itens clicáveis: `h-8 w-8` (32px) - deixa 8px de margem em cada lado
- Ícones: `w-3.5 h-3.5` (14px)
- Avatares: `h-7 w-7` (28px) dentro de container de 32px

**Classes CSS para itens colapsados:**
```css
/* Nav items, Settings, Logout quando colapsado */
.collapsed-item {
  @apply h-8 w-8 mx-auto flex items-center justify-center rounded-md;
}
```

---

### Ordem de Implementação

1. Adicionar tokens em `design-tokens.ts`
2. Ajustar `WorkspaceSelector.tsx` (botão colapsado)
3. Ajustar `AppLayout.tsx`:
   - Nav items (linhas 329-335)
   - Avatar do usuário (linha 379)
   - Settings link colapsado (linhas 408-417)
   - Logout button colapsado (linhas 454-460)
4. Testar visualmente o sidebar colapsado

