
## Plano: Exibição e Edição Inline da Descrição do Cliente

Este plano implementa a exibição da descrição do cliente logo abaixo do título na tela de perfil, com possibilidade de edição inline clicando no texto.

---

### Alterações Necessárias

**Arquivo:** `src/pages/ClientDetail.tsx`

#### 1. Adicionar Estado para Edição Inline

```typescript
// Novo estado para controlar o modo de edição inline
const [isEditingNotes, setIsEditingNotes] = useState(false);
const [inlineNotes, setInlineNotes] = useState('');
```

#### 2. Modificar o Header para Incluir Descrição

**Estrutura Visual:**
```text
┌─────────────────────────────────────────────────────────────┐
│ [←] Nome da Empresa                                    [✏️] │
│     Descrição do cliente aqui (clicável para editar)       │
│     Com formatação WYSIWYG: links, negrito, etc.           │
└─────────────────────────────────────────────────────────────┘
```

**Código do Header Atualizado (linhas 711-726):**

```tsx
{/* Header com título e botão de editar */}
<div className="space-y-2">
  <div className="flex items-center gap-4">
    <Button variant="ghost" size="icon" onClick={() => navigate('/clients')}>
      <ArrowLeft className="h-5 w-5" />
    </Button>
    <div className="flex items-center gap-3 flex-1">
      <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
        {client.company || client.name}
      </h1>
      <Button variant="ghost" size="icon" onClick={() => setIsEditDialogOpen(true)}>
        <Pencil className="w-4 h-4" />
      </Button>
    </div>
  </div>

  {/* Descrição do cliente - modo visualização ou edição */}
  {isEditingNotes ? (
    <div className="ml-12 space-y-2">
      <WysiwygEditor
        value={inlineNotes}
        onChange={setInlineNotes}
        placeholder="Adicione uma descrição para o cliente..."
        minHeight="80px"
      />
      <div className="flex gap-2">
        <Button 
          size="sm" 
          onClick={handleSaveInlineNotes}
          disabled={editSubmitting}
        >
          {editSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Salvar
        </Button>
        <Button 
          size="sm" 
          variant="outline" 
          onClick={() => {
            setIsEditingNotes(false);
            setInlineNotes(client.notes || '');
          }}
        >
          Cancelar
        </Button>
      </div>
    </div>
  ) : (
    <div 
      className="ml-12 cursor-pointer group"
      onClick={() => {
        setInlineNotes(client.notes || '');
        setIsEditingNotes(true);
      }}
    >
      {client.notes ? (
        <div className="relative">
          <WysiwygContent 
            content={client.notes} 
            className="text-muted-foreground"
          />
          <Pencil className="w-3.5 h-3.5 absolute top-0 right-0 opacity-0 group-hover:opacity-50 transition-opacity" />
        </div>
      ) : (
        <p className="text-muted-foreground italic text-sm hover:text-foreground transition-colors">
          Clique para adicionar uma descrição...
        </p>
      )}
    </div>
  )}
</div>
```

#### 3. Adicionar Função para Salvar Notas Inline

```typescript
const handleSaveInlineNotes = async () => {
  if (!clientId) return;
  setEditSubmitting(true);
  try {
    await updateClient(clientId, { notes: inlineNotes });
    toast.success('Descrição atualizada!');
    setIsEditingNotes(false);
  } catch (error) {
    console.error('Error updating notes:', error);
    toast.error('Erro ao atualizar descrição');
  } finally {
    setEditSubmitting(false);
  }
};
```

---

### Comportamento Esperado

| Estado | Exibição |
|--------|----------|
| **Sem descrição** | Texto "Clique para adicionar uma descrição..." em itálico |
| **Com descrição** | Conteúdo formatado em WYSIWYG + ícone de edição ao passar o mouse |
| **Modo edição** | Editor WYSIWYG com botões Salvar/Cancelar |

---

### Fluxo de Interação

```text
1. Usuário visualiza perfil do cliente
2. Descrição aparece abaixo do título (se existir)
3. Ao clicar na descrição:
   - Editor WYSIWYG abre inline
   - Formatação disponível: negrito, itálico, sublinhado, links, bulletpoints
4. Ao clicar "Salvar":
   - Descrição é atualizada no banco
   - Editor fecha e mostra visualização
5. Ao clicar "Cancelar":
   - Alterações descartadas
   - Volta para modo visualização
```

---

### Resumo de Alterações

| Arquivo | Alteração |
|---------|-----------|
| `src/pages/ClientDetail.tsx` | Adicionar estados `isEditingNotes` e `inlineNotes` |
| `src/pages/ClientDetail.tsx` | Adicionar função `handleSaveInlineNotes` |
| `src/pages/ClientDetail.tsx` | Modificar header para incluir área de descrição com edição inline |

---

### Seção Técnica

**Importações já existentes:**
- `WysiwygEditor` e `WysiwygContent` já estão importados no arquivo
- `updateClient` já está disponível via `useData()`

**Posição no layout:**
- A descrição será exibida com `ml-12` (margem esquerda) para alinhar com o título
- Isso compensa o botão de voltar e mantém o alinhamento visual

**Sincronização de estado:**
- O estado `inlineNotes` é inicializado com `client.notes` ao entrar no modo de edição
- Ao cancelar, o estado é resetado para o valor atual do cliente
