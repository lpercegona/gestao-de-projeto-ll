

## Diagnóstico: Serviços não aparecem para o cliente

### Causa raiz
A tabela `proposals` possui políticas RLS que permitem acesso apenas para `admin` e `master_admin`. Não existe nenhuma política de SELECT para clientes, então a query que busca propostas vinculadas ao `client_id` do cliente retorna vazio.

### Correção

**Migration SQL** — Adicionar política RLS na tabela `proposals` permitindo que clientes leiam propostas vinculadas ao seu próprio `client_id`:

```sql
CREATE POLICY "Clients can view own proposals"
  ON public.proposals
  FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'client'::app_role)
    AND client_id = get_user_client_id(auth.uid())
  );
```

### Bug secundário detectado (não relacionado)

O erro no console `record "old" has no field "title"` ocorre no trigger `audit_log_trigger` durante updates na tabela `clients`. O trigger tenta ler `OLD.title` no bloco genérico de UPDATE details (CASE), mas a tabela `clients` não tem coluna `title` — usa `name`. Isso já está tratado no CASE específico, mas o problema pode estar na execução do SQL. Isso será corrigido na mesma migration se confirmado.

### Arquivos a modificar
1. **Migration SQL** — nova política RLS em `proposals`

