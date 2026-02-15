

# Plano: Corrigir Carregamento de Templates de Email e Implementar Hierarquia Master/Admin

## Problema Raiz Identificado

A tabela `email_templates` possui uma **constraint UNIQUE na coluna `slug`** (`email_templates_slug_key`), o que impede a criacao de copias pessoais dos templates. Quando um admin acessa a aba de Notificacoes, o sistema tenta inserir copias com o mesmo slug (ex: `proposal_sent`), mas a constraint bloqueia a insercao, gerando erro.

Atualmente existem apenas 2 templates globais no banco:
- `proposal_sent` (owner_id = NULL)
- `contract_sent` (owner_id = NULL)

O template `monthly_report_sent` referenciado no frontend nao existe no banco.

---

## Solucao

### 1. Corrigir constraint do banco de dados

**Migracao SQL:**
- Remover a constraint UNIQUE em `slug` sozinha
- Criar nova constraint UNIQUE em `(slug, owner_id)` para permitir um template por slug por usuario
- Como `owner_id` pode ser NULL (templates globais), usar um indice UNIQUE parcial para cobrir ambos os casos

```text
DROP INDEX email_templates_slug_key;
CREATE UNIQUE INDEX email_templates_slug_owner_unique 
  ON email_templates (slug, owner_id) WHERE owner_id IS NOT NULL;
CREATE UNIQUE INDEX email_templates_slug_global_unique 
  ON email_templates (slug) WHERE owner_id IS NULL;
```

### 2. Inserir template ausente

Adicionar o template global `monthly_report_sent` que esta referenciado no frontend mas nao existe no banco.

### 3. Diferenciar comportamento Master Admin vs Admin

**Master Admin:**
- Edita os templates **globais** (owner_id = NULL) diretamente
- Suas edicoes servem como modelo padrao para novos admins
- Edicoes NAO afetam admins que ja possuem copias pessoais

**Admin regular:**
- No primeiro acesso, o sistema copia os templates globais criando versoes pessoais (owner_id = user.id)
- Edita apenas suas copias pessoais
- Alteracoes sao individuais e nao afetam outros usuarios

### 4. Atualizar NotificationTemplatesTab.tsx

**Logica para Master Admin:**
- Buscar templates onde `owner_id IS NULL`
- Salvar diretamente nos templates globais
- Exibir aviso explicando que as alteracoes serao o padrao para novos admins

**Logica para Admin regular:**
- Buscar templates onde `owner_id = user.id`
- Se nao existir, copiar dos globais (owner_id = NULL) para pessoais (owner_id = user.id)
- Salvar apenas nos templates pessoais
- Exibir aviso de que as alteracoes sao individuais

---

## Secao Tecnica

```text
Migracao SQL:
  1. DROP UNIQUE INDEX email_templates_slug_key
  2. CREATE dois indices UNIQUE parciais para (slug, owner_id)
  3. INSERT template global 'monthly_report_sent' com conteudo padrao

Arquivo a modificar:
  - src/components/settings/NotificationTemplatesTab.tsx
    - Importar isMasterAdmin do AuthContext
    - Se master_admin: buscar/editar templates globais (owner_id IS NULL)
    - Se admin: buscar pessoais, copiar globais se nao existir
    - Adicionar mensagem contextual diferente para cada papel
```

