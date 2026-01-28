
## Plano: Correção Completa da Gestão de Usuários Clientes

### Problema Principal Identificado

A função `get_user_client_id` está desatualizada:

```sql
-- ATUAL (incorreto):
SELECT id FROM public.clients WHERE user_id = _user_id LIMIT 1

-- PROBLEMA: Não verifica a tabela client_users
```

Isso causa:
- Usuários vinculados via `client_users` não conseguem ver dashboard, relatórios nem solicitações
- Apenas o usuário definido diretamente em `clients.user_id` tem acesso

---

### Parte 1: Migração do Banco de Dados

**Atualizar a função `get_user_client_id` para verificar `client_users`:**

```sql
CREATE OR REPLACE FUNCTION public.get_user_client_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  -- Primeiro verifica client_users (novo sistema multi-usuário)
  SELECT cu.client_id 
  FROM public.client_users cu
  WHERE cu.user_id = _user_id
  LIMIT 1
$$;
```

Esta alteração garante que:
- Todos os usuários na tabela `client_users` terão acesso aos dados do cliente
- Dashboard, relatórios e solicitações funcionarão para todos os membros da equipe do cliente

---

### Parte 2: Sincronização entre Fluxos de Criação

**Fluxo 1: Configurações > Gestão de Usuários**
- Ao criar usuário com função "Cliente", é obrigatório selecionar uma empresa
- O sistema chama `create-user` edge function que cria o vínculo em `client_users`

**Fluxo 2: Perfil do Cliente > Equipe > Adicionar Acesso**
- Ao adicionar usuário, o sistema chama `create-client-user` edge function
- O vínculo é criado automaticamente para a empresa atual

**Garantir sincronia:**

Modificar `UserEditDialog.tsx` para passar `client_id` ao componente quando editando um usuário cliente, garantindo que a seleção de empresa seja atualizada corretamente.

---

### Parte 3: Melhorias na Interface

**3.1 UserManagementTab.tsx - Melhorar exibição da empresa:**

Já implementado, mas verificar se a empresa está sendo exibida corretamente para todos os usuários clientes.

**3.2 Garantir que UserCreateDialog também tenha seleção de empresa:**

Atualizar `UserCreateDialog.tsx` para incluir seleção obrigatória de empresa quando a função for "Cliente".

---

### Parte 4: Deploy da Edge Function

Garantir que a edge function `create-user` esteja deployada com a lógica atualizada que:
1. Valida que `clientId` é obrigatório quando `role === 'client'`
2. Cria o registro em `client_users`
3. Define `is_primary` baseado na existência de outros usuários

---

### Resumo das Alterações

| Componente | Ação |
|------------|------|
| **Migração SQL** | Atualizar `get_user_client_id` para usar `client_users` |
| `src/components/users/UserCreateDialog.tsx` | Adicionar seleção obrigatória de empresa para função Cliente |
| Edge Function `create-user` | Validar deploy com lógica de vinculação |

---

### Seção Técnica

**Por que a função atual não funciona:**

```text
Tabela clients:
┌────────────────┬─────────────────────────────────┐
│ id             │ user_id (apenas 1 usuário)      │
├────────────────┼─────────────────────────────────┤
│ Box Group      │ ce1b3bdc... (Julia)             │
└────────────────┴─────────────────────────────────┘

Tabela client_users:
┌────────────────┬─────────────────────────────────┐
│ client_id      │ user_id                         │
├────────────────┼─────────────────────────────────┤
│ Box Group      │ ce1b3bdc... (Julia)             │
│ Box Group      │ a57ff7f8... (Augusto)           │
└────────────────┴─────────────────────────────────┘

get_user_client_id('a57ff7f8...'):
  - Consulta: SELECT id FROM clients WHERE user_id = 'a57ff7f8...'
  - Resultado: NULL ← Augusto não está em clients.user_id!
  
CORRIGIDO:
  - Consulta: SELECT client_id FROM client_users WHERE user_id = 'a57ff7f8...'
  - Resultado: 'Box Group' ← Augusto está em client_users!
```

**Fluxo corrigido de criação:**

```text
┌─────────────────────────────────────────────────────────────┐
│                    CRIAÇÃO DE USUÁRIO CLIENTE               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────┐      ┌─────────────────────┐      │
│  │ Configurações >     │      │ Perfil Cliente >    │      │
│  │ Gestão Usuários     │      │ Equipe              │      │
│  │                     │      │                     │      │
│  │ Função: Cliente *   │      │ Email: xxx@xxx.com  │      │
│  │ Empresa: [Select] * │      │ Nome: Fulano        │      │
│  └──────────┬──────────┘      └──────────┬──────────┘      │
│             │                            │                  │
│             ▼                            ▼                  │
│      create-user            create-client-user              │
│      (edge function)        (edge function)                 │
│             │                            │                  │
│             └────────────┬───────────────┘                  │
│                          ▼                                  │
│                   ┌──────────────┐                          │
│                   │ client_users │                          │
│                   │ (inserir)    │                          │
│                   └──────────────┘                          │
│                          │                                  │
│                          ▼                                  │
│              get_user_client_id()                           │
│              (RLS policies)                                 │
│                          │                                  │
│                          ▼                                  │
│              ┌────────────────────────┐                     │
│              │ Acesso a:              │                     │
│              │ - Dashboard            │                     │
│              │ - Relatórios           │                     │
│              │ - Solicitações         │                     │
│              │ - Projetos             │                     │
│              └────────────────────────┘                     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

### Resultado Esperado

1. **Acesso funcional**: Todos os usuários em `client_users` terão acesso aos dados da empresa
2. **Criação sincronizada**: Ambos os fluxos criam registros em `client_users`
3. **Edição consistente**: Alterar empresa de um usuário atualiza corretamente o vínculo
4. **UI clara**: Empresa vinculada é exibida em todas as listagens de usuários
