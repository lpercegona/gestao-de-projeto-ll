

# Corrigir erro de build + Prevenir refresh durante edição em diálogos

## Problema 1: Erro de build
`CheckCircle2` é usado no Dashboard.tsx mas não está importado.

**Correção**: Adicionar `CheckCircle2` à lista de imports do lucide-react na linha 17.

## Problema 2: Refresh destrói dados em diálogos abertos

**Causa raiz**: Quando o Supabase dispara `TOKEN_REFRESHED`, o `onAuthStateChange` chama `setUser(session?.user)`, criando uma nova referência de objeto. Como `refreshData` depende de `[user]`, o `useCallback` recria a função, o `useEffect` re-executa, e todos os dados são recarregados — resetando o estado de componentes que dependem do DataContext.

**Estratégia**: Duas camadas de proteção.

### Camada 1: Estabilizar referência do `user` no AuthContext

No `onAuthStateChange`, só chamar `setUser()` se o ID do usuário mudou de fato:

```typescript
// AuthContext.tsx, dentro do onAuthStateChange
const newUser = session?.user ?? null;
setSession(session);
setUser(prev => {
  if (prev?.id === newUser?.id) return prev; // manter referência estável
  return newUser;
});
```

Isso elimina 90% dos refreshes desnecessários (TOKEN_REFRESHED não muda o user ID).

### Camada 2: Lock de edição global no DataContext

Criar um mecanismo de "editing lock" que impede `refreshData` de rodar enquanto um diálogo estiver aberto:

```typescript
// DataContext.tsx
const editingLockRef = useRef(0);

const lockEditing = useCallback(() => {
  editingLockRef.current += 1;
}, []);

const unlockEditing = useCallback(() => {
  editingLockRef.current = Math.max(0, editingLockRef.current - 1);
}, []);

// No refreshData:
const refreshData = useCallback(async (showLoading = true) => {
  if (editingLockRef.current > 0) return; // não recarregar se em edição
  // ... resto da lógica
}, [user]);
```

Expor `lockEditing` e `unlockEditing` no contexto.

### Camada 3: Aplicar o lock nos diálogos

Nos diálogos de criação/edição, chamar `lockEditing()` ao abrir e `unlockEditing()` ao fechar. Os principais diálogos são:

| Arquivo | Diálogo |
|---|---|
| `QuickActionsPanel.tsx` | Criação rápida de cliente |
| `ProjectShareDialog.tsx` | Compartilhamento de projeto |
| `UserCreateDialog.tsx` | Criação de usuário |
| `UserEditDialog.tsx` | Edição de usuário |
| `ClientEditRequestForm.tsx` | Edição de cliente |
| `ProjectRequestForm.tsx` | Solicitação de projeto |
| `KanbanStagesDialog.tsx` | Configuração de estágios Kanban |
| `ReportShareDialog.tsx` | Compartilhamento de relatório |
| `ProjectTableView.tsx` | Diálogo de detalhes |
| `Services.tsx` | Criação/edição de itens de serviço |
| `ExpandedTimerModal.tsx` | Timer expandido |
| `GlobalTimerCompleteDialog.tsx` | Completar timer |

Padrão de uso via `useEffect`:

```typescript
const { lockEditing, unlockEditing } = useData();
useEffect(() => {
  if (open) { lockEditing(); } else { unlockEditing(); }
  return () => unlockEditing();
}, [open]);
```

## Arquivos alterados

1. **`src/pages/Dashboard.tsx`** — Adicionar import `CheckCircle2`
2. **`src/contexts/AuthContext.tsx`** — Estabilizar referência do `user`
3. **`src/contexts/DataContext.tsx`** — Adicionar `editingLockRef`, `lockEditing`, `unlockEditing`
4. **12 componentes de diálogo** — Adicionar `useEffect` com lock/unlock

