

## Plan: Fix Service Menu Delay + Database-Backed Service Catalog

### Problem 1: Menu "Serviços" loads slowly
The `clientContractType` state starts as `null` and only populates after an async fetch, causing the menu to render without the item first, then re-render. 

**Fix**: Use the client data already available in the `clients` RLS policy. Since `AppLayout` already knows `isClient`, we can fetch `contract_type` eagerly during the initial client record fetch that already happens (via `client_users` → `clients`). Additionally, initialize `clientContractType` from cached data or fetch it in parallel with the auth role to avoid the visible delay.

**File: `src/components/layout/AppLayout.tsx`**
- Move the contract type fetch to run immediately when `isClient` becomes true (no extra wait)
- Use `get_user_client_id` RPC or a single query joining `client_users` → `clients` to reduce from 2 sequential queries to 1

### Problem 2: Services must be independent of proposals
Currently admin items are in `localStorage` (inaccessible to clients). Need a database-backed catalog.

#### Step A: Create `service_catalog` table

```sql
CREATE TABLE public.service_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  service text NOT NULL,
  description text DEFAULT '',
  hours numeric NOT NULL DEFAULT 0,
  price_per_hour numeric NOT NULL DEFAULT 0,
  image_url text,
  billing_type text NOT NULL DEFAULT 'unique',
  is_active boolean NOT NULL DEFAULT true
);

ALTER TABLE public.service_catalog ENABLE ROW LEVEL SECURITY;

-- Admin manages own catalog
CREATE POLICY "Admin can manage own catalog" ON public.service_catalog
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) AND owner_id = auth.uid())
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) AND owner_id = auth.uid());

-- Master admin full access
CREATE POLICY "Master admin full access" ON public.service_catalog
  FOR ALL TO authenticated
  USING (is_master_admin(auth.uid()))
  WITH CHECK (is_master_admin(auth.uid()));

-- Clients can view catalog from their admin (owner)
CREATE POLICY "Clients can view owner catalog" ON public.service_catalog
  FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'client'::app_role)
    AND owner_id = (
      SELECT c.owner_id FROM clients c
      WHERE c.id = get_user_client_id(auth.uid())
    )
    AND is_active = true
  );
```

#### Step B: Migrate admin `Services.tsx` to use database

**File: `src/pages/Services.tsx`**
- Replace `localStorage` reads/writes with `service_catalog` table CRUD
- On save/create manual item → INSERT into `service_catalog`
- On edit → UPDATE in `service_catalog`
- On delete → DELETE from `service_catalog`
- Keep proposal items as read-only merged view (no change there)

#### Step C: Update `ClientServices.tsx` to read from `service_catalog`

**File: `src/pages/ClientServices.tsx`**
- Replace the proposals-based fetch with a simple query to `service_catalog` (RLS handles filtering by admin's `owner_id` automatically)
- Remove the complex `client_users` → `clients` → `proposals` chain
- Much simpler and faster data loading

### Files to modify/create
1. **Migration SQL** — create `service_catalog` table + RLS
2. **`src/pages/Services.tsx`** — CRUD against `service_catalog` instead of localStorage
3. **`src/pages/ClientServices.tsx`** — fetch from `service_catalog` instead of proposals
4. **`src/components/layout/AppLayout.tsx`** — optimize contract type fetch to single query

