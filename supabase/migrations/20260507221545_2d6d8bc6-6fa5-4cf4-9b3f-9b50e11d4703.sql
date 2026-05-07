ALTER TABLE public.deal_activities
  ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS activity_date timestamptz,
  ADD COLUMN IF NOT EXISTS participants text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS linked_proposal_id uuid,
  ADD COLUMN IF NOT EXISTS linked_task_id uuid;

CREATE INDEX IF NOT EXISTS idx_deal_activities_deal_created ON public.deal_activities(deal_id, created_at DESC);