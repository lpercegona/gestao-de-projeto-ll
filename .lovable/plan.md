

## Plano: Adequacao Visual ao Design System Shadcn/UI

### Objetivo

Padronizar toda a plataforma ORAS seguindo o Design System Shadcn/UI, utilizando a imagem de referencia como padrao visual. As alteracoes abrangem todas as telas (login, dashboards de todos os perfis, listagens, detalhes) garantindo consistencia em cores, espacamentos, tipografia, cards e componentes.

---

### Analise da Imagem de Referencia

A imagem de referencia apresenta as seguintes caracteristicas visuais:

| Elemento | Caracteristicas |
|----------|-----------------|
| **Background** | Fundo branco/neutro (#fff ou similar) |
| **Cards** | Bordas sutis, sem sombra ou sombra minima, cantos arredondados (8px) |
| **Stats Cards** | Layout limpo com titulo pequeno em muted, valor grande bold, icone muted |
| **Typography** | Titulos escuros, descricoes em muted-foreground |
| **Badges** | Bordas suaves, variantes outline para status neutros |
| **Sidebar** | Background levemente diferenciado, navegacao com hover states |
| **Header** | Fundo branco com borda inferior sutil, elementos bem espacados |
| **Calendario** | Estilo minimalista com dia selecionado em fundo escuro |
| **Listas** | Items com padding consistente, separadores sutis |

---

### Alteracoes Globais (index.css)

**1. Ajustar variaveis CSS para tema mais neutro:**

```css
:root {
  --background: 0 0% 100%;
  --foreground: 240 10% 3.9%;
  --card: 0 0% 100%;
  --card-foreground: 240 10% 3.9%;
  --primary: 240 5.9% 10%;
  --primary-foreground: 0 0% 98%;
  --muted: 240 4.8% 95.9%;
  --muted-foreground: 240 3.8% 46.1%;
  --border: 240 5.9% 90%;
  --radius: 0.5rem;
}
```

- Cores mais neutras (cinza com subtom azulado ao inves de roxo)
- Bordas mais suaves
- Primary mais escuro (tons de cinza escuro/preto)

---

### Arquivos a Modificar

#### 1. `src/index.css` - Design Tokens Globais

| Alteracao | Descricao |
|-----------|-----------|
| Variaveis :root | Atualizar cores para paleta neutra Shadcn |
| Variaveis .dark | Manter consistencia no tema escuro |
| Border radius | Padronizar em 0.5rem (8px) |
| Shadows | Usar shadow-sm como padrao em cards |

---

#### 2. `src/components/ui/card.tsx` - Estilo dos Cards

- Adicionar `shadow-sm` como padrao
- Garantir `border-border` consistente
- Hover states opcionais para cards clicaveis

---

#### 3. `src/pages/Login.tsx` - Tela de Login

| Elemento | Alteracao |
|----------|-----------|
| Container | Centralizado com max-w-md, padding adequado |
| Card | Sombra suave, bordas arredondadas |
| Tabs | Estilo consistente com design system |
| Inputs | Bordas neutras, focus states |
| Buttons | Primary escuro, ghost para links |

---

#### 4. `src/pages/Dashboard.tsx` - Dashboard Admin

| Elemento | Alteracao |
|----------|-----------|
| Stats Cards | Titulo xs muted, valor 2xl bold, icone muted no header |
| Grid | Gap consistente (gap-4 para stats, gap-6 para paineis) |
| Paineis | Headers com titulos e contagem, sem bordas excessivas |

---

#### 5. `src/pages/ClientDashboard.tsx` - Dashboard Cliente

| Alteracao | Descricao |
|-----------|-----------|
| Remover PageHeader | Seguir padrao do dashboard admin |
| Stats layout | Grid 2x2 ou 4 colunas |
| Cards de progresso | Estilo consistente |

---

#### 6. `src/pages/CollaboratorDashboard.tsx` - Dashboard Colaborador

| Alteracao | Descricao |
|-----------|-----------|
| Remover PageHeader | Seguir padrao do dashboard admin |
| Stats layout | Grid responsivo |
| Quick Timer | Estilo integrado |

---

#### 7. `src/pages/Clients.tsx` - Listagem de Clientes

| Elemento | Alteracao |
|----------|-----------|
| Tabs | Estilo sutil com contagem em badge |
| Cards de cliente | Hover suave, sombra minima |
| Badges de status | Variantes corretas (outline, secondary, default) |

---

#### 8. `src/pages/Projects.tsx` - Listagem de Projetos

| Alteracao | Descricao |
|-----------|-----------|
| Filtros | Componentes Select padronizados |
| View Toggle | ToggleGroup com estilo consistente |
| Cards/Lista | Espacamento e tipografia padronizados |

---

#### 9. `src/pages/Landing.tsx` - Pagina Inicial Publica

| Elemento | Alteracao |
|----------|-----------|
| Hero | Tipografia e espacamento |
| Feature Cards | Sombra e hover consistentes |
| CTA Section | Cores primary atualizadas |

---

#### 10. `src/components/layout/AppLayout.tsx` - Layout Principal

| Elemento | Alteracao |
|----------|-----------|
| Sidebar | Background card, hover states |
| Header | Border-b sutil, blur/backdrop |
| Nav items | Active state com bg-primary |

---

#### 11. `src/components/dashboard/*` - Paineis do Dashboard

| Componente | Alteracao |
|------------|-----------|
| SolicitacoesPanel | Headers com icone + titulo + contagem |
| ProximasEntregasPanel | Badges de status com cores corretas |
| HorasPorClientePanel | Progress bars estilizadas |
| UltimosRegistrosPanel | Layout de lista consistente |
| QuickActionsPanel | Botoes outline, timer centralizado |
| DashboardCalendar | Dia selecionado com contraste |

---

#### 12. Outras Paginas

| Pagina | Alteracoes |
|--------|------------|
| `ClientDetail.tsx` | Cards e tabs padronizados |
| `ProjectDetail.tsx` | Layout e componentes |
| `Reports.tsx` | Tabelas e filtros |
| `Proposals.tsx` | Cards e dialogs |
| `Settings.tsx` | Tabs e formularios |
| `Preferences.tsx` | Formularios de configuracao |
| `Users.tsx` | Tabela de usuarios |
| `ClientPortal.tsx` | Portal publico estilizado |
| `PublicProposal.tsx` | Visualizacao publica |
| `PublicContract.tsx` | Visualizacao publica |

---

### Componentes UI a Ajustar

| Componente | Alteracao |
|------------|-----------|
| `button.tsx` | Garantir variant default escuro |
| `badge.tsx` | Adicionar variantes de cor especificas |
| `progress.tsx` | Cores consistentes |
| `tabs.tsx` | Estilo sutil com indicadores |
| `input.tsx` | Focus ring sutil |
| `select.tsx` | Estilo consistente com inputs |
| `dialog.tsx` | Overlay e sombras |
| `table.tsx` | Headers e rows estilizados |

---

### Padrao Visual Final

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│ CORES                                                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│ Primary: Cinza escuro (#0f172a ou similar)                                  │
│ Background: Branco puro (#ffffff)                                           │
│ Muted: Cinza claro (#f8fafc)                                               │
│ Border: Cinza sutil (#e2e8f0)                                              │
│ Destructive: Laranja/Vermelho para alertas                                  │
│ Success: Verde para confirmacoes                                            │
├─────────────────────────────────────────────────────────────────────────────┤
│ TIPOGRAFIA                                                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│ Titulos: font-semibold ou font-bold                                         │
│ Subtitulos: text-muted-foreground                                           │
│ Valores grandes: text-2xl font-bold                                         │
│ Labels pequenos: text-xs text-muted-foreground                              │
├─────────────────────────────────────────────────────────────────────────────┤
│ ESPACAMENTO                                                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│ Cards: p-4 ou p-6                                                           │
│ Gap entre cards: gap-4                                                      │
│ Gap entre secoes: gap-6 ou space-y-6                                        │
│ Padding de pagina: p-6 (mantido pelo AppLayout)                             │
├─────────────────────────────────────────────────────────────────────────────┤
│ SOMBRAS E BORDAS                                                            │
├─────────────────────────────────────────────────────────────────────────────┤
│ Cards: border + shadow-sm (opcional)                                        │
│ Hover: shadow-md ou bg-accent                                               │
│ Border radius: rounded-lg (8px)                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### Ordem de Implementacao

**Fase 1: Fundacao**
1. Atualizar `index.css` com novas variaveis de cor
2. Ajustar `tailwind.config.ts` se necessario
3. Atualizar componentes UI base (card, button, badge)

**Fase 2: Layout Principal**
4. Atualizar `AppLayout.tsx` (sidebar, header)
5. Ajustar componentes de navegacao

**Fase 3: Telas de Acesso**
6. Redesign `Login.tsx`
7. Redesign `Landing.tsx`
8. Ajustar `ResetPassword.tsx`

**Fase 4: Dashboards**
9. Finalizar `Dashboard.tsx` (admin)
10. Atualizar `ClientDashboard.tsx`
11. Atualizar `CollaboratorDashboard.tsx`
12. Ajustar paineis do dashboard

**Fase 5: Listagens e Detalhes**
13. `Clients.tsx` e `ClientDetail.tsx`
14. `Projects.tsx` e `ProjectDetail.tsx`
15. `Proposals.tsx`
16. `Reports.tsx`
17. Demais paginas

**Fase 6: Paginas Publicas**
18. `ClientPortal.tsx`
19. `PublicProposal.tsx`
20. `PublicContract.tsx`
21. `SharedReport.tsx`

---

### Secao Tecnica

**Variaveis CSS atualizadas (index.css):**

```css
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --card: 0 0% 100%;
  --card-foreground: 222.2 84% 4.9%;
  --popover: 0 0% 100%;
  --popover-foreground: 222.2 84% 4.9%;
  --primary: 222.2 47.4% 11.2%;
  --primary-foreground: 210 40% 98%;
  --secondary: 210 40% 96.1%;
  --secondary-foreground: 222.2 47.4% 11.2%;
  --muted: 210 40% 96.1%;
  --muted-foreground: 215.4 16.3% 46.9%;
  --accent: 210 40% 96.1%;
  --accent-foreground: 222.2 47.4% 11.2%;
  --destructive: 0 84.2% 60.2%;
  --destructive-foreground: 210 40% 98%;
  --border: 214.3 31.8% 91.4%;
  --input: 214.3 31.8% 91.4%;
  --ring: 222.2 84% 4.9%;
  --radius: 0.5rem;
}
```

**Padrao de Stats Card:**

```typescript
<Card>
  <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
    <CardTitle className="text-sm font-medium text-muted-foreground">
      Titulo
    </CardTitle>
    <Icon className="h-4 w-4 text-muted-foreground" />
  </CardHeader>
  <CardContent>
    <div className="text-2xl font-bold">Valor</div>
    <p className="text-xs text-muted-foreground">Descricao</p>
  </CardContent>
</Card>
```

**Padrao de Lista com Items:**

```typescript
<div className="space-y-3">
  {items.map(item => (
    <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 transition-colors">
      <div className="flex items-center gap-3">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <div>
          <p className="font-medium">{item.title}</p>
          <p className="text-sm text-muted-foreground">{item.subtitle}</p>
        </div>
      </div>
      <Badge variant="outline">{item.status}</Badge>
    </div>
  ))}
</div>
```

