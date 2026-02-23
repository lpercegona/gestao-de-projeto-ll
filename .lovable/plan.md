

# Ocultar descrições de tarefas no relatório compartilhável

## O que muda

Na seção de projetos do relatório compartilhado (`SharedReport.tsx`), cada tarefa exibe atualmente o título e a descrição. A alteração remove a linha que renderiza a descrição da tarefa, mantendo apenas o título.

## Seção Técnica

### Arquivo: `src/pages/SharedReport.tsx`

Remover a linha 719 que renderiza a descrição da tarefa:

```text
// Remover esta linha:
{task.description && <WysiwygContent content={task.description} className="text-sm text-muted-foreground" />}
```

O bloco de cada tarefa (linhas 716-722) passará de:
```text
<div>
  <p className="font-medium text-foreground">{task.name}</p>
  {task.description && <WysiwygContent .../>}   <-- remover
</div>
```

Para:
```text
<div>
  <p className="font-medium text-foreground">{task.name}</p>
</div>
```

Nenhuma outra alteração necessária.
