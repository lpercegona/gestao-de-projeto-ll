-- Create kanban_stages table for customizable kanban stages
CREATE TABLE public.kanban_stages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  order_position INTEGER NOT NULL DEFAULT 0,
  color TEXT DEFAULT 'bg-muted',
  is_default BOOLEAN DEFAULT false,
  owner_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.kanban_stages ENABLE ROW LEVEL SECURITY;

-- Insert default stages
INSERT INTO public.kanban_stages (name, order_position, color, is_default) VALUES
  ('Pendente', 0, 'bg-yellow-100', true),
  ('Em Andamento', 1, 'bg-blue-100', true),
  ('Concluída', 2, 'bg-green-100', true);

-- Create policies
CREATE POLICY "Anyone can view default stages" 
  ON public.kanban_stages 
  FOR SELECT 
  USING (is_default = true);

CREATE POLICY "Admins can view all stages" 
  ON public.kanban_stages 
  FOR SELECT 
  USING (public.is_admin_or_master(auth.uid()) = true);

CREATE POLICY "Users can view their own custom stages" 
  ON public.kanban_stages 
  FOR SELECT 
  USING (owner_id = auth.uid());

CREATE POLICY "Admins can manage stages" 
  ON public.kanban_stages 
  FOR ALL 
  USING (public.is_admin_or_master(auth.uid()) = true);

-- Create index
CREATE INDEX idx_kanban_stages_order ON public.kanban_stages(order_position);