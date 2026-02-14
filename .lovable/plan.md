
# Plano: Corrigir erro de build e verificar timer

## Diagnostico

O timer nao funciona porque **o app inteiro nao compila** devido a um erro de build em `Services.tsx` (linha 278). O tipo `ProposalItem[]` nao e compativel com `Json` ao atualizar propostas no banco. Este e o mesmo padrao de erro ja corrigido em `Proposals.tsx` na rodada anterior, mas que nao foi aplicado em `Services.tsx`.

A logica do timer em si (pausar, retomar, descartar, prevencao de sobreposicao) esta correta:
- Timers standalone (sem tarefa): pause/resume manipulam o banco diretamente via `task_timers`
- Timers vinculados a tarefa: delegam para `pauseTaskTimer`/`resumeTaskTimer` do DataContext
- Prevencao de sobreposicao: `startGlobalTimer` retorna se `timerState.isRunning`, e `TaskTimer` bloqueia inicio se `hasForeignActiveTimer`
- Descarte: `handleDiscard` chama `cancelTaskTimer` (para task timers) + `resetTimer` (limpa DB e estado)

Ha tambem um warning de console (`forwardRef`) em `HeaderTimerDisplay` que nao impede o funcionamento mas deve ser corrigido.

## Correcoes

### Passo 1 - Corrigir build error em Services.tsx (linha 278)

Adicionar cast `as unknown as Json` no campo `items` ao fazer `.update()` na tabela `proposals`, identico ao fix ja aplicado em `Proposals.tsx`.

```text
Antes:  items: updatedItems,
Depois: items: updatedItems as unknown as Json,
```

Adicionar o import de `Json` do arquivo de tipos do Supabase.

### Passo 2 - Corrigir warning forwardRef em HeaderTimerDisplay

O warning ocorre porque `Tooltip` do Radix tenta passar ref para componentes filhos function. A correcao e envolver os componentes dentro de `TooltipTrigger asChild` em elementos que aceitam ref (como `div` ou `span`), ou verificar se algum uso esta passando ref para um function component sem `forwardRef`.

## Secao Tecnica

```text
Arquivos a modificar:
  - src/pages/Services.tsx (linha 278 - cast items, adicionar import Json)
  - src/components/timer/HeaderTimerDisplay.tsx (ajuste menor no TooltipTrigger se necessario)

Nenhuma migracao SQL necessaria.
Nenhuma alteracao na logica do timer.
```
