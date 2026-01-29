

## Plano: Upload de Logo do Cliente + Exibição de Campos Personalizados nos Relatórios

Este plano detalha as etapas para implementar as seguintes funcionalidades:

1.  **Upload de Logo do Cliente**: Permitir que administradores façam upload de logos para os clientes, com ajustes automáticos de dimensão e um limite de tamanho de arquivo.
2.  **Exibição da Logo no Relatório Compartilhável**: Garantir que a logo do cliente seja exibida corretamente nos relatórios compartilhados.
3.  **Opção de Exibir Campos Personalizados no Relatório**: Adicionar uma flag `show_in_report` na tabela `project_columns` para controlar a visibilidade de campos personalizados em relatórios.
4.  **Mover Edição de Campos Personalizados**: Centralizar a gestão de campos personalizados na área de edição do perfil do cliente.
5.  **Verificação de Consistência de Design**: Realizar uma auditoria completa para garantir a padronização e consistência visual em todas as interfaces, tanto em desktop quanto em mobile.

---

### Parte 1: Upload de Logo do Cliente

#### 1.1 Criar Bucket de Storage

Criar um novo bucket público chamado `client-logos` para armazenar as logos dos clientes.

```sql
INSERT INTO storage.buckets (id, name, public) 
VALUES ('client-logos', 'client-logos', true);

-- Política para permitir que administradores façam upload de logos
CREATE POLICY "Admins can upload client logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'client-logos'
  AND is_admin_or_master(auth.uid())
);

-- Política para permitir que qualquer pessoa visualize as logos
CREATE POLICY "Anyone can view client logos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'client-logos');

-- Política para permitir que administradores atualizem logos
CREATE POLICY "Admins can update client logos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'client-logos' AND is_admin_or_master(auth.uid()));

-- Política para permitir que administradores excluam logos
CREATE POLICY "Admins can delete client logos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'client-logos' AND is_admin_or_master(auth.uid()));
```

#### 1.2 Atualizar Diálogo de Edição do Cliente

**Arquivo:** `src/pages/ClientDetail.tsx`

*   Substituir o campo de input de URL por um componente de upload de arquivos.
*   **Formatos Suportados**: `.svg`, `.png`, `.webp`.
*   **Limite de Tamanho**: **1MB** por arquivo.
*   **Ajuste Automático**: A logo será renderizada com `object-contain` dentro de um container de tamanho fixo, garantindo que se ajuste automaticamente independente das dimensões originais.
*   **Pré-visualização**: Exibir um preview da logo carregada com as mesmas proporções que aparecerá no relatório.
*   **Armazenamento**: Salvar os arquivos no caminho `{clientId}/logo.{extensão}` dentro do bucket `client-logos`.

**Interface de Upload Proposta:**
```text
┌─────────────────────────────────────────┐
│ ┌─────────┐                             │
│ │  LOGO   │  ○ Alterar logo             │
│ │ PREVIEW │  SVG, PNG, WEBP. Max 1MB    │
│ └─────────┘  Ajuste automático          │
└─────────────────────────────────────────┘
```

**CSS para ajuste automático:**
```css
.client-logo-container {
  width: 80px;
  height: 80px;
}

.client-logo-container img {
  width: 100%;
  height: 100%;
  object-fit: contain; /* Ajusta mantendo proporções */
}
```

---

### Parte 2: Campos Personalizados com Opção de Exibir no Relatório

#### 2.1 Migração de Banco de Dados

Adicionar uma nova coluna booleana `show_in_report` à tabela `project_columns`.

```sql
ALTER TABLE public.project_columns
ADD COLUMN show_in_report boolean NOT NULL DEFAULT false;
```

#### 2.2 Atualizar Função RPC do Relatório Compartilhado

**Função:** `get_shared_report_project_columns`

Modificar a função para que ela retorne apenas as colunas onde `show_in_report` seja `true`.

```sql
CREATE OR REPLACE FUNCTION public.get_shared_report_project_columns(p_token text)
RETURNS TABLE(column_id uuid, column_name text, column_type text, column_options text[])
LANGUAGE sql SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT
    pc.id as column_id,
    pc.name as column_name,
    pc.type as column_type,
    pc.options as column_options
  FROM project_columns pc
  JOIN report_shares rs ON pc.client_id = rs.client_id
  WHERE rs.share_token = p_token
    AND rs.is_public = true
    AND pc.show_in_report = true;  -- NOVO FILTRO APLICADO
$$;
```

