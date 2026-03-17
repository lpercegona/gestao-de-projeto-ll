

## Plan: Reorganize Settings Dialog Sections & Compact UI

### Changes Overview

**Reorder sidebar navigation** to: Geral → Perfil → Segurança → Usuários → Personalização → Notificações

**Restructure `SettingsDialog.tsx`:**
- Reorder `navSections` array to match new order
- Add "Segurança" (Lock icon) as its own sidebar item
- Move ThemeSettings out of GeneralSection into "Personalização" section
- GeneralSection: only timezone (compact, no Card wrapper — just label + select)
- Add new `SecuritySection` that renders password change form (extracted from ProfileEditTab)
- "Personalização" renders `ThemeSettings` directly (admin only)

**Restructure `ProfileEditTab.tsx`:**
- Remove the internal `Tabs` (profile/security/company) — the dialog sidebar now handles navigation
- Profile section: avatar + name + email in compact form, then a visual separator, then "Informações Fiscais" sub-section (company name, CNPJ, CPF, address) in the same scrollable column
- Remove password change form from this component (moved to SecuritySection)
- Export password change logic as a separate `SecuritySection` component or inline it in SettingsDialog

**Compact UI styling across all sections:**
- Use `text-xs` for labels, `text-sm` for inputs
- Remove Card wrappers inside dialog content — use simple `div` with `space-y-3` instead
- Reduce padding: `p-4` on main content area instead of `p-6`
- Use `gap-2` and `space-y-2` instead of `space-y-4`/`space-y-6`
- Smaller section titles: `text-sm font-medium` instead of CardTitle
- Compact button sizes: `size="sm"` where possible

### Files to Modify

1. **`src/components/settings/SettingsDialog.tsx`** — Reorder nav, add Segurança item, create SecuritySection (password form), update GeneralSection (timezone only, no theme), update Personalização to render ThemeSettings, compact all spacing/text sizes

2. **`src/components/settings/ProfileEditTab.tsx`** — Remove Tabs wrapper, remove security tab, render only profile info + fiscal info section in a single scrollable column, compact styling

### Navigation Structure (sidebar)
| Section | Icon | Content | Visibility |
|---------|------|---------|------------|
| Geral | Globe | Timezone only | All |
| Perfil | User | Personal info + Fiscal info | All |
| Segurança | Lock | Password change | All |
| Usuários | Users | UserManagementTab | Admin only |
| Personalização | Palette | ThemeSettings | Admin only |
| Notificações | Bell | NotificationTemplatesTab | Admin only |

