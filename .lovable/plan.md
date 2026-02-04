

## Plano: Alterar Tamanho do Texto do Menu para 12px

### Objetivo

Alterar o tamanho do texto dos itens do menu de `text-sm` (14px) para `text-xs` (12px).

---

### Arquivo a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `src/components/layout/AppLayout.tsx` | Trocar `text-sm` por `text-xs` em 4 locais |

---

### Alteracoes

**1. Nav Items (linha 330)**
```typescript
// Antes
'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors'

// Depois
'flex items-center gap-3 px-3 py-2.5 rounded-md text-xs font-medium transition-colors'
```

**2. Settings Link Colapsado - Desktop (linha 409)**
```typescript
// Antes
'flex items-center justify-center h-8 w-8 mx-auto rounded-md text-sm font-medium transition-colors'

// Depois
'flex items-center justify-center h-8 w-8 mx-auto rounded-md text-xs font-medium transition-colors'
```

**3. Settings Link Colapsado - Mobile (linha 423)**
```typescript
// Antes
'lg:hidden flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors'

// Depois
'lg:hidden flex items-center gap-3 px-3 py-2.5 rounded-md text-xs font-medium transition-colors'
```

**4. Settings Link Expandido (linha 438)**
```typescript
// Antes
'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors'

// Depois
'flex items-center gap-3 px-3 py-2.5 rounded-md text-xs font-medium transition-colors'
```

---

### Resultado

- **Antes:** `text-sm` = 14px (0.875rem)
- **Depois:** `text-xs` = 12px (0.75rem)

O menu ficara com texto mais compacto, mantendo o `font-medium` (peso 500) para boa legibilidade.

