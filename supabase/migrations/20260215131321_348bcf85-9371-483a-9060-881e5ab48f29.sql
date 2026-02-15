
ALTER TABLE public.theme_settings ADD COLUMN IF NOT EXISTS header_hue integer NOT NULL DEFAULT 210;
ALTER TABLE public.theme_settings ADD COLUMN IF NOT EXISTS menu_hue integer NOT NULL DEFAULT 210;
