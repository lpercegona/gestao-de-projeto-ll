

# Plano: Corrigir Timer Global - Race Condition e Sobreposicao

## Diagnostico

O problema principal e uma **race condition** no efeito de sincronizacao do `GlobalTimerContext.tsx` (linhas 244-339). O fluxo problematico e:

1. Usuario clica "Iniciar" - `startGlobalTimer` define estado otimista com `dbTimerId: null`
2. O insert no banco via Supabase dispara um evento Realtime (INSERT)
3. O Realtime atualiza `data.taskTimers` no `DataContext`
4. O efeito de sincronizacao (useEffect linha 244) roda novamente
5. Encontra o timer ativo no banco, mas **antes** que o callback do insert atualize `dbTimerId` no estado local
6. Na proxima renderizacao, `dbTimerId` muda (agora nao e mais null), o que dispara o efeito **novamente** porque `timerState.dbTimerId` esta no array de dependencias
7. Este ciclo de atualizacoes causa instabilidade e, em certos timings, o ramo `else if` (linha 333) e executado, resetando tudo para `initialState`

A sobreposicao ocorre porque, apos o reset indevido, `timerState.isRunning` volta a ser `false`, permitindo iniciar um novo timer enquanto o registro anterior ainda existe no banco.

## Correcoes

### Passo 1 - Remover `timerState.dbTimerId` e `timerState.taskId` das dependencias do efeito de sincronizacao

O efeito de sincronizacao (linha 244) tem `timerState.dbTimerId` e `timerState.taskId` como dependencias. Isso causa re-execucoes desnecessarias: toda vez que o estado local e atualizado pelo proprio efeito, ele dispara novamente.

A correcao e usar refs para esses valores em vez de inclui-los diretamente nas dependencias, quebrando o ciclo de atualizacao.

### Passo 2 - Proteger o ramo de reset contra race conditions

A condicao na linha 333 (`else if (timerState.dbTimerId || timerState.taskId) && !loading`) reseta o timer quando nao encontra um timer ativo no banco. Porem, durante o breve periodo entre o insert otimista e a chegada do evento Realtime, nao ha timer no array `data.taskTimers` ainda.

A correcao e adicionar um debounce ou flag de "operacao em andamento" que impeca o reset durante operacoes assincronas (insert, pause, resume, delete).

### Passo 3 - Verificar timers existentes no banco antes de iniciar

Atualmente `startGlobalTimer` so verifica `timerState.isRunning` localmente. Adicionar uma query ao banco (`SELECT` em `task_timers` filtrando por `user_id`) antes de fazer o INSERT para garantir que nao existe nenhum timer ativo, evitando sobreposicao mesmo apos resets indevidos.

### Passo 4 - Garantir consistencia no resetTimer e completeGlobalTimer

O `resetTimer` deleta o registro do banco e limpa o estado. Porem, o evento Realtime de DELETE chega depois e pode causar uma segunda execucao do efeito de sincronizacao. Garantir que o reset e idempotente e que estados ja limpos nao sejam processados novamente.

## Secao Tecnica

```text
Arquivo a modificar:
  - src/contexts/GlobalTimerContext.tsx

Mudancas especificas:

1. Criar refs para dbTimerId e taskId:
   const dbTimerIdRef = useRef(timerState.dbTimerId)
   const taskIdRef = useRef(timerState.taskId)
   // Manter sincronizados via useEffect simples

2. Criar ref/flag de operacao em andamento:
   const operationInProgress = useRef(false)
   // Setar true antes de operacoes async (start, pause, resume, reset)
   // Setar false apos completar
   // No efeito de sync, ignorar o ramo de reset se operationInProgress.current === true

3. No efeito de sincronizacao (linha 244-339):
   - Remover timerState.dbTimerId e timerState.taskId do array de deps
   - Usar dbTimerIdRef.current e taskIdRef.current no lugar
   - Dependencias ficam: [user, data.taskTimers, data.tasks, data.projects, data.clients, loading]

4. Em startGlobalTimer:
   - Antes do insert, fazer query de verificacao:
     const { data: existing } = await supabase
       .from('task_timers')
       .select('id')
       .eq('user_id', user.id)
       .limit(1);
     if (existing && existing.length > 0) return;

5. No ramo else if (linha 333):
   - Adicionar: && !operationInProgress.current
   - Condicao final: (dbTimerIdRef.current || taskIdRef.current) && !loading && !operationInProgress.current

Nenhuma migracao SQL necessaria.
Nenhuma alteracao em outros arquivos.
```

