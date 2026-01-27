
## Plano: Corrigir Compartilhamento de Relatórios com Opção de Atualizar Link

### Problema Identificado

O sistema atual permite criar múltiplos registros de compartilhamento para o mesmo cliente, causando:

1. Links diferentes sendo gerados a cada clique em "Compartilhar"
2. Senhas anteriores sendo "perdidas" (ficam em registros antigos)
3. Confusão sobre qual link é o válido

### Causa Raiz

1. **Falta constraint UNIQUE**: A tabela `report_shares` permite múltiplos registros por `client_id`
2. **Lógica de criação**: O código usa `insert` que sempre cria novos registros ao invés de verificar se já existe um

---

### Parte 1: Migração do Banco de Dados

**Ação:** Limpar duplicatas e adicionar constraint UNIQUE

```sql
-- 1. Remover duplicatas mantendo apenas o registro mais recente de cada cliente
DELETE FROM report_shares
WHERE id NOT IN (
  SELECT DISTINCT ON (client_id) id
  FROM report_shares
  ORDER BY client_id, created_at DESC
);

-- 2. Adicionar constraint UNIQUE para prevenir duplicatas futuras
ALTER TABLE report_shares 
ADD CONSTRAINT report_shares_client_id_unique UNIQUE (client_id);
```

---

### Parte 2: Nova Funcionalidade - Regenerar Link

Adicionar função para regenerar o `share_token` quando o usuário desejar um novo link:

```typescript
const handleRegenerateLink = async (share: ReportShare) => {
  setShareLoading(true);
  try {
    // Gerar novo UUID para o token
    const newToken = crypto.randomUUID();
    
    const { data: updatedShare, error } = await supabase
      .from('report_shares')
      .update({ share_token: newToken })
      .eq('id', share.id)
      .select()
      .single();

    if (error) throw error;
    setReportShare(updatedShare);
    toast.success('Link regenerado com sucesso! O link anterior não funcionará mais.');
  } catch (error) {
    toast.error('Erro ao regenerar link');
  } finally {
    setShareLoading(false);
  }
};
```

---

### Parte 3: Atualizar Interface do Dialog

**Novo layout do dialog quando share já existe:**

```text
┌─────────────────────────────────────────────────────────────┐
│ Compartilhar Relatório                               [X]    │
├─────────────────────────────────────────────────────────────┤
│ 🌐/🔒 Público/Privado                          [Switch]     │
│       Qualquer pessoa com o link e senha pode ver           │
├─────────────────────────────────────────────────────────────┤
│ 🔑 Protegido por senha                                      │
├─────────────────────────────────────────────────────────────┤
│ Alterar senha                                               │
│ [Nova senha_______________] [Salvar]                        │
├─────────────────────────────────────────────────────────────┤
│ 🔗 Link de compartilhamento                                 │
│ [URL completa exibida]                     [📋] [🔄 Novo]   │
│                                            Copiar  Regenerar│
├─────────────────────────────────────────────────────────────┤
│ ⚠️ Regenerar criará um novo link. O anterior deixará       │
│    de funcionar.                                            │
├─────────────────────────────────────────────────────────────┤
│ 🗑️ Excluir compartilhamento                                 │
│    Remove completamente o link e senha                      │
└─────────────────────────────────────────────────────────────┘
```

**Elementos adicionados:**
- **Botão "Regenerar Link"**: Gera novo `share_token`, invalidando o anterior
- **Aviso visual**: Alerta que o link antigo deixará de funcionar
- **Botão "Excluir"**: Remove completamente o compartilhamento (opcional para reset total)

---

### Parte 4: Atualizar `Reports.tsx`

**Modificações necessárias:**

1. **Adicionar função `handleRegenerateLink`**
2. **Adicionar função `handleDeleteShare`** (opcional, para excluir completamente)
3. **Atualizar `renderShareDialog`** para incluir:
   - Botão de regenerar link ao lado do botão de copiar
   - Aviso sobre invalidação do link anterior
   - Opção de excluir compartilhamento

```typescript
// Nova função para regenerar link
const handleRegenerateLink = async (share: ReportShare) => {
  setShareLoading(true);
  try {
    const newToken = crypto.randomUUID();
    const { data: updatedShare, error } = await supabase
      .from('report_shares')
      .update({ share_token: newToken })
      .eq('id', share.id)
      .select()
      .single();

    if (error) throw error;
    setReportShares(prev => prev.map(s => s.id === share.id ? updatedShare : s));
    toast.success('Link regenerado! O link anterior foi invalidado.');
  } catch (error) {
    toast.error('Erro ao regenerar link');
  } finally {
    setShareLoading(false);
  }
};

// Nova função para excluir compartilhamento
const handleDeleteShare = async (shareId: string, clientId: string) => {
  setShareLoading(true);
  try {
    const { error } = await supabase
      .from('report_shares')
      .delete()
      .eq('id', shareId);

    if (error) throw error;
    setReportShares(prev => prev.filter(s => s.id !== shareId));
    setShareDialogClientId(null);
    toast.success('Compartilhamento excluído');
  } catch (error) {
    toast.error('Erro ao excluir compartilhamento');
  } finally {
    setShareLoading(false);
  }
};
```

---

### Parte 5: Atualizar `ClientReports.tsx`

Aplicar as mesmas modificações:

1. **Adicionar `handleRegenerateLink`**
2. **Adicionar `handleDeleteShare`**
3. **Atualizar interface do dialog**

---

### Parte 6: Atualizar `ClientDetail.tsx`

A aba "Relatórios" no detalhe do cliente usa lógica similar. Aplicar mesmas correções se aplicável.

---

### Resumo das Alterações

| Arquivo | Ação |
|---------|------|
| **Migration SQL** | Limpar duplicatas + adicionar constraint UNIQUE em `client_id` |
| `src/pages/Reports.tsx` | Adicionar `handleRegenerateLink`, `handleDeleteShare`, atualizar dialog |
| `src/pages/ClientReports.tsx` | Adicionar `handleRegenerateLink`, `handleDeleteShare`, atualizar dialog |
| `src/pages/ClientDetail.tsx` | Verificar e aplicar mesmas correções se necessário |

---

### Seção Técnica

**Fluxo corrigido:**

```text
Usuário clica "Compartilhar"
        │
        ▼
Buscar share existente (constraint UNIQUE garante um por cliente)
        │
    ┌───┴───┐
    │       │
    ▼       ▼
Existe   Não existe
    │       │
    │       ▼
    │    Form de criação
    │    (definir senha)
    ▼
Mostrar configurações:
├─ Toggle público/privado
├─ Alterar senha
├─ Copiar link
├─ Regenerar link (novo token)
└─ Excluir compartilhamento
```

**Opções disponíveis para o usuário:**

| Ação | Resultado |
|------|-----------|
| **Alterar senha** | Atualiza `share_password`, link permanece o mesmo |
| **Regenerar link** | Gera novo `share_token`, link anterior para de funcionar |
| **Excluir** | Remove registro, usuário precisará criar novo share do zero |
| **Toggle público** | Ativa/desativa acesso ao link sem removê-lo |

---

### Resultado Esperado

1. **Um único link por cliente**: Constraint UNIQUE garante isso
2. **Senha persistente**: Não é necessário redefinir a cada acesso ao dialog
3. **Mesmo link sempre**: O `share_token` só muda se o usuário clicar em "Regenerar"
4. **Controle total**: Usuário pode trocar senha, regenerar link ou excluir compartilhamento
5. **Feedback claro**: Avisos sobre consequências de regenerar o link
