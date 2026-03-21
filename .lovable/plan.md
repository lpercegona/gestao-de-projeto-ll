

## Plano: Reestruturar /criativos e /clientes com visual marketing

### 1. Alterar rota `/clientes-info` para `/clientes`

**Arquivos afetados**: `App.tsx`, `Landing.tsx`, `LegalPageLayout.tsx`
- Trocar rota de `/clientes-info` para `/clientes`
- Atualizar links no dropdown "Gestão" em ambos os headers
- Nota: a rota `/clients` (admin) ja existe, mas `/clientes` nao conflita

### 2. Redesign de ForCreatives.tsx e ForClients.tsx

Abandonar o `LegalPageLayout` (que e para paginas juridicas) e criar um layout proprio de marketing, seguindo o mesmo estilo visual da Landing:

**Estrutura de cada pagina:**

1. **Header** — identico ao da Landing (logo, Explorar, dropdown Gestão, Entrar)
2. **Hero section** — titulo grande + subtitulo curto + CTA "Começar Gratuitamente" com animações fade-in
3. **Feature cards grid** — grid 2 colunas (mobile) / 3 colunas (desktop) com icones lucide, titulo curto e paragrafo descritivo por feature, mesmo estilo dos cards da Landing (borda, bg-card, hover shadow, icone em bg-primary/10)
4. **CTA final** — botao "Começar Gratuitamente" centralizado
5. **LegalFooter** — footer padrao

**ForCreatives** — hero: "Mais tempo para criar, menos burocracia" + 6 cards (Timer/Horas, Kanban/Projetos, Propostas/Contratos, Relatorios, Portfolio, Portal do Cliente) com textos descritivos em paragrafo

**ForClients** — hero: "Transparência total nos seus projetos" + 6 cards (Acompanhamento, Horas/Saldo, Solicitações, Relatorios, Calendario, Propostas/Contratos) com textos descritivos em paragrafo

### 3. Arquivos

| Acao | Arquivo |
|------|---------|
| Reescrever | `src/pages/public/ForCreatives.tsx` |
| Reescrever | `src/pages/public/ForClients.tsx` |
| Editar | `src/App.tsx` (rota `/clientes-info` → `/clientes`) |
| Editar | `src/pages/Landing.tsx` (link dropdown → `/clientes`) |
| Editar | `src/components/legal/LegalPageLayout.tsx` (link dropdown → `/clientes`) |

