
# Plano: Corrigir criacao de tarefas a partir de solicitacoes aprovadas

## Diagnostico

A investigacao revelou que **todas as solicitacoes de novas tarefas foram marcadas como "aprovadas" no banco, mas nenhuma tarefa foi efetivamente criada**. Existem 9 registros aprovados em `edit_requests` com `request_type = 'new_task'`, porem 0 tarefas correspondentes na tabela `tasks`.

### Causa raiz

O campo `due_date` na tabela `tasks` e do tipo `date` (nullable). O codigo de aprovacao faz:

```text
due_date: taskDueDate || ''
```

Quando o cliente nao informa um prazo, `taskDueDate` e `null` ou `undefined`, e o operador `||` converte para string vazia `''`. Inserir `''` em uma coluna do tipo `date` causa um erro no PostgreSQL. A funcao `createTask` captura o erro silenciosamente (retorna `null` sem lanca-lo), e o fluxo continua normalmente, marcando a solicitacao como "aprovada" sem que a tarefa tenha sido criada.

O problema ocorre em **dois locais**:
1. `handleQuickApproveRequest` - aprovacao rapida pelo dropdown do card
2. `handleProcessEditRequest` - aprovacao pelo dialog de revisao

## Solucao

### 1. Corrigir o valor de `due_date` nos dois fluxos de aprovacao

Trocar `due_date: taskDueDate || ''` por `due_date: taskDueDate || null` em ambos os locais.

### 2. Verificar o resultado de `createTask` antes de aprovar

Adicionar verificacao do retorno de `createTask`. Se retornar `null`, lancar erro para evitar que a solicitacao seja marcada como aprovada sem a tarefa ter sido criada.

### 3. Nenhuma alteracao de banco de dados necessaria

A tabela `tasks` ja aceita `null` em `due_date`. O problema e exclusivamente no codigo frontend.

## Secao Tecnica

```text
Arquivo a modificar:
  - src/pages/Projects.tsx

Alteracao 1 - handleQuickApproveRequest (~linha 492-500):
  Antes:
    const taskDueDate = ... ? ... : '';
    await createTask({
      ...
      due_date: taskDueDate || '',
    });

  Depois:
    const taskDueDate = ... ? ... : null;
    const newTask = await createTask({
      ...
      due_date: taskDueDate,
    });
    if (!newTask) throw new Error('Falha ao criar tarefa');

Alteracao 2 - handleProcessEditRequest (~linha 796-804):
  Antes:
    const taskDueDate = ... ? ... : '';
    await createTask({
      ...
      due_date: taskDueDate || '',
    });

  Depois:
    const taskDueDate = ... ? ... : null;
    const newTask = await createTask({
      ...
      due_date: taskDueDate,
    });
    if (!newTask) throw new Error('Falha ao criar tarefa');
```
