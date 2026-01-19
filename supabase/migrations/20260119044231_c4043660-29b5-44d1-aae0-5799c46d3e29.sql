-- Add entry_type column to time_entries table to distinguish between task time and meeting time
ALTER TABLE public.time_entries 
ADD COLUMN entry_type TEXT NOT NULL DEFAULT 'task' CHECK (entry_type IN ('task', 'meeting'));

-- Add index for filtering by entry type
CREATE INDEX idx_time_entries_entry_type ON public.time_entries(entry_type);