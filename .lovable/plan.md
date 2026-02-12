# Sincronizacao em tempo real do timer global entre dispositivos

## Situacao atual

O timer não está sincronizando entre dispositivos quando esta **vinculado a uma tarefa** (task timer). Isso funciona porque:

- Os dados sao salvos no banco de dados (tabela `task_timers`)
- Alteracoes sao transmitidas em tempo real via Realtime
- O `GlobalTimerContext` reage a essas mudancas automaticamente

O problema esta no **"em todos os modais que possibilitam registros"** (timer iniciado sem tarefa, ou com tarefa, pausado em um dispositivo não está demonstrando atualização real time em outros dispositivos). Esse timer usa apenas `localStorage`, que nao sincroniza entre dispositivos.

## Solucao

Fazer com que o "Registro Rapido" tambem crie um registro na tabela `task_timers` no banco de dados, permitindo sincronizacao em tempo real, e verfrificar propagação de pause/play sem necessidade de atualozação da página de navegação.

### Passo 1: Alteracao no banco de dados

Tornar a coluna `task_id` da tabela `task_timers` **nullable**, para permitir timers sem tarefa vinculada.

```sql
ALTER TABLE public.task_timers ALTER COLUMN task_id DROP NOT NULL;
```

Tambem sera necessario atualizar as politicas RLS para cobrir timers sem `task_id` (onde o usuario so pode gerenciar seus proprios timers):

```sql
-- Politica para admins/colaboradores gerenciarem seus proprios timers sem tarefa
CREATE POLICY "Users can manage own unlinked timers"
ON public.task_timers
FOR ALL
USING (user_id = auth.uid() AND task_id IS NULL);
```

### Passo 2: Alterar GlobalTimerContext

Modificar as funcoes `startGlobalTimer`, `pauseGlobalTimer`, `resumeGlobalTimer` e `resetTimer` para usar o banco de dados em vez de apenas `localStorage`:

- **startGlobalTimer**: Inserir registro em `task_timers` com `task_id = null`
- **pauseGlobalTimer**: Atualizar o registro no banco (setar `paused_at` e `paused_elapsed_seconds`)
- **resumeGlobalTimer**: Atualizar o registro no banco (limpar `paused_at`, atualizar `started_at`)
- **resetTimer / cancelar**: Deletar o registro do banco

A sincronizacao automatica ja funciona: o `useEffect` que escuta `data.taskTimers` (que recebe updates via Realtime) ira atualizar o estado do timer em todos os dispositivos.

### Passo 3: Ajustar sincronizacao no useEffect

O `useEffect` existente (linhas 114-158) ja busca o timer ativo do usuario em `data.taskTimers`. Basta ajustar para tambem considerar timers com `task_id = null` (registros rapidos).

### Passo 4: Manter localStorage como fallback

Manter o `localStorage` como cache local para exibir o timer instantaneamente ao carregar a pagina, mas a fonte de verdade passa a ser o banco de dados.

Passo 5: Validar propagação de ação sem necessidade de refresh da página de navegaçâo.

## Detalhes tecnicos

### Arquivos modificados


| Arquivo                               | Alteracao                                                               |
| ------------------------------------- | ----------------------------------------------------------------------- |
| Nova migracao SQL                     | Tornar `task_id` nullable, adicionar politica RLS                       |
| `src/contexts/GlobalTimerContext.tsx` | Usar `supabase` para CRUD do timer rapido em vez de apenas localStorage |
| `src/contexts/DataContext.tsx`        | Pequeno ajuste nas funcoes de timer para aceitar `task_id` null         |


### Fluxo de sincronizacao

```text
Dispositivo A                    Banco de Dados                 Dispositivo B
     |                               |                               |
     |-- INSERT task_timer -----------|                               |
     |   (task_id=null)              |-- Realtime event ------------>|
     |                               |                               |
     |                               |       GlobalTimerContext      |
     |                               |       detecta timer ativo     |
     |                               |       e atualiza UI           |
     |                               |                               |
     |-- UPDATE paused_at -----------|                               |
     |                               |-- Realtime event ------------>|
     |                               |       UI mostra "pausado"     |
```

### Riscos e mitigacoes

- **Politicas RLS existentes**: As politicas atuais verificam `task_id` via joins com `tasks` e `projects`. Timers sem `task_id` nao sao cobertos por essas politicas, por isso a nova politica `"Users can manage own unlinked timers"` e necessaria.
- **Compatibilidade**: Timers vinculados a tarefas continuam funcionando exatamente como antes. Apenas o fluxo do "Registro Rapido" muda.