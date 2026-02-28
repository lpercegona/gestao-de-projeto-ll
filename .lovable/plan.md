

# Substituir personalização por Hue por cores Tailwind completas

## Resumo

Remover o sistema de personalização baseado em hue variável (slider 0-360) e substituí-lo por seleção direta entre as 22 famílias de cores Tailwind. Corrigir o alto contraste para inverter corretamente as tonalidades (ex: slate-100 vira slate-900). Manter bordas e botões destacados coerentes com a cor escolhida.

## 1. Migração do banco de dados

Adicionar coluna `theme_color` (texto, default `'slate'`) na tabela `theme_settings` para armazenar a família de cor selecionada. As colunas `header_hue` e `menu_hue` permanecem no banco por compatibilidade mas deixam de ser usadas no front.

## 2. Atualizar CSS variables (`src/index.css`)

Remover o bloco de variáveis baseadas em hue (`--header-hue`, `--menu-hue`, `--header-background`, `--menu-surface`, etc.) do `.dark` e substituir por variáveis estáticas com valores padrão (slate). Criar um mapeamento de classes CSS para cada uma das 22 cores:

```text
Famílias: slate, gray, zinc, neutral, stone, red, orange, amber,
          yellow, lime, green, emerald, teal, cyan, sky, blue,
          indigo, violet, purple, fuchsia, pink, rose
```

Para cada cor, gerar uma classe `.theme-{cor}` que define:
- `--header-bg`: cor-100 (light) / cor-900 (dark/high-contrast)
- `--header-border`: cor-200 / cor-800
- `--menu-surface`: cor-50 / cor-950
- `--menu-surface-hover`: cor-100 / cor-900
- `--menu-foreground`: cor-700 / cor-200
- `--menu-border`: cor-200 / cor-800
- `--accent-theme`: cor-500 (para botões e destaques)

No modo `.high-contrast`, cada classe `.theme-{cor}` terá inversão completa (100→900, 200→800, etc.).

## 3. Atualizar `ThemeContext.tsx`

- Remover `headerHue` do `ThemeSettings` interface e do `defaultTheme`
- Adicionar `themeColor: string` (default `'slate'`)
- No `applyTheme`, em vez de setar `--header-hue`/`--menu-hue`, aplicar a classe `theme-{cor}` no `<html>`
- Remover referências a `HEADER_HUE_STORAGE_KEY` e `MENU_HUE_STORAGE_KEY`
- Ler `theme_color` da tabela `theme_settings`

## 4. Atualizar `ThemeSettings.tsx`

- Remover o slider de hue e todo o bloco "Header e Menu (mesma regra de cor)"
- Remover `SurfaceHues` interface e estado `surfaceHues`
- Adicionar estado `themeColor` com valor inicial `'slate'`
- Criar grid visual com as 22 cores, cada uma representada por um círculo colorido com o tom 500 da família
- Ao selecionar uma cor, aplicar preview imediato (classe no `<html>`)
- No `handleSave`, salvar `theme_color` junto com as demais configs (sem `header_hue`/`menu_hue`)
- Atualizar a seção de preview para mostrar bordas e botões na cor selecionada

## 5. Atualizar `AppLayout.tsx`

- Substituir referências a `text-menu-foreground` por classes que usam as novas CSS variables (`text-[hsl(var(--menu-foreground))]`)
- Isso já funciona porque as variáveis serão definidas pelas classes `.theme-{cor}`

## 6. Alto contraste corrigido

A classe `.high-contrast` no `index.css` continuará com suas regras base (preto/branco/amarelo), mas as classes `.theme-{cor}` dentro de `.high-contrast` terão inversão adequada:
- Fundos claros (100) viram escuros (900)
- Bordas claras (200) viram bordas fortes (800)
- Textos escuros (700) viram claros (200)
- O accent se mantém no tom 500 para visibilidade

## Detalhes técnicos

### Estrutura das 22 classes CSS (exemplo para slate):
```css
.theme-slate {
  --header-bg: 210 40% 96.1%;      /* slate-100 */
  --header-border: 214.3 32% 91.4%; /* slate-200 */
  --menu-surface: 210 40% 98%;      /* slate-50 */
  --menu-surface-hover: 210 40% 96.1%;
  --menu-foreground: 215.3 25% 27%; /* slate-700 */
  --menu-border: 214.3 32% 91.4%;
  --accent-theme: 215.4 16.3% 47%;  /* slate-500 */
}
.high-contrast .theme-slate,
.dark .theme-slate {
  --header-bg: 222.2 47.4% 11.2%;   /* slate-900 */
  --header-border: 217.2 33% 17.5%;  /* slate-800 */
  --menu-surface: 222.2 84% 4.9%;   /* slate-950 */
  --menu-foreground: 214.3 32% 91.4%; /* slate-200 */
  /* ... */
}
```

### Salvamento no banco:
```typescript
await supabase.from('theme_settings').update({
  primary_color: colors.primary,
  secondary_color: colors.secondary,
  accent_color: colors.accent,
  theme_color: themeColor, // 'slate' | 'blue' | 'red' | ...
  font_family: fontFamily,
}).eq('id', '...');
```

### Grid de seleção de cores:
Grid 6x4 com círculos de 32px, cada um com a cor-500 da família, label abaixo, borda de seleção na cor ativa.

## Ordem de implementação

1. Migração: adicionar coluna `theme_color`
2. CSS: criar as 22 classes `.theme-{cor}` com variantes dark e high-contrast
3. ThemeContext: remover hue, adicionar themeColor, aplicar classe
4. ThemeSettings: substituir slider por grid de cores
5. AppLayout: ajustar classes que usavam menu-foreground

