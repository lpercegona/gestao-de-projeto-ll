
## Plano: Correção de Layout Mobile e Ajustes de Navegação

### Problemas Identificados

| Problema | Causa Raiz |
|----------|------------|
| Dashboard (Painel) extrapola largura mobile | Componentes internos sem controle de overflow e grid de stats com 5 colunas fixas |
| ClientDashboard extrapola largura mobile | `QuickRequestCard` com layout flex que não quebra corretamente em mobile |
| Modal de notificações sem scroll | `ScrollArea` com `max-h-[400px]` funciona, mas precisa de altura fixa para ativar o scroll corretamente |
| Clientes não têm painel como página inicial | Rota `/` redireciona clientes para `/client-dashboard`, mas o antigo dashboard (Painel) é mais completo |

---

### Solução

#### 1. Dashboard.tsx - Corrigir Overflow Mobile

**Problema**: O grid de stats usa `lg:grid-cols-5` mas falta `overflow-hidden` no container principal e `min-w-0` em elementos flex.

**Alterações**:
- Adicionar `overflow-hidden` no container principal
- Adicionar `min-w-0` nos cards para prevenir overflow de texto longo
- Garantir que o grid de 2 colunas em mobile funcione corretamente

```typescript
// Container principal
<div className="space-y-6 overflow-hidden">

// Cards de stats
<Card key={stat.title} className="min-w-0">
```

---

#### 2. ClientDashboard.tsx - Corrigir Overflow Mobile

**Problema**: O `QuickRequestCard` usa layout flex horizontal que não quebra em telas pequenas.

**Alterações**:
- Adicionar `overflow-hidden` no container principal
- Ajustar responsividade dos cards de estatísticas
- Adicionar `min-w-0` em elementos com texto truncado

```typescript
// Container principal
<div className="space-y-6 overflow-hidden">

// Cards de stats - já usa grid-cols-2 lg:grid-cols-4, verificar se precisa ajustes
```

---

#### 3. QuickRequestCard.tsx - Corrigir Layout Mobile

**Problema**: O layout flex horizontal do card não quebra em mobile, causando overflow.

**Alterações**:
- Mudar o layout para empilhar verticalmente em mobile
- Usar classes responsivas `flex-col sm:flex-row`

```typescript
// Antes
<div className="flex items-center justify-between">

// Depois
<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">

// Botões também empilham
<div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full sm:w-auto">
```

---

#### 4. NotificationBell.tsx - Ativar Scroll do Modal

**Problema**: O `ScrollArea` precisa de uma altura definida (não apenas `max-h`) para que o scroll interno funcione corretamente.

**Alterações**:
- Adicionar `h-[400px]` junto com `max-h-[400px]` no ScrollArea quando há muitas notificações
- Usar altura dinâmica baseada na quantidade de notificações

```typescript
// Antes
<ScrollArea className="max-h-[400px]">

// Depois - usar altura fixa para garantir scroll
<ScrollArea className="h-auto max-h-[400px]">
```

**Nota**: A implementação atual deve funcionar. Vou verificar se o problema é a falta de `overflow-y-auto` ou se o `ScrollArea` não está recebendo altura correta.

---

#### 5. ProtectedRoute.tsx - Painel como Página Inicial para Clientes

**Problema**: Atualmente clientes são redirecionados para `/client-dashboard`. O usuário quer que eles vejam o painel (antigo dashboard) como página inicial.

**Importante**: O Dashboard atual (`/`) requer `requiredRole="admin"` e contém dados que clientes não devem ver (propostas, todos os clientes, etc.).

**Opções**:

**Opção A** (Recomendada): Manter `/client-dashboard` como página inicial para clientes, pois o Dashboard tem informações administrativas que clientes não devem acessar.

**Opção B**: Criar uma versão do Dashboard filtrada para clientes que mostra apenas dados relevantes a eles.

**Opção C**: Permitir que clientes acessem a rota `/` mas filtrar os dados mostrados baseado no role.

Para implementar a **Opção A** (manter comportamento atual), nenhuma mudança é necessária.

Para implementar a **Opção C** (solicitada), precisamos:
1. Mudar a rota `/` de `requiredRole="admin"` para `requiredRole="client"`
2. Modificar `Dashboard.tsx` para filtrar dados quando `isClient === true`
3. Esconder painéis que clientes não devem ver (Solicitações, Horas por Cliente de outros, etc.)

---

### Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/pages/Dashboard.tsx` | Adicionar `overflow-hidden` e `min-w-0` para evitar overflow mobile |
| `src/pages/ClientDashboard.tsx` | Adicionar `overflow-hidden` no container principal |
| `src/components/dashboard/QuickRequestCard.tsx` | Layout responsivo com empilhamento vertical em mobile |
| `src/components/notifications/NotificationBell.tsx` | Garantir scroll funcional no modal de notificações |
| `src/App.tsx` | Mudar rota `/` para `requiredRole="client"` (se opção C aprovada) |
| `src/components/layout/ProtectedRoute.tsx` | Remover redirecionamento automático de clientes para `/client-dashboard` |

---

### Alterações Detalhadas

#### Dashboard.tsx

```typescript
// Linha 70 - Container principal
<div className="space-y-6 overflow-hidden">

// Linha 86 - Cards de stats
<Card key={stat.title} className="min-w-0 overflow-hidden">
```

#### ClientDashboard.tsx

```typescript
// Linha 174 - Container principal
<div className="space-y-6 overflow-hidden">

// Linha 178 - Cards de stats
<Card key={index} className="min-w-0 overflow-hidden">
```

#### QuickRequestCard.tsx

```typescript
// Linha 63-84 - Layout responsivo
<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
  <div className="flex items-center gap-4">
    <div className="p-3 bg-primary/20 rounded-xl shrink-0">
      <FileText className="w-6 h-6 text-primary" />
    </div>
    <div className="min-w-0">
      <h3 className="font-semibold text-lg">Solicitação Rápida</h3>
      <p className="text-sm text-muted-foreground">
        Solicite um novo projeto ou serviço
      </p>
    </div>
  </div>
  <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
    {pendingCount > 0 && (
      <Badge variant="secondary" className="text-xs shrink-0">
        {pendingCount} pendente{pendingCount > 1 ? 's' : ''}
      </Badge>
    )}
    <Button onClick={() => setIsFormOpen(true)} className="gap-2 w-full sm:w-auto">
      <Plus className="w-4 h-4" />
      Nova Solicitação
    </Button>
  </div>
</div>
```

#### NotificationBell.tsx

```typescript
// Linha 177 - ScrollArea com altura garantida
<ScrollArea className="h-auto max-h-[400px] overflow-y-auto">
```

---

### Sobre o Redirecionamento de Clientes

Atualmente, o `ProtectedRoute.tsx` (linhas 66-72) redireciona clientes que acessam `/` para `/client-dashboard`:

```typescript
if (isClient) {
  const location = window.location.pathname;
  if (location === '/') {
    return <Navigate to="/client-dashboard" replace />;
  }
}
```

**Para fazer o Painel ser a página inicial de clientes**, precisamos:

1. **Em `App.tsx`**: Mudar a rota `/` de `requiredRole="admin"` para `requiredRole="client"`
2. **Em `ProtectedRoute.tsx`**: Remover o redirecionamento automático para `/client-dashboard`
3. **Em `Dashboard.tsx`**: Filtrar os painéis visíveis baseado no role do usuário

Isso permitiria que clientes vissem o Dashboard mas com conteúdo filtrado apropriado para seu acesso.

---

### Resultado Esperado

| Item | Antes | Depois |
|------|-------|--------|
| Dashboard mobile | Extrapola largura | Respeita limites da tela |
| ClientDashboard mobile | QuickRequestCard quebrado | Layout empilhado em mobile |
| Notificações | Scroll não funciona | Scroll ativado corretamente |
| Página inicial cliente | `/client-dashboard` | `/` (Dashboard/Painel) com filtros |
