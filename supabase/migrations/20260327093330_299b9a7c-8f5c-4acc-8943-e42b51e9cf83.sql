
ALTER TABLE public.deal_tasks
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'To Do',
  ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'Medium',
  ADD COLUMN IF NOT EXISTS assigned_user_id uuid,
  ADD COLUMN IF NOT EXISTS created_by uuid;

-- Migrate existing data: map is_completed to status
UPDATE public.deal_tasks SET status = 'Done' WHERE is_completed = true;
