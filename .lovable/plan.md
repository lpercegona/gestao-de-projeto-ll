

# Ajustes no Painel: Solicitacoes e Proximas Entregas

## 1. Solicitacoes - Exibir apenas pendentes

Atualmente o painel busca todas as solicitacoes (pendentes, aprovadas, rejeitadas) e exibe as 5 mais recentes. O ajuste adicionara filtro `.eq('status', 'pending')` nas duas queries (project_requests e edit_requests) para trazer apenas solicitacoes pendentes.

- A contagem no badge do header ja mostra apenas pendentes, entao ficara consistente.
- A mensagem vazia sera ajustada para "Nenhuma solicitacao pendente."

## 2. Proximas Entregas - Exibir apenas tarefas

Remover todo o bloco que adiciona projetos a lista de deadlines (linhas 23-53 do ProximasEntregasPanel.tsx). Manter apenas o bloco de tarefas. A mensagem vazia do componente UpcomingDeadlines tambem sera ajustada.

## Secao Tecnica

```text
Arquivos modificados:

1. src/components/dashboard/SolicitacoesPanel.tsx
   - Adicionar .eq('status', 'pending') na query de project_requests (linha 77)
   - Adicionar .eq('status', 'pending') na query de edit_requests (linha 95)
   - Alterar mensagem vazia para "Nenhuma solicitacao pendente."
   - Remover dependencia do data.projects na dependencia do useMemo (nao aplicavel, e useEffect)

2. src/components/dashboard/ProximasEntregasPanel.tsx
   - Remover bloco de projetos (linhas 23-53) do useMemo
   - Remover data.projects da lista de dependencias do useMemo
   - Manter apenas tarefas na listagem
```
