
# Plano: Corrigir exibicao de avatares nos cards de projeto

## Diagnostico

A investigacao revelou duas causas-raiz que impedem a exibicao dos avatares de membros do projeto:

### Causa 1: Tabela `user_project_access`
Os dados de quem tem acesso a cada projeto sao carregados pelo `DataContext` a partir da tabela `user_project_access`. Porem, as politicas de seguranca (RLS) dessa tabela so permitem:
- Admins: ver acessos dos proprios projetos
- Master admins: ver todos
- Usuarios comuns: ver apenas seus proprios registros de acesso

**Clientes nao tem permissao para ver quais colaboradores estao atribuidos aos seus projetos.** Isso faz com que `data.projectAccess` retorne vazio, resultando em zero avatares.

### Causa 2: Tabela `profiles`
Mesmo que a causa 1 fosse resolvida, os componentes `ProjectListView` e `ProjectKanbanView` fazem uma consulta adicional a tabela `profiles` para buscar nomes e fotos dos usuarios. As politicas de seguranca de `profiles` nao permitem que clientes vejam perfis de colaboradores atribuidos aos seus projetos.

## Solucao

### 1. Nova politica RLS em `user_project_access`
Permitir que clientes vejam os registros de acesso dos projetos pertencentes ao seu cliente:

```text
CREATE POLICY "Clients can view project access for own projects"
ON user_project_access FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = user_project_access.project_id
      AND p.client_id = get_user_client_id(auth.uid())
  )
);
```

### 2. Nova politica RLS em `profiles`
Permitir que clientes vejam perfis de colaboradores atribuidos aos projetos do seu cliente:

```text
CREATE POLICY "Clients can view profiles of project members"
ON profiles FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_project_access upa
    JOIN projects p ON p.id = upa.project_id
    WHERE upa.user_id = profiles.user_id
      AND p.client_id = get_user_client_id(auth.uid())
  )
);
```

### 3. Nenhuma alteracao de codigo frontend
Os componentes `ProjectListView` e `ProjectKanbanView` ja possuem toda a logica de exibicao de avatares implementada corretamente. Basta que os dados cheguem do banco.

## Secao Tecnica

```text
Migracao SQL:
  1. CREATE POLICY na tabela user_project_access para clientes
  2. CREATE POLICY na tabela profiles para clientes

Arquivos afetados:
  - Nenhum arquivo frontend precisa ser alterado
  - Apenas uma migracao SQL com duas novas politicas RLS
```
