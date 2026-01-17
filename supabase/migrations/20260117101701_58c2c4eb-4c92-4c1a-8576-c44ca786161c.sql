-- Create table for theme settings (only master_admin can edit)
CREATE TABLE public.theme_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  primary_color TEXT NOT NULL DEFAULT '266 4% 20.8%',
  secondary_color TEXT NOT NULL DEFAULT '248 0.7% 96.8%',
  accent_color TEXT NOT NULL DEFAULT '248 0.7% 96.8%',
  font_family TEXT NOT NULL DEFAULT 'Inter',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.theme_settings ENABLE ROW LEVEL SECURITY;

-- Anyone can read theme settings
CREATE POLICY "Theme settings are viewable by everyone" 
ON public.theme_settings 
FOR SELECT 
USING (true);

-- Only master_admin can update theme settings
CREATE POLICY "Only master_admin can update theme settings" 
ON public.theme_settings 
FOR UPDATE 
USING (public.is_master_admin(auth.uid()));

-- Only master_admin can insert theme settings
CREATE POLICY "Only master_admin can insert theme settings" 
ON public.theme_settings 
FOR INSERT 
WITH CHECK (public.is_master_admin(auth.uid()));

-- Create trigger for updated_at
CREATE TRIGGER update_theme_settings_updated_at
BEFORE UPDATE ON public.theme_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default settings
INSERT INTO public.theme_settings (id, primary_color, secondary_color, accent_color, font_family)
VALUES ('00000000-0000-0000-0000-000000000001', '266 4% 20.8%', '248 0.7% 96.8%', '248 0.7% 96.8%', 'Inter');