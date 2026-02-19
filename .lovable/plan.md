# Correcao de Estabilidade do DataContext

## Estabilizar DataContext para evitar atualizacoes desnecessarias

### Problema

- `refreshData` depende de `user` no `useCallback`, recriando o callback a cada mudanca de referencia
- `useEffect` na linha 271-273 dispara `refreshData()` toda vez que o callback muda
- Realtime handler de `task_timers` atualiza estado mesmo com aba em segundo plano

### Alteracoes em `src/contexts/DataContext.tsx`:

1. **Adicionar `useRef` ao import** (linha 1):
  - Adicionar `useRef` ao import do React
2. **Criar refs para valores usados no callback** (apos linha 196):
  ```text
   const userRef = useRef(user);
   const isCollaboratorRef = useRef(isCollaborator);
   const isAdminOrMasterRef = useRef(isAdminOrMaster);

   useEffect(() => {
     userRef.current = user;
     isCollaboratorRef.current = isCollaborator;
     isAdminOrMasterRef.current = isAdminOrMaster;
   }, [user, isCollaborator, isAdminOrMaster]);
  ```
3. **Estabilizar `refreshData**` (linhas 198-269):
  - Trocar todas as referencias a `user` por `userRef.current`
  - Trocar `isCollaborator` por `isCollaboratorRef.current`
  - Trocar `isAdminOrMaster` por `isAdminOrMasterRef.current`
  - Remover dependencia `[user]` do useCallback, deixando `[]`
4. **Substituir useEffect de carga** (linhas 271-273):
  ```text
   const prevUserIdRef = useRef<string | null>(null);

   useEffect(() => {
     const currentUserId = user?.id || null;
     if (currentUserId !== prevUserIdRef.current) {
       prevUserIdRef.current = currentUserId;
       refreshData();
     }
   }, [user?.id, refreshData]);
  ```
5. **Guard de visibilidade no Realtime** (linha 287):
  ```text
   (payload) => {
     if (document.hidden) return;
     setData(prev => { ... });
   }
  ```

---

## Secao Tecnica

```text
Arquivos modificados:
  1. supabase/functions/send-proposal-email/index.ts - mover preferredPort antes do try
  2. supabase/functions/send-contract-email/index.ts - mover preferredPort antes do try
  3. supabase/functions/send-monthly-report/index.ts - mover preferredPort antes do try
  4. src/contexts/DataContext.tsx:
     - Adicionar useRef ao import
     - Criar refs para user, isCollaborator, isAdminOrMaster
     - refreshData com dependencias vazias (usa refs)
     - useEffect baseado em user?.id
     - Guard document.hidden no handler Realtime

Resultado esperado:
  - Build errors resolvidos
  - Interface nao recarrega ao trocar de aba ou minimizar
  - Dialogos abertos permanecem estaveis
  - Dados Realtime so processados com aba ativa
```