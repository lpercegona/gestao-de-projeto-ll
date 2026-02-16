

# Plano: Incluir todos os usuarios com acesso nos avatares de projeto

## Problema atual

Os componentes `ProjectListView` e `ProjectKanbanView` constroem a lista de membros do projeto usando apenas a tabela `user_project_access`. Isso exclui:
- O **dono do projeto** (`owner_id`) - o admin que criou o projeto
- O **criador do projeto** (`created_by`) - quem efetivamente registrou o projeto

Se esses usuarios nao estiverem na tabela `user_project_access`, eles nao aparecem nos avatares.

## Solucao

Alterar os dois componentes para incluir `owner_id` e `created_by` de cada projeto na lista de membros, alem dos registros de `user_project_access`.

### 1. Interfaces de Project nos componentes

Adicionar os campos `owner_id` e `created_by` nas interfaces `Project` de ambos os componentes (`ProjectListView` e `ProjectKanbanView`). Esses campos ja existem nos dados vindos do `DataContext`.

### 2. Logica de `projectMembersByProjectId`

Em ambos os componentes, alterar o `useMemo` que monta `projectMembersByProjectId` para incluir:

```text
projects.forEach((project) => {
  const userIds = new Set(
    projectAccess
      .filter((access) => access.project_id === project.id)
      .map((access) => access.user_id)
  );
  // Incluir owner e criador do projeto
  if (project.owner_id) userIds.add(project.owner_id);
  if (project.created_by) userIds.add(project.created_by);
  membersMap[project.id] = Array.from(userIds);
});
```

### 3. Logica de `userIdsWithProjectAccess`

Atualizar o `useMemo` que coleta os IDs de usuarios para busca de perfis, incluindo tambem os `owner_id` e `created_by` dos projetos:

```text
const userIdsWithProjectAccess = useMemo(() => {
  const ids = new Set(projectAccess.map((a) => a.user_id));
  projects.forEach((p) => {
    if (p.owner_id) ids.add(p.owner_id);
    if (p.created_by) ids.add(p.created_by);
  });
  return Array.from(ids);
}, [projectAccess, projects]);
```

### 4. Nenhuma alteracao de banco de dados

Os dados de `owner_id` e `created_by` ja estao disponiveis nos projetos carregados pelo `DataContext`. Nao e necessario alterar RLS ou criar migracoes.

## Secao Tecnica

```text
Arquivos a modificar:
  - src/components/projects/ProjectListView.tsx
    1. Adicionar owner_id? e created_by? na interface Project (linhas ~19-34)
    2. Alterar userIdsWithProjectAccess para incluir owner_id/created_by (linhas ~183-186)
    3. Alterar projectMembersByProjectId para incluir owner_id/created_by (linhas ~227-241)

  - src/components/projects/ProjectKanbanView.tsx
    1. Adicionar owner_id? e created_by? na interface Project (linhas ~19-27)
    2. Alterar userIdsWithProjectAccess para incluir owner_id/created_by (linhas ~164-167)
    3. Alterar projectMembersByProjectId para incluir owner_id/created_by (linhas ~203-221)

Nenhuma migracao SQL necessaria.
```

