

## Plan: Services Grid Layout + Client Services Page

### 1. Fix Services grid to 3 columns on desktop

**File: `src/pages/Services.tsx`**

Change the grid container from `grid-cols-1 md:grid-cols-2` to `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`. Adjust card layout so the image and content stack vertically within each card (instead of the current `md:grid-cols-3` internal split), making each card a fixed-width column item with proper image aspect ratio using `aspect-video` or `aspect-[4/3]` with `object-cover`.

### 2. Add "Serviços" menu item for clients with `one_time` contract

**File: `src/components/layout/AppLayout.tsx`**

- Conditionally add a "Serviços" nav item (`/my-services`, icon: `Layers3`) to `clientNavItems` — but this requires knowing the client's `contract_type` at layout level.
- Fetch the client's `contract_type` in AppLayout (similar pattern used in Dashboard.tsx) and conditionally include the nav item when `contract_type === 'one_time'`.

### 3. Create Client Services page

**New file: `src/pages/ClientServices.tsx`**

- Fetches the logged-in client's `owner_id` (the admin who owns the client record).
- Queries `proposals` owned by that admin, extracts service items from accepted/sent proposals linked to this client.
- Also loads the admin's manual service catalog items from a new approach: since manual items are in localStorage (per admin), we need a database-backed catalog. **Alternative**: query proposals items where `client_id` matches the client, showing services the admin has proposed to them.
- Displays services in a read-only 3-column grid with:
  - Service image, name, description, price, billing type
  - A "Selecionar" / "Contratar" button per item (UI only, no payment integration yet)
  - A cart/selection summary at the bottom showing selected services and total
  - A "Solicitar contratação" button that is disabled/placeholder with a toast saying "Método de pagamento será configurado em breve"

### 4. Add route in App.tsx

**File: `src/App.tsx`**

Add route `/my-services` protected for `client` role, rendering `ClientServices`.

### Technical Details

**Client contract_type detection in AppLayout:**
```tsx
const [clientContractType, setClientContractType] = useState<string | null>(null);

useEffect(() => {
  if (!isClient || !user) return;
  const fetch = async () => {
    const { data } = await supabase
      .from('clients')
      .select('contract_type')
      .or(`user_id.eq.${user.id}`)
      .maybeSingle();
    // also check client_users table
    setClientContractType(data?.contract_type || null);
  };
  fetch();
}, [isClient, user]);
```

Then conditionally build `clientNavItems` to include `{ path: '/my-services', icon: Layers3, label: 'Serviços' }` when `clientContractType === 'one_time'`.

**Client Services data source:** Since admin manual items are in localStorage (not accessible to clients), the client services page will query `proposals` where `client_id` matches and status is `accepted` or `sent`, extracting the `items` array. This shows services the admin has offered to that specific client.

### Files to modify/create
1. `src/pages/Services.tsx` — 3-column grid, vertical card layout
2. `src/components/layout/AppLayout.tsx` — conditional "Serviços" nav for one_time clients
3. `src/pages/ClientServices.tsx` — new page with service listing and selection UI
4. `src/App.tsx` — add `/my-services` route

