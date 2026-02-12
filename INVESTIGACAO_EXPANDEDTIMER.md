# Investigação: expansão automática da interface do ExpandedTimer

## Objetivo
Mapear quais correções anteriores alteraram o comportamento visual do `ExpandedTimerModal` para que ele entre no estado “expandido/reorganizado” sempre que um novo timer de tarefa é iniciado.

## Conclusões

1. O comportamento foi amarrado explicitamente ao estado global `hasActiveTimer` no commit `bcdb6b1`.
2. Nesse commit, as classes de animação/layout do modal passaram a depender de `hasActiveTimer` em múltiplos blocos centrais da UI (texto de introdução, área do círculo e controles inferiores).
3. Como `handleStartTaskTimer` inicia o timer global via `startGlobalTimer()` quando não há timer ativo, iniciar timer por tarefa liga `hasActiveTimer`, que por consequência ativa imediatamente as classes de “modo expandido”.

## Evidências técnicas

### 1) Gatilho de início de timer por tarefa
No fluxo de iniciar timer por tarefa:
- `handleStartTaskTimer` chama `startGlobalTimer()` quando `!hasActiveTimer`.
- Em seguida vincula a tarefa com `setTaskBinding(...)`.

Esse fluxo está em `src/components/timer/ExpandedTimerModal.tsx`.

### 2) Condições visuais atreladas a `hasActiveTimer`
Após a correção/reversão em `bcdb6b1`:
- o texto inicial some quando `hasActiveTimer || distractionFree`;
- o container central troca dimensões/offset quando `hasActiveTimer`;
- o botão circular de play fica oculto quando `hasActiveTimer`;
- o bloco do cronômetro circular aparece quando `hasActiveTimer`;
- os botões de controle inferiores aparecem quando `hasActiveTimer`.

Em outras palavras: iniciar timer (inclusive por tarefa) altera `hasActiveTimer` e automaticamente muda a interface para o estado expandido.

### 3) Commit identificado como ponto de mudança
- Commit: `bcdb6b1`
- Mensagem: `Reverted to commit 91693dfca8a60911794f96a44b7fb9441589623b`
- Arquivo impactado: `src/components/timer/ExpandedTimerModal.tsx`

Esse commit consolidou as condições de UI para `hasActiveTimer`, o que explica o efeito observado.

## Comandos usados na investigação

```bash
git log --oneline -- src/components/timer/ExpandedTimerModal.tsx
git blame -L 170,230 src/components/timer/ExpandedTimerModal.tsx
git show bcdb6b15 -- src/components/timer/ExpandedTimerModal.tsx
```