#### 2.3 Atualizar Interfaces e Tipos

**Arquivos:** `src/contexts/DataContext.tsx`, `src/types/index.ts`, `src/pages/ClientReports.tsx`

*   Adicionar o campo `show_in_report: boolean` à interface `ProjectColumn`.
*   Garantir que as queries e componentes que consomem esses dados considerem a nova flag.

---

### Parte 3: Mover Edição de Campos Personalizados para o Perfil do Cliente

#### 3.1 Criar Novo Componente `ClientCustomFieldsSection`

**Novo arquivo:** `src/components/client/ClientCustomFieldsSection.tsx`

*   Este componente será responsável por gerenciar a criação, edição, exclusão e a configuração da flag `show_in_report` para os campos personalizados de um cliente específico.
*   A interface deve ser intuitiva, permitindo fácil visualização e manipulação dos campos.

**Estrutura Visual Proposta:**
```text
┌─────────────────────────────────────────────────────┐
│ Campos Personalizados                               │
├─────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────┐ │
│ │ Status do Projeto  [Seleção] [✓ Exibir] [✎][🗑]│ │
│ │   • Em Andamento                                │ │
│ │   • Concluído                                   │ │
│ │   • Pausado                                     │ │
│ └─────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────┐ │
│ │ Categoria         [Texto]   [☐ Exibir] [✎][🗑] │ │
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│ [+ Adicionar Campo]                                 │
└─────────────────────────────────────────────────────┘
```

#### 3.2 Adicionar Seção ao Diálogo de Edição do Cliente

**Arquivo:** `src/pages/ClientDetail.tsx`

*   Integrar o novo componente `ClientCustomFieldsSection` ao diálogo de edição do cliente, possivelmente como uma nova aba ou seção expansível.

**Navegação Proposta:**
```text
┌───────────────────────────────────────────────────────┐
│ Editar Cliente                                        │
├───────────────────────────────────────────────────────┤
│ [Dados Gerais] [Campos Personalizados]                │
├───────────────────────────────────────────────────────┤
│                                                       │
│ ... (conteúdo da aba selecionada)                    │
│                                                       │
└───────────────────────────────────────────────────────┘
```

#### 3.3 Simplificar Interface em `Projects.tsx`

**Arquivo:** `src/pages/Projects.tsx`

*   Remover a funcionalidade de criação e edição de campos personalizados desta página.
*   Manter apenas a exibição e seleção dos valores dos campos existentes.
*   Adicionar um link ou botão que direcione o usuário para a área de gerenciamento de campos no perfil do cliente.

---

### Parte 4: Verificação de Consistência de Design e Padronização

Esta etapa envolve uma auditoria completa da plataforma para garantir consistência visual e funcional em todos os dispositivos.

#### 4.1 Padronização de Componentes

| Componente | Padrão a Verificar |
|------------|-------------------|
| **Botões** | Tamanhos consistentes (sm, md, lg), espaçamento interno, ícones com `ICON_SIZES` do design-tokens |
| **Cards** | Padding uniforme (`CARD_PADDING`), border-radius, sombras |
| **Diálogos** | Largura máxima, padding, footer alignment (`DIALOG_FOOTER`) |
| **Formulários** | Labels, inputs, espaçamento entre campos |
| **Tabelas** | Header styling, row hover, responsividade |
| **Tipografia** | Hierarquia de títulos, tamanhos de fonte |

#### 4.2 Responsividade Mobile

**Páginas a Verificar:**

| Página | Verificações |
|--------|-------------|
| `Dashboard.tsx` | Cards empilhados, gráficos redimensionados |
| `Projects.tsx` | Kanban horizontal scroll, filtros colapsáveis |
| `ClientDetail.tsx` | Tabs navegáveis, diálogos full-width |
| `Reports.tsx` | Tabelas com scroll horizontal |
| `Settings.tsx` | Menu lateral como drawer |
| `SharedReport.tsx` | Layout otimizado para visualização |

#### 4.3 Componentes a Padronizar

**Arquivo:** `src/lib/design-tokens.ts`

Verificar e atualizar tokens de design:

