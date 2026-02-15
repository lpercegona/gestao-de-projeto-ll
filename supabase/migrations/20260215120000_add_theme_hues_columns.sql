ALTER TABLE public.theme_settings
  ADD COLUMN IF NOT EXISTS header_hue INTEGER,
  ADD COLUMN IF NOT EXISTS menu_hue INTEGER;

UPDATE public.theme_settings
SET
  header_hue = COALESCE(header_hue, menu_hue, 210),
  menu_hue = COALESCE(menu_hue, header_hue, 210)
WHERE header_hue IS NULL OR menu_hue IS NULL;

ALTER TABLE public.theme_settings
  ALTER COLUMN header_hue SET DEFAULT 210,
  ALTER COLUMN menu_hue SET DEFAULT 210;
