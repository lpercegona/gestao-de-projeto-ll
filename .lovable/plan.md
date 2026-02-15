
# Plano: Separar Nome de Remetente das Credenciais SMTP

## Resumo

Atualmente, o nome de remetente (smtp_from_name) esta acoplado ao card de credenciais SMTP, visivel apenas para master admin. O objetivo e:

1. Separar a UI em dois cards distintos na aba Notificacoes
2. Card "Credenciais SMTP" - visivel apenas para master admin (host, porta, usuario, senha, teste de conexao)
3. Card "Nome do Remetente" - visivel para todos os admins, permitindo que cada admin defina seu proprio nome de remetente salvo na tabela `smtp_settings` com seu `owner_id`

## Mudancas

### 1. Banco de Dados - RLS

A tabela `smtp_settings` ja tem RLS para admin gerenciar seus proprios registros (`owner_id = auth.uid()`). Porem, admins regulares precisam tambem ler as credenciais globais (owner_id IS NULL) para saber se o SMTP esta configurado. A policy "Authenticated can read" dos email_templates nao se aplica aqui. Sera necessario adicionar uma policy SELECT para admins lerem o registro global (apenas para verificar status de conexao).

**Migracao SQL:**
- Adicionar policy SELECT na tabela `smtp_settings` para admins poderem ler o registro global (is null) - apenas para exibir status de conexao

### 2. Frontend - SmtpSettingsSection.tsx

Refatorar para conter apenas os campos de credenciais (host, porta, usuario, senha), sem o campo "Nome do Remetente":
- Remover o campo `smtp_from_name` do formulario
- Manter botoes "Testar Conexao" e "Salvar Credenciais"
- Manter badge de status de conexao

### 3. Frontend - Novo componente SenderNameSection.tsx

Criar um novo componente Card para edicao do nome de remetente:
- Campo "Nome do Remetente" com input
- Botao "Salvar"
- Logica: buscar/criar registro em `smtp_settings` com `owner_id = user.id`
- Se o admin nao tem registro proprio, criar um ao salvar (apenas com `smtp_from_name`, demais campos vazios)
- Texto explicativo: "Este nome sera exibido como remetente nos emails enviados por voce."

### 4. Frontend - NotificationTemplatesTab.tsx

Reorganizar a exibicao:
- `SmtpSettingsSection` continua visivel apenas para `isMasterAdmin`
- `SenderNameSection` (novo) visivel para todos os admins (master e regular)
- Ordem: Credenciais SMTP (master only) -> Nome do Remetente (todos admins) -> Templates

### 5. Edge Functions - Resolver fromName por admin

Atualizar as 3 Edge Functions (`send-proposal-email`, `send-contract-email`, `send-monthly-report`) para:
1. Buscar `smtp_from_name` do registro do owner (admin que criou o item) em `smtp_settings`
2. Para credenciais de conexao (host/port/user/pass): manter a logica atual (owner -> global -> env vars)
3. Para `fromName`: priorizar o registro do owner, depois global, depois vazio

Isso permite que cada admin tenha seu proprio nome de remetente mesmo usando as credenciais SMTP globais do master admin.

---

## Secao Tecnica

```text
Migracao SQL:
  1. CREATE POLICY "Admin can read global smtp settings" ON smtp_settings
     FOR SELECT USING (
       has_role(auth.uid(), 'admin'::app_role)
       AND owner_id IS NULL
     );

Arquivos a modificar:
  - src/components/settings/SmtpSettingsSection.tsx
    (remover campo smtp_from_name do formulario)
  - src/components/settings/NotificationTemplatesTab.tsx
    (adicionar SenderNameSection para todos admins)
  - supabase/functions/send-proposal-email/index.ts
    (separar resolucao de fromName da resolucao de credenciais)
  - supabase/functions/send-contract-email/index.ts
    (idem)
  - supabase/functions/send-monthly-report/index.ts
    (idem)

Arquivos novos:
  - src/components/settings/SenderNameSection.tsx
    (card para edicao do nome de remetente por admin)
```
