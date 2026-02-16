

# Plano: Corrigir exibicao de avatares de membros do projeto para todos os perfis

## Diagnostico

Os componentes `ProjectListView` e `ProjectKanbanView` fazem duas consultas para montar os avatares:

1. **profiles** - busca nome, email e foto dos usuarios
2. **user_roles** - busca o papel (admin/client/collaborator) de cada usuario

Depois, na construcao de `projectMembersByProjectId`, o codigo filtra os membros assim:

```text
membersMap[project.id] = Array.from(userIds).filter((userId) => Boolean(allowedRolesByUserId[userId]));
```

O problema esta na tabela `user_roles`, cujas politicas RLS permitem:
- **Usuarios comuns**: ver apenas o proprio papel (`auth.uid() = user_id`)
- **Admins**: ver papeis de usuarios que eles "possuem" (com `owner_id` correspondente)
- **Master admins**: ver todos

Resultado: quando um admin consulta os papeis de todos os membros do projeto, so recebe de volta o proprio papel (e de usuarios subordinados). Os demais sao filtrados, resultando em apenas o proprio avatar visivel.

A tabela `profiles` tem politicas mais permissivas (clientes e colaboradores ja conseguem ver perfis de membros de seus projetos), entao os dados de perfil chegam corretamente. O gargalo e exclusivamente a consulta de `user_roles` e o filtro subsequente.

## Solucao

Remover a dependencia de `user_roles` para decidir quais avatares exibir. Se um usuario esta em `user_project_access`, ou e `owner_id`/`created_by` do projeto, ele deve aparecer nos avatares independentemente do seu papel.

### Alteracoes em ambos os componentes

1. **Remover a consulta a `user_roles`** do `useEffect` que busca perfis
2. **Remover o estado `allowedRolesByUserId`**
3. **Simplificar `projectMembersByProjectId`** para usar apenas a existencia do perfil como criterio de exibicao (em vez do papel)

### Antes (em ambos os componentes):

```text
membersMap[project.id] = Array.from(userIds).filter((userId) => Boolean(allowedRolesByUserId[userId]));
```

### Depois:

```text
membersMap[project.id] = Array.from(userIds).filter((userId) => Boolean(profilesByUserId[userId]));
```

Isso garante que qualquer usuario cujo perfil foi carregado com sucesso aparecera nos avatares, sem depender de uma consulta a `user_roles` que e bloqueada por RLS.

## Secao Tecnica

```text
Arquivos a modificar:
  - src/components/projects/ProjectListView.tsx
    1. Remover estado allowedRolesByUserId (linha ~182)
    2. Remover consulta a user_roles do useEffect (linhas ~207-211)
    3. Remover processamento de roles (linhas ~229-234)
    4. Remover setAllowedRolesByUserId (linha ~237)
    5. Alterar filtro em projectMembersByProjectId: trocar allowedRolesByUserId por profilesByUserId (linha ~269)
    6. Remover allowedRolesByUserId das dependencias do useMemo (linha ~273)

  - src/components/projects/ProjectKanbanView.tsx
    1. Remover estado allowedRolesByUserId (linha ~165)
    2. Remover consulta a user_roles do useEffect (linhas ~188-192)
    3. Remover processamento de roles (linhas ~210-215)
    4. Remover setAllowedRolesByUserId (linha ~218)
    5. Alterar filtro em projectMembersByProjectId: trocar allowedRolesByUserId por profilesByUserId (linha ~252)
    6. Remover allowedRolesByUserId das dependencias do useMemo (linha ~256)

Nenhuma migracao SQL necessaria.
As politicas RLS de profiles ja permitem que todos os papeis vejam os perfis relevantes.
```
