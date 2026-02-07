

## Plano: Correção de Padding Adicional no Container Principal

### Problema Identificado

Na linha 398-399 do `AppLayout.tsx`, há classes CSS conflitantes e redundantes que geram padding adicional:

**Linha 398 (Container externo):**
```css
className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8 py-0 pb-0 border-0 border-none px-0 pr-0 pl-[3px] lg:pt-[58px]"
```

**Problemas:**
1. `p-4 sm:p-6 lg:p-8` aplica padding que depois é sobrescrito por `py-0 pb-0 px-0 pr-0`
2. Classes conflitantes e redundantes (`border-0 border-none`)
3. `pl-[3px]` adiciona um pequeno gap à esquerda desnecessário

**Linha 399 (Container interno):**
```css
className="min-h-full rounded-tl-[12px] bg-white p-4 sm:p-5"
```

**Problemas:**
1. `p-4 sm:p-5` aplica padding em todas as direções, incluindo top e right
2. Isso cria espaço extra nas laterais e topo que pode parecer excessivo

---

### Solução

Limpar as classes CSS removendo redundâncias e ajustando o padding para ser mais específico:

---

### Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/components/layout/AppLayout.tsx` | Simplificar classes CSS nas linhas 398-399 |

---

### Alterações Detalhadas

#### Linha 398 - Container Externo

**Antes:**
```typescript
<div className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8 py-0 pb-0 border-0 border-none px-0 pr-0 pl-[3px] lg:pt-[58px]">
```

**Depois:**
```typescript
<div className="flex-1 overflow-auto lg:pt-[58px]">
```

**Justificativa:**
- Remove todas as classes de padding conflitantes (`p-4 sm:p-6 lg:p-8 py-0 pb-0 px-0 pr-0 pl-[3px]`)
- Remove classes de borda redundantes (`border-0 border-none`)
- Mantém apenas `lg:pt-[58px]` para compensar o header fixo em desktop
- O padding será gerenciado pelo container interno

---

#### Linha 399 - Container Interno

**Antes:**
```typescript
<div className="min-h-full rounded-tl-[12px] bg-white p-4 sm:p-5">
```

**Depois:**
```typescript
<div className="min-h-full rounded-tl-[12px] bg-white px-4 py-4 sm:px-6 sm:py-5 lg:px-8">
```

**Justificativa:**
- Usa padding específico por direção para melhor controle
- `px-4 py-4` em mobile (16px horizontal, 16px vertical)
- `sm:px-6 sm:py-5` em tablets (24px horizontal, 20px vertical)
- `lg:px-8` em desktop (32px horizontal)
- Permite ajuste independente de cada lado conforme necessário

---

### Resultado Esperado

| Aspecto | Antes | Depois |
|---------|-------|--------|
| Classes CSS | Conflitantes e redundantes | Limpas e específicas |
| Padding esquerdo | 3px extra (`pl-[3px]`) | Removido |
| Controle de espaçamento | Confuso | Claro e responsivo |
| Manutenibilidade | Baixa | Alta |