```typescript
// Garantir uso consistente em toda a aplicação
export const ICON_SIZES = {
  xs: 'w-3 h-3',
  sm: 'w-3.5 h-3.5',
  md: 'w-4 h-4',
  lg: 'w-5 h-5',
  xl: 'w-6 h-6',
} as const;

export const SPACING = {
  page: 'p-4 sm:p-6 lg:p-8',
  section: 'space-y-4 sm:space-y-6',
  card: 'p-4 sm:p-6',
} as const;

export const BREAKPOINTS = {
  mobile: 'max-w-full',
  tablet: 'sm:max-w-xl',
  desktop: 'lg:max-w-4xl',
} as const;
```

#### 4.4 Checklist de Consistência

- [ ] Todos os botões de ação usam `ACTION_BUTTON` tokens
- [ ] Ícones seguem `ICON_SIZES` padrão
- [ ] Diálogos têm `max-h-[90vh]` e `overflow-y-auto`
- [ ] Cards usam `CARD_PADDING` consistente
- [ ] Formulários têm labels e mensagens de erro padronizados
- [ ] Tabelas são responsivas com scroll horizontal em mobile
- [ ] Headers de página seguem `PageHeader` component
- [ ] Loading states usam `Loader2` com animação `animate-spin`
- [ ] Empty states são consistentes em toda a aplicação
- [ ] Toasts usam `sonner` com mensagens padronizadas

---

### Resumo de Arquivos a Serem Modificados/Criados

| Arquivo | Alteração |
|---------|-----------|
| `supabase/migrations/...` | Criar bucket `client-logos`, adicionar coluna `show_in_report`, atualizar RPC |
| `src/pages/ClientDetail.tsx` | Upload de logo com ajuste automático, seção de campos personalizados com tabs |
| `src/components/client/ClientCustomFieldsSection.tsx` | **NOVO** - Componente de gestão de campos |
| `src/contexts/DataContext.tsx` | Adicionar `show_in_report` à interface e queries |
| `src/types/index.ts` | Atualizar interface `ProjectColumn` |
| `src/pages/Projects.tsx` | Simplificar seção de campos (somente seleção de valores) |
| `src/pages/SharedReport.tsx` | Exibir logo do cliente no header com `object-contain` |
| `src/pages/ClientReports.tsx` | Filtrar campos com `show_in_report = true` |
| `src/lib/design-tokens.ts` | Adicionar tokens de SPACING e BREAKPOINTS |
| Múltiplos arquivos | Padronização de componentes e responsividade |

---

### Seção Técnica

#### Fluxo de Upload de Logo com Ajuste Automático

```text
1. Usuário clica em "Alterar logo" → abre seletor de arquivos
2. Valida:
   - Tipo: svg/png/webp
   - Tamanho: max 1MB
3. Upload para bucket 'client-logos' no path: {clientId}/logo.{ext}
4. Obtém URL pública com cache buster (?t=timestamp)
5. Atualiza clients.logo_url no banco
6. Renderização com object-contain garante ajuste automático
```

#### CSS de Ajuste Automático

```css
/* Container com tamanho fixo */
.logo-container {
  @apply w-20 h-20 flex items-center justify-center bg-muted rounded-lg overflow-hidden;
}

/* Imagem se ajusta mantendo proporções */
.logo-container img {
  @apply max-w-full max-h-full object-contain;
}
```

#### Estrutura do Campo show_in_report

```text
project_columns
├── id (uuid)
├── name (text)
├── type (text)
├── options (text[])
├── client_id (uuid)
├── created_at (timestamp)
└── show_in_report (boolean) ← NOVO

Quando show_in_report = true:
  - Campo aparece nos relatórios compartilhados
  - Campo aparece nos relatórios do cliente
  
Quando show_in_report = false:
  - Campo é usado apenas internamente
  - Não aparece em nenhum relatório externo
```

---

### Resultado Esperado

1. **Upload de Logo:**
   - Administradores podem fazer upload de logos diretamente no perfil do cliente
   - Formatos suportados: SVG, PNG, WEBP (max 1MB)
   - Logo se ajusta automaticamente ao espaço disponível, independente das dimensões originais
   - Preview mostra exatamente como a logo aparecerá no relatório

2. **Campos Personalizados:**
   - Toggle visível para cada campo: "Exibir no relatório"
   - Campos marcados aparecem automaticamente nos relatórios compartilhados
   - Gestão centralizada no perfil do cliente (não mais no diálogo de projeto)

3. **Consistência de Design:**
   - Todas as páginas seguem os mesmos padrões visuais
   - Responsividade garantida em mobile e desktop
   - Componentes padronizados usando design tokens
   - Experiência consistente em toda a plataforma

