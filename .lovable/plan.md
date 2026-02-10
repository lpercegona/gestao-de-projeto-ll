

## Plano: Corrigir criacao de perfis de cliente e adicionar redefinicao de senha

### Problema atual
1. O modal de criacao de usuario na pagina de detalhes do cliente ("Adicionar Acesso ao Portal") e simplificado demais - tem apenas campos de nome e email, sem campo de senha, sem selecao de funcao, e usa uma edge function separada (`create-client-user`) que gera senha temporaria aleatoria.
2. Na pagina de Configuracoes/Usuarios, o modal de criacao usa a edge function `create-user` com mais campos (nome, email, senha, funcao, empresa).
3. Nao existe funcionalidade de enviar link de redefinicao de senha.
4. Quando um novo usuario e criado, ele nao recebe um convite/link para definir senha.

### Solucao

#### 1. Substituir o modal customizado por `UserCreateDialog` na pagina de detalhes do cliente

Na `ClientDetail.tsx`, substituir o dialog manual de criacao de usuario pelo componente reutilizavel `UserCreateDialog` que ja existe e usa a edge function `create-user`. Passar as props `defaultRole="client"` e `defaultClientId={clientId}` para pre-configurar o formulario.

Remover:
- O estado `newClientUserEmail`, `newClientUserName`, `creatingUser`
- A funcao `handleCreateClientUser`
- O dialog manual com campos simples

Substituir por:
- Uso do `UserCreateDialog` com `defaultRole="client"` e `defaultClientId={clientId}`

#### 2. Atualizar a edge function `create-user` para enviar link de definicao de senha

Modificar `supabase/functions/create-user/index.ts` para:
- Apos criar o usuario, gerar um link magico de convite usando `supabaseAdmin.auth.admin.generateLink({ type: 'magiclink', email })` ou usar `inviteUserByEmail`
- Alternativamente, usar `supabaseAdmin.auth.admin.generateLink({ type: 'invite', email })` para gerar um link de convite que permite ao usuario definir sua senha
- O link sera retornado na resposta para que possa ser exibido ou enviado

#### 3. Adicionar botao "Enviar link de redefinicao de senha" 

Adicionar na `UserEditDialog` e na listagem de usuarios do cliente na `ClientDetail.tsx`:
- Um botao/acao "Enviar link de redefinicao de senha"
- Que chama `supabase.auth.resetPasswordForEmail(email)` (ja disponivel no frontend)
- Exibir toast de confirmacao

#### 4. Atualizar a edge function `create-client-user` para tambem enviar convite

Modificar `supabase/functions/create-client-user/index.ts` para, ao criar um novo usuario, gerar um link de convite em vez de senha temporaria.

---

### Detalhes tecnicos

**Arquivo: `src/pages/ClientDetail.tsx`**
- Remover estados: `newClientUserEmail`, `newClientUserName`, `creatingUser`
- Remover funcao `handleCreateClientUser`
- Remover dialog manual de criacao (linhas ~1997-2050)
- Substituir por `<UserCreateDialog>` com props pre-configuradas
- Adicionar botao de "Enviar link de redefinicao de senha" na secao de equipe do cliente, no dropdown de acoes de cada usuario

**Arquivo: `src/components/users/UserEditDialog.tsx`**
- Adicionar botao "Enviar link de redefinicao de senha" no footer do dialog
- Usar `supabase.auth.resetPasswordForEmail(email)` 

**Arquivo: `supabase/functions/create-user/index.ts`**
- Apos criar o usuario com `admin.createUser`, usar `admin.generateLink({ type: 'invite', email })` para gerar link de convite
- Retornar o link na resposta para feedback ao admin
- O Supabase enviara automaticamente o email de convite ao usuario

**Arquivo: `supabase/functions/create-client-user/index.ts`**
- Mesma logica: ao criar novo usuario, usar `admin.generateLink({ type: 'invite', email })` em vez de senha temporaria
- Remover geracao de senha aleatoria
- Retornar informacao de que o convite foi enviado

**Arquivo: `src/pages/ClientDetail.tsx` (secao equipe)**
- No dropdown de acoes de cada membro da equipe (cliente), adicionar opcao "Enviar link de redefinicao de senha"

