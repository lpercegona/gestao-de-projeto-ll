# Plano: Envio Automatico de Relatorio por Email e Credenciais SMTP por Admin

## Resumo

Duas funcionalidades novas:

1. **No perfil do cliente**: opcao de ativar/desativar envio automatico de relatorio mensal por email, com selecao de dia e hora do mes para o disparo.
2. **Nas configuracoes do master admin**: campos para editar credenciais SMTP proprias (host, porta, usuario, senha), permitindo que cada instancia use seu proprio servidor de email.

---

## 1. Envio Automatico de Relatorio no Perfil do Cliente

### Banco de Dados

Adicionar colunas na tabela `clients`:

- `auto_report_enabled` (boolean, default false) - ativa/desativa envio automatico
- `auto_report_day` (integer, default 1) - dia do mes para envio (1-28)
- `auto_report_hour` (integer, default 9) - hora/minuto do dia para envio hora (0-23) minuto (0-59)

### Frontend - Edicao do Cliente (`ClientDetail.tsx`)

No dialog de edicao do cliente, adicionar uma nova secao "Relatorio Automatico" com:

- Switch para ativar/desativar o envio automatico
- Seletor de dia do mes (1 a 28)
- Seletor de hora (00:00 a 23:59)
- Texto explicativo: "O relatorio do mes anterior sera enviado automaticamente para o email do cliente na data e hora configurados."

Os campos serao adicionados ao `editFormData` e salvos via `updateClient`.

### Edge Function - `send-monthly-report`

Nova Edge Function que:

1. Recebe `client_id` como parametro
2. Busca dados do cliente, projetos, tarefas e time entries do mes anterior
3. Busca o link de compartilhamento do relatorio (`report_shares`)
4. Busca o template de email `monthly_report_sent` (pessoal do owner -> global fallback)
5. Busca credenciais SMTP do admin (tabela `smtp_settings` -> fallback para env vars)
6. Substitui placeholders e envia o email

### Agendamento (Cron via pg_cron + pg_net)

Criar um cron job que roda a cada hora e:

1. Consulta clientes com `auto_report_enabled = true`
2. Verifica se a data/hora atual corresponde ao `auto_report_day` e `auto_report_hour`
3. Chama a Edge Function `send-monthly-report` para cada cliente elegivel
4. Registra o envio para evitar duplicatas (coluna `auto_report_last_sent` na tabela `clients`)
5. Adiciona notificação ao usuário admin informando que o relatório automático foi enviado com texto :"O relatório mensal referente ao mês de {{mes do relatorio}} foi enviado ao cliente {{empresa do cliente}}. 

---

## 2. Credenciais SMTP pelo Master Admin

### Banco de Dados

Criar tabela `smtp_settings`:

- `id` (uuid, PK)
- `owner_id` (uuid, referencia ao admin - NULL para configuracao global)
- `smtp_host` (text)
- `smtp_port` (integer, default 587)
- `smtp_user` (text)
- `smtp_pass` (text, armazenado de forma segura)
- `smtp_from_name` (text, nome do remetente)
- `created_at`, `updated_at`

RLS: Apenas master_admin pode gerenciar (ALL). Admins podem ver e editar apenas seus proprios registros.

### Frontend - Configuracoes de Notificacoes (`NotificationTemplatesTab.tsx`)

Adicionar uma secao no topo da aba de Notificacoes (visivel apenas para master admin) com:

- Campos: Host SMTP, Porta, Usuario/Email, Senha, Nome do Remetente
- Botao "Salvar Credenciais"
- Indicador de status (configurado/nao configurado)
- Texto explicativo: "Configure suas credenciais de email para envio de notificacoes. Essas credenciais serao usadas como padrao para todos os envios."
- Instrução abaixo de confirmação de conexão SMTP com o texto: "conectado com o servidor de email [mail.dominio.com](http://mail.dominio.com)" adicionar forma de validação de conexão com o servidor de email.

### Edge Functions - Buscar SMTP do banco

Atualizar `send-proposal-email`, `send-contract-email` e a nova `send-monthly-report` para:

1. Buscar credenciais na tabela `smtp_settings` filtrando pelo `owner_id` do criador
2. Se nao encontrar, usar fallback para as env vars (`SMTP_HOST`, `SMTP_PORT`, etc.)
3. Isso permite que o master admin use credenciais proprias sem depender das variaveis de ambiente

---

## Secao Tecnica

```text
Migracao SQL:
  1. ALTER TABLE clients ADD COLUMN auto_report_enabled boolean DEFAULT false
  2. ALTER TABLE clients ADD COLUMN auto_report_day integer DEFAULT 1
  3. ALTER TABLE clients ADD COLUMN auto_report_hour integer DEFAULT 9
  4. ALTER TABLE clients ADD COLUMN auto_report_last_sent timestamptz
  5. CREATE TABLE smtp_settings (id, owner_id, smtp_host, smtp_port, smtp_user, smtp_pass, smtp_from_name, created_at, updated_at)
  6. RLS para smtp_settings: master_admin ALL, admin SELECT/UPDATE/INSERT own

Arquivos a modificar:
  - src/pages/ClientDetail.tsx
    (adicionar campos auto_report no editFormData e no dialog de edicao)
  - src/components/settings/NotificationTemplatesTab.tsx
    (adicionar secao de credenciais SMTP para master admin)
  - supabase/functions/send-proposal-email/index.ts
    (buscar SMTP de smtp_settings antes de usar env vars)
  - supabase/functions/send-contract-email/index.ts
    (buscar SMTP de smtp_settings antes de usar env vars)

Arquivos novos:
  - supabase/functions/send-monthly-report/index.ts
    (nova Edge Function para envio de relatorio mensal)

Agendamento:
  - INSERT via SQL (nao migracao) para pg_cron job que chama send-monthly-report a cada hora
```