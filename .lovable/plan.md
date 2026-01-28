

## Plano: Correção da Seleção de Empresa no Diálogo de Edição de Equipe

### Problema Identificado

Ao editar um membro da equipe na aba "Equipe" do perfil do cliente, a seleção de empresa não está salvando porque **o `client_id` não está sendo passado para o diálogo de edição**.

**Código atual (linha 1183 em ClientDetail.tsx):**
```tsx
onClick={() => clientUser.profile && handleOpenEditUser(clientUser.profile)}
```

**O problema:**
1. A interface `UserProfile` em `ClientDetail.tsx` (linhas 80-86) **não inclui** o campo `client_id`
2. Ao mapear os usuários do cliente (linhas 251-264), o `client_id` da tabela `client_users` **não é incluído** no objeto profile
3. O `UserEditDialog` recebe o usuário sem `client_id`, então `user.client_id` é `undefined`
4. No `useEffect` (linha 131 do dialog), ele define `setClientId(user.client_id || 'none')` = `'none'`

**Resultado:** O select de empresa aparece vazio e qualquer alteração não preserva o vínculo correto.

---

### Solução

**1. Atualizar a interface `UserProfile` em `ClientDetail.tsx`:**

Adicionar o campo `client_id` opcional:

```tsx
interface UserProfile {
  user_id: string;
  full_name: string | null;
  email: string | null;
  role: string | null;
  client_id?: string | null;  // ADICIONAR
}
```

**2. Incluir `client_id` ao mapear os usuários do cliente:**

No bloco de mapeamento (linhas 251-264), incluir o `client_id`:

```tsx
const mappedClientUsers: ClientUser[] = (clientUsersData || []).map(cu => {
  const profile = (profilesData || []).find(p => p.user_id === cu.user_id);
  const role = (rolesData || []).find(r => r.user_id === cu.user_id);
  return {
    ...cu,
    profile: {
      user_id: cu.user_id,
      full_name: profile?.full_name || null,
      email: profile?.email || null,
      role: role?.role || null,
      client_id: cu.client_id,  // ADICIONAR - vínculo da tabela client_users
    }
  };
});
```

---

### Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/pages/ClientDetail.tsx` | Adicionar `client_id` à interface `UserProfile` (linha 85) |
| `src/pages/ClientDetail.tsx` | Incluir `client_id` no mapeamento de `mappedClientUsers` (linha 261) |

---

### Seção Técnica

**Fluxo antes da correção:**

```text
clientUser.profile = {
  user_id: 'abc123',
  full_name: 'Augusto',
  email: 'augusto@email.com',
  role: 'client'
  // client_id: undefined ← PROBLEMA!
}

UserEditDialog recebe → setClientId(undefined || 'none') → 'none'
```

**Fluxo após a correção:**

```text
clientUser.profile = {
  user_id: 'abc123',
  full_name: 'Augusto',
  email: 'augusto@email.com',
  role: 'client',
  client_id: 'e301e81f...'  ← CORRIGIDO!
}

UserEditDialog recebe → setClientId('e301e81f...') → Empresa correta selecionada
```

**Por que isso funciona:**

A tabela `client_users` já contém o vínculo entre usuário e empresa (`client_id`). O problema era apenas que esse dado não estava sendo passado para o componente de edição. Ao incluir `client_id` no objeto `profile`, o `UserEditDialog` consegue pré-selecionar a empresa correta e manter o vínculo ao salvar.

---

### Resultado Esperado

1. Ao abrir o diálogo de edição de um membro da equipe, a empresa correta já estará selecionada
2. Ao salvar, o vínculo será mantido ou atualizado corretamente
3. Sincronia total entre a gestão de equipe no perfil do cliente e a gestão geral em configurações

