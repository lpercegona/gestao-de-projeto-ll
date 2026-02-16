# Validação Supabase — 2026-02-16

## Contexto
Validação solicitada para confirmar aplicação das migrações de políticas:

- `20260216145659_d6ed658d-0a32-4b5d-86ea-b1e881f4ec85.sql`
- `20260216160000_project_team_access_visibility.sql`
- `20260128155343_ce806069-0e86-41be-9e5b-6812473037ea.sql`

## Resultado da execução no ambiente atual

### 1) Histórico de migrações aplicadas
**Status:** bloqueado por conectividade/autenticação do ambiente.

- O binário `supabase` não está instalado no container.
- A tentativa de `npx supabase` foi bloqueada por política de rede (403 do registry npm).
- O endpoint do projeto Supabase respondeu `403 Forbidden` já no health-check (`/auth/v1/health`) a partir deste ambiente.

Sem acesso administrativo ao banco/projeto (service role/CLI funcional), não foi possível consultar `supabase_migrations.schema_migrations` remotamente.

### 2) Deploy de migrações pendentes
**Status:** não executado no ambiente atual.

Dependente da etapa anterior e do CLI/token de administração. Como o acesso está bloqueado, não há como aplicar migrações daqui com segurança.

### 3) Revalidação de leitura de `profiles` por usuário cliente
**Status:** validação em runtime bloqueada no ambiente atual.

Foi possível confirmar localmente que as migrações-alvo existem no repositório e contêm as políticas/função esperadas:

- `get_user_client_id(_user_id)` com fallback para `client_users` + `clients.user_id`.
- Política de cliente para leitura de `user_project_access` por `projects.client_id = get_user_client_id(auth.uid())`.
- Política de cliente para leitura de `profiles` de membros vinculados aos projetos do cliente.
- Política para usuário autenticado visualizar acessos de membros do mesmo projeto e perfis dos colegas de projeto.

### 4) Confirmação visual nos cards de `ClientProjects` (lista e kanban)
**Status:** validação funcional remota bloqueada.

Foi validado no código que lista e kanban constroem membros via `user_project_access + owner_id + created_by`, buscam perfis em `profiles` e renderizam `avatar_url` com fallback para iniciais (`full_name`/`email`).

## Artefato para repetir a validação
Foi adicionado o script `scripts/validate-supabase-policies.mjs`, que:

1. testa conectividade básica com o projeto;
2. imprime SQL para conferência de histórico de migração;
3. imprime SQL para validar leitura de perfis sob contexto de cliente;
4. descreve o checklist para cards em lista/kanban.

> Execução atual do script retorna bloqueio (`HTTP 403`) neste ambiente, indicando impedimento externo de acesso ao projeto Supabase.
