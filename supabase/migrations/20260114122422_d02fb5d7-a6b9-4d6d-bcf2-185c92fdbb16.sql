-- Add UPDATE policies for admin and master_admin to update other users' profiles
CREATE POLICY "Master admin can update all profiles"
ON public.profiles
FOR UPDATE
USING (is_master_admin(auth.uid()));

CREATE POLICY "Admin can update owned profiles"
ON public.profiles
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role) AND owner_id = auth.uid());

-- Add DELETE policies for admin and master_admin
CREATE POLICY "Master admin can delete profiles"
ON public.profiles
FOR DELETE
USING (is_master_admin(auth.uid()));

CREATE POLICY "Admin can delete owned profiles"
ON public.profiles
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role) AND owner_id = auth.uid());