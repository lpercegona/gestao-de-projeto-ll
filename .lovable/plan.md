
# Habilitar Registro de Horas para Clientes em Tarefas Proprietarias

## Diagnostico

O arquivo `ClientProjects.tsx` tem dois problemas que impedem clientes de registrar horas:

1. **`handleRegisterTime` esta vazio** (linha 644): quando o cliente clica no botao de registrar tempo, nada acontece porque a funcao nao faz nada.

2. **Nao existe dialog de registro de horas**: o arquivo nao possui o estado nem o JSX para o dialog de registro manual de horas (formulario com campos de tempo, data, tipo e descricao).

3. **`handleStopTimer` registra automaticamente sem dialog de conclusao**: quando o cliente para o timer, o registro e feito silenciosamente sem permitir que o cliente escolha tipo (tarefa/reuniao) ou adicione descricao.

## Solucao

Adicionar ao `ClientProjects.tsx` toda a infraestrutura de registro de horas que ja existe em `Projects.tsx`:

### Novos estados necessarios

- `isTimeDialogOpen` / `setIsTimeDialogOpen` - controlar abertura do dialog
- `selectedTaskId` - tarefa selecionada para registro
- `editingTimeEntryId` - ID do registro sendo editado (null para novo)
- `timeForm` - formulario com campos: time, date, description, entry_type
- `submitting` - estado de submissao
- `isPauseDialogOpen` - dialog de conclusao do timer
- `pauseDescription` / `pauseEntryType` - campos do dialog de conclusao
- `pauseTimerTaskId` - tarefa do timer sendo parado
- `isDeleteTimeEntryDialogOpen` - confirmacao de exclusao

### Mudancas em funcoes existentes

- **`handleRegisterTime`**: implementar para abrir o dialog de registro, preenchendo o formulario com dados do registro existente (se editando) ou vazio (se novo)
- **`handleStopTimer`**: modificar para abrir o dialog de conclusao (isPauseDialogOpen) em vez de registrar automaticamente

### Novos componentes JSX

- Dialog de registro manual de horas (formulario com HH:mm, data, tipo tarefa/reuniao, descricao)
- Dialog de conclusao do timer (tipo tarefa/reuniao, descricao, botoes salvar/descartar)
- Dialog de confirmacao de exclusao de registro

### Permissao por tarefa

Todos os controles de registro de horas so serao habilitados para tarefas onde `task.created_by === user.id`, garantindo que clientes registrem horas apenas em tarefas proprietarias.

## Secao Tecnica

### Arquivo: `src/pages/ClientProjects.tsx`

```text
1. Adicionar estados:
   - isTimeDialogOpen, selectedTaskId, editingTimeEntryId
   - timeForm: { time: '', date: hoje, description: '', entry_type: 'task' }
   - submitting (geral para dialogs)
   - isPauseDialogOpen, pauseDescription, pauseEntryType, pauseTimerTaskId
   - isDeleteTimeEntryDialogOpen

2. Implementar handleRegisterTime(taskId, entry?):
   - Se entry fornecido: preencher timeForm com dados do entry, setar editingTimeEntryId
   - Se nao: limpar timeForm, setar editingTimeEntryId = null
   - Setar selectedTaskId = taskId
   - Abrir isTimeDialogOpen = true

3. Implementar handleSubmitTime:
   - Converter time (HH:mm) para decimal
   - Se editingTimeEntryId: UPDATE em time_entries
   - Se nao: INSERT em time_entries com created_by = user.id
   - Fechar dialog e refreshData

4. Implementar handleDeleteTimeEntry:
   - DELETE em time_entries onde id = editingTimeEntryId
   - Fechar dialogs e refreshData

5. Modificar handleStopTimer:
   - Em vez de registrar automaticamente, calcular horas e abrir
     isPauseDialogOpen com pauseTimerTaskId = taskId
   - Manter calculo de horas existente

6. Implementar handleConfirmStopTimer:
   - Inserir time_entry com horas calculadas, pauseEntryType e pauseDescription
   - Deletar timer
   - Fechar dialog e refreshData

7. Implementar handleDiscardTimer:
   - Apenas deletar o timer sem criar time_entry
   - Fechar dialog e refreshData

8. Adicionar 3 dialogs no JSX (antes do fechamento do return):
   - Dialog de registro manual (isTimeDialogOpen)
   - Dialog de conclusao do timer (isPauseDialogOpen)
   - AlertDialog de confirmacao de exclusao (isDeleteTimeEntryDialogOpen)

9. Adicionar imports faltantes:
   - Select, SelectContent, SelectItem, SelectTrigger, SelectValue
   - Textarea
   - ToggleGroup, ToggleGroupItem
   - Trash2, ClipboardList, Users (icones)
```
