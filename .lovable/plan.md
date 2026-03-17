

## Plan: Convert Settings Page to a Dialog

Transform the current `/preferences` full page into a modal dialog with a left sidebar navigation and right content panel, similar to the ChatGPT settings dialog shown in the reference image.

### Architecture

1. **Create `SettingsDialog` component** (`src/components/settings/SettingsDialog.tsx`)
   - A `Dialog` with a two-panel layout: left nav sidebar (~220px) + right content area
   - Left sidebar: vertical list of nav items with icons (Perfil, Personalização, Usuários, Notificações) — conditionally shown based on role
   - Right panel: renders the selected section's content (existing tab components)
   - Include Settings.tsx timezone/theme content as a "Geral" section
   - Dialog size: `max-w-3xl` with fixed height `h-[80vh]`
   - On mobile: stack vertically or use a simpler layout

2. **Update `AppLayout.tsx` sidebar**
   - Replace the `<Link to="/preferences">` with a `<button>` that opens the `SettingsDialog`
   - Manage dialog open state in AppLayout

3. **Update `App.tsx` routing**
   - Remove the `/preferences` route (and its redirects from `/profile` and `/settings`)
   - Or keep the route but redirect to home with dialog open via URL param

### Navigation Items (left sidebar)
- **Perfil** (User icon) — `ProfileEditTab`
- **Geral** (Globe icon) — Timezone settings from `Settings.tsx`
- **Personalização** (Palette icon) — `PlatformCustomizationTab` (admin only)
- **Usuários** (Users icon) — `UserManagementTab` (admin only)
- **Notificações** (Bell icon) — `NotificationTemplatesTab` (admin only)

### Files to Create/Modify
- **Create**: `src/components/settings/SettingsDialog.tsx` — new dialog component with sidebar + content layout
- **Modify**: `src/components/layout/AppLayout.tsx` — replace Link with button that opens dialog
- **Modify**: `src/App.tsx` — remove `/preferences` route and related redirects

