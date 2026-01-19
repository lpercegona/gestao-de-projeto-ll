-- Create proposal templates table
CREATE TABLE public.proposal_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID,
  name TEXT NOT NULL,
  description TEXT,
  items JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create proposals table
CREATE TABLE public.proposals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID,
  template_id UUID REFERENCES public.proposal_templates(id),
  share_token TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  
  -- Recipient info (can be any email)
  recipient_name TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  recipient_company TEXT,
  
  -- Proposal content
  title TEXT NOT NULL,
  description TEXT,
  items JSONB NOT NULL DEFAULT '[]',
  total_hours NUMERIC NOT NULL DEFAULT 0,
  total_value NUMERIC NOT NULL DEFAULT 0,
  
  -- Status: draft, sent, viewed, accepted, rejected, negotiating
  status TEXT NOT NULL DEFAULT 'draft',
  
  -- Validity
  valid_until DATE,
  
  -- Metadata
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create proposal comments table
CREATE TABLE public.proposal_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  proposal_id UUID NOT NULL REFERENCES public.proposals(id) ON DELETE CASCADE,
  author_type TEXT NOT NULL DEFAULT 'client', -- 'client' or 'admin'
  author_name TEXT,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create proposal history table for tracking status changes
CREATE TABLE public.proposal_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  proposal_id UUID NOT NULL REFERENCES public.proposals(id) ON DELETE CASCADE,
  old_status TEXT,
  new_status TEXT NOT NULL,
  changed_by TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.proposal_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposal_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposal_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for proposal_templates
CREATE POLICY "Admins can manage templates" 
ON public.proposal_templates 
FOR ALL 
USING (public.is_admin_or_master(auth.uid()));

-- RLS Policies for proposals
CREATE POLICY "Admins can manage proposals" 
ON public.proposals 
FOR ALL 
USING (public.is_admin_or_master(auth.uid()));

-- RLS Policies for proposal_comments
CREATE POLICY "Admins can view all comments" 
ON public.proposal_comments 
FOR SELECT 
USING (public.is_admin_or_master(auth.uid()));

CREATE POLICY "Admins can insert comments" 
ON public.proposal_comments 
FOR INSERT 
WITH CHECK (public.is_admin_or_master(auth.uid()));

-- RLS Policies for proposal_history
CREATE POLICY "Admins can view history" 
ON public.proposal_history 
FOR SELECT 
USING (public.is_admin_or_master(auth.uid()));

-- Create trigger for updated_at
CREATE TRIGGER update_proposal_templates_updated_at
BEFORE UPDATE ON public.proposal_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_proposals_updated_at
BEFORE UPDATE ON public.proposals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- RPC function to get proposal by token (public access)
CREATE OR REPLACE FUNCTION public.get_proposal_by_token(p_token TEXT)
RETURNS TABLE (
  proposal_id UUID,
  title TEXT,
  description TEXT,
  recipient_name TEXT,
  recipient_email TEXT,
  recipient_company TEXT,
  items JSONB,
  total_hours NUMERIC,
  total_value NUMERIC,
  status TEXT,
  valid_until DATE,
  created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update status to viewed if it was sent
  UPDATE proposals 
  SET status = 'viewed', updated_at = now()
  WHERE share_token = p_token AND status = 'sent';

  RETURN QUERY
  SELECT 
    p.id,
    p.title,
    p.description,
    p.recipient_name,
    p.recipient_email,
    p.recipient_company,
    p.items,
    p.total_hours,
    p.total_value,
    p.status,
    p.valid_until,
    p.created_at
  FROM proposals p
  WHERE p.share_token = p_token;
END;
$$;

-- RPC function to get proposal comments by token
CREATE OR REPLACE FUNCTION public.get_proposal_comments_by_token(p_token TEXT)
RETURNS TABLE (
  comment_id UUID,
  author_type TEXT,
  author_name TEXT,
  content TEXT,
  created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_proposal_id UUID;
BEGIN
  SELECT id INTO v_proposal_id FROM proposals WHERE share_token = p_token;
  
  RETURN QUERY
  SELECT 
    c.id,
    c.author_type,
    c.author_name,
    c.content,
    c.created_at
  FROM proposal_comments c
  WHERE c.proposal_id = v_proposal_id
  ORDER BY c.created_at ASC;
END;
$$;

-- RPC function to respond to proposal (accept/reject/comment)
CREATE OR REPLACE FUNCTION public.respond_to_proposal(
  p_token TEXT,
  p_action TEXT,
  p_comment TEXT DEFAULT NULL,
  p_author_name TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_proposal_id UUID;
  v_old_status TEXT;
BEGIN
  SELECT id, status INTO v_proposal_id, v_old_status
  FROM proposals 
  WHERE share_token = p_token;
  
  IF v_proposal_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Handle action
  IF p_action IN ('accepted', 'rejected', 'negotiating') THEN
    UPDATE proposals 
    SET status = p_action, updated_at = now()
    WHERE id = v_proposal_id;
    
    -- Record history
    INSERT INTO proposal_history (proposal_id, old_status, new_status, changed_by, notes)
    VALUES (v_proposal_id, v_old_status, p_action, p_author_name, p_comment);
  END IF;
  
  -- Add comment if provided
  IF p_comment IS NOT NULL AND p_comment != '' THEN
    INSERT INTO proposal_comments (proposal_id, author_type, author_name, content)
    VALUES (v_proposal_id, 'client', COALESCE(p_author_name, 'Cliente'), p_comment);
  END IF;
  
  RETURN TRUE;
END;
$$;