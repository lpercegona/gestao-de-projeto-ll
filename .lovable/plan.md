## Plano: Dropdown "Gestão" + Páginas Criativos e Clientes

### Resumo

Transformar o link "Gestão" no header (Landing + LegalPageLayout) em um dropdown com duas opções ("Criativos" e "Clientes"), e criar as respectivas páginas públicas descrevendo as features da plataforma para cada perfil.

### 1. Criar páginas públicas


| Página         | Rota         | Arquivo                             |
| -------------- | ------------ | ----------------------------------- |
| Para Criativos | `/criativos` | `src/pages/public/ForCreatives.tsx` |
| Para Clientes  | `/clientes`  | `src/pages/public/ForClients.tsx`   |


**Criativos** — features voltadas ao profissional criativo:

- Controle de horas e timer integrado
- Gestão de projetos com Kanban e tarefas
- Propostas e contratos digitais
- Relatórios automáticos por projeto/mês
- Portfólio público e perfil profissional
- Portal do cliente com acesso exclusivo

**Para Clientes** — features voltadas à empresa contratante:

- Acompanhamento de projetos em tempo real
- Relatórios de horas consumidas e saldo
- Solicitação de novos projetos e tarefas
- Acesso a relatórios e entregas
- Calendário de prazos e entregas
- Aprovação de propostas e contratos

Ambas usarão o `LegalPageLayout` adaptado (ou um layout público compartilhado com o mesmo header/footer).

### 2. Dropdown no header

Substituir o link "Gestão" por um `DropdownMenu` (shadcn) com dois itens:

- "Criativos" → `/criativos`
- "Clientes" → `/clientes`

Aplicar em **dois locais**:

- `src/pages/Landing.tsx` (header, linhas 109-114)
- `src/components/legal/LegalPageLayout.tsx` (header, linhas 32-36)

### 3. Rotas no App.tsx

Adicionar as 2 rotas públicas:
```