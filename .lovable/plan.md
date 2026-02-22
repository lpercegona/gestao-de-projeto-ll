

# Correcao: Dialog de conclusao do timer nao abre para clientes

## Diagnostico

O `GlobalTimerCompleteDialog` e renderizado **dentro** dos componentes `HeaderTimerDisplay` e `GlobalTimerButton`. Porem, no `AppLayout.tsx`, o header passa `hideTimer={isClient}` (linhas 591 e 598), o que esconde completamente esses componentes para usuarios com perfil de cliente.

Quando o cliente clica em "Concluir" no `TaskTimer`, a funcao `completeGlobalTimer()` e chamada e define `showCompleteDialog = true` no contexto global. Mas como o componente `GlobalTimerCompleteDialog` nao esta montado no DOM (porque esta dentro do `HeaderTimerDisplay` que esta oculto), o dialog nunca aparece.

## Solucao

Renderizar o `GlobalTimerCompleteDialog` de forma independente no `AppLayout.tsx`, fora do `HeaderTimerDisplay`, para que esteja sempre disponivel no DOM -- inclusive para clientes.

## Secao Tecnica

### Arquivo: `src/components/layout/AppLayout.tsx`

```text
1. Importar GlobalTimerCompleteDialog e useGlobalTimer no AppLayout
   (useGlobalTimer ja esta importado)

2. No componente AppLayout, acessar showCompleteDialog e 
   setShowCompleteDialog do useGlobalTimer()

3. Renderizar GlobalTimerCompleteDialog no JSX do AppLayout,
   fora de qualquer condicao de hideTimer:
   
   <GlobalTimerCompleteDialog 
     open={showCompleteDialog} 
     onOpenChange={setShowCompleteDialog} 
   />

4. Opcionalmente, remover o GlobalTimerCompleteDialog de dentro
   do HeaderTimerDisplay e GlobalTimerButton para evitar
   renderizacao duplicada (ou manter la com guarda para evitar
   conflito -- a abordagem mais simples e remover dos dois e
   manter apenas no AppLayout)
```

### Arquivos afetados

- `src/components/layout/AppLayout.tsx` -- adicionar renderizacao do dialog
- `src/components/timer/HeaderTimerDisplay.tsx` -- remover GlobalTimerCompleteDialog
- `src/components/timer/GlobalTimerButton.tsx` -- remover GlobalTimerCompleteDialog
