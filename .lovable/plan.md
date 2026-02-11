
# Corrigir listagem de solicitacoes no relatorio compartilhavel

## Problema identificado

O arquivo `SharedReport.tsx` chama uma funcao RPC `get_shared_report_requests` que nao existe no banco de dados. Alem disso, ha erros de TypeScript por falta de casting adequado nos dados retornados pelas RPCs existentes.

## Plano de implementacao

### 1. Criar funcao RPC `get_shared_report_requests`

Criar uma nova funcao no banco que retorne as solicitacoes (project_requests e edit_requests) do cliente associado ao token do relatorio compartilhado. A funcao deve retornar dados compativeis com a interface `SharedRequestItem`:

```text
request_id, request_type, title, description, status, created_at, updated_at, deadline, admin_notes
```

A funcao fara UNION entre:
- `project_requests` (tipo 'project') -- solicitacoes de projeto
- `edit_requests` (tipo baseado em proposed_data->>'request_type') -- solicitacoes de edicao/tarefa

Ambas filtradas pelo `client_id` do token via `report_shares`.

### 2. Corrigir erros de TypeScript em `SharedReport.tsx`

- Linhas 185-196: Adicionar casting `as ClientInfo` direto no objeto retornado pela RPC `get_shared_report`.
- Linhas 214-261: Adicionar `as string`, `as number` nos campos mapeados das RPCs de projects, columns, tasks e time_entries.
- Linha 269: Corrigir o casting de requests para mapear os campos corretamente a partir do resultado da nova RPC.

### 3. Filtragem por mes

A filtragem por mes ja esta implementada corretamente no `filteredRequestHistory` (linhas 364-373), usando `isWithinInterval` com base no `created_at`. Os meses das solicitacoes tambem ja sao incluidos nas opcoes do seletor de mes (linhas 308-311). Nenhuma alteracao necessaria aqui -- basta que a RPC retorne os dados corretamente.

## Detalhes tecnicos

### SQL da nova funcao RPC

```text
CREATE OR REPLACE FUNCTION public.get_shared_report_requests(p_token text)
RETURNS TABLE (
  request_id uuid,
  request_type text,
  title text,
  description text,
  status text,
  created_at timestamptz,
  updated_at timestamptz,
  deadline date,
  admin_notes text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  -- Project requests
  SELECT
    pr.id,
    'project'::text,
    pr.title,
    pr.briefing,
    pr.status,
    pr.created_at,
    pr.updated_at,
    pr.desired_deadline,
    pr.admin_notes
  FROM project_requests pr
  JOIN report_shares rs ON rs.client_id = pr.client_id
  WHERE rs.share_token = p_token AND rs.is_public = true

  UNION ALL

  -- Edit requests (edit/task)
  SELECT
    er.id,
    COALESCE(er.proposed_data->>'request_type', 'edit')::text,
    COALESCE(er.proposed_data->>'title', 'Solicitacao de edicao')::text,
    COALESCE(er.proposed_data->>'description', '')::text,
    er.status,
    er.created_at,
    er.updated_at,
    NULL::date,
    er.admin_notes
  FROM edit_requests er
  JOIN report_shares rs ON rs.client_id = er.client_id
  WHERE rs.share_token = p_token AND rs.is_public = true

  ORDER BY created_at DESC;
END;
$$;
```

### Correcoes no TypeScript

Substituir o casting generico `as Record<string, unknown>` por casts tipados em cada campo, por exemplo:

```text
client_id: clientData.client_id as string,
client_name: clientData.client_name as string,
...
```

E para os requests, mapear os campos retornados pela RPC diretamente para `SharedRequestItem`:

```text
setRequests(
  (requestsData || []).map((r: any) => ({
    request_id: r.request_id,
    request_type: r.request_type,
    title: r.title,
    description: r.description,
    status: r.status,
    created_at: r.created_at,
    updated_at: r.updated_at,
    deadline: r.deadline,
    admin_notes: r.admin_notes,
  }))
  .sort(...)
);
```
