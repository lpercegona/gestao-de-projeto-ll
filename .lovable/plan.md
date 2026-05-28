## Diagnóstico

O modal de edição do cliente (`src/pages/ClientDetail.tsx`) envia o objeto inteiro `editFormData` para `updateClient(...)`, que executa `UPDATE` direto na tabela `clients`.

O problema: o `editFormData` inclui 4 campos que **não existem** na tabela `clients` do banco:

- `cnpj`
- `cpf_responsavel`
- `endereco`
- `responsavel_name`

(Confirmado consultando `information_schema.columns` — a tabela `clients` tem apenas: name, email, company, phone, notes, source, pipeline_status, logo_url, contracted_hours, contract_type, contract_start_date, contract_end_date, contract_months, identity_*, auto_report_*, etc.)

Como o Supabase/PostgREST rejeita o `UPDATE` inteiro quando há colunas inexistentes no payload, **nenhuma** alteração é salva — incluindo `contract_start_date`, `contract_end_date` e `contract_months`. O usuário vê o toast genérico "Erro ao atualizar cliente" (linha 812) e o diálogo permanece sem persistir nada.

Esses 4 campos parecem ter sido adicionados ao formulário pensando na memória "Business Identity Data", mas as colunas reais nunca foram criadas na tabela `clients` — campos fiscais de empresa moram em `profiles` (cnpj, cpf, company_address, etc.), não em `clients`.

## Correção

Sanitizar o payload em `handleEditClient` (`src/pages/ClientDetail.tsx`, ~linha 802) para enviar apenas colunas que existem em `clients`. Construir explicitamente o objeto a ser passado para `updateClient`:

```ts
const payload = {
  name, email, company, phone,
  contracted_hours, pipeline_status, source, notes, logo_url,
  contract_type, contract_start_date, contract_end_date, contract_months,
  auto_report_enabled, auto_report_day, auto_report_hour, auto_report_minute,
};
await updateClient(clientId, payload);
```

Remover do payload (mas manter no estado local do formulário, caso sejam usados visualmente): `cnpj`, `cpf_responsavel`, `endereco`, `responsavel_name`.

Adicionalmente: melhorar o tratamento de erro em `handleEditClient` para exibir `error.message` no toast, evitando que falhas futuras voltem a ficar invisíveis.

## Fora de escopo

- Não criar colunas novas em `clients` (cnpj/endereco/etc.) — esses dados pertencem a outro contexto (perfil do gestor) e não foram solicitados.
- Não alterar `DataContext.updateClient` nem o schema do banco.

## Arquivos afetados

- `src/pages/ClientDetail.tsx` — sanitização do payload + mensagem de erro mais clara.
