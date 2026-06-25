
ALTER TABLE public.partner_notes
  ADD COLUMN IF NOT EXISTS interaction_type text NOT NULL DEFAULT 'Meeting',
  ADD COLUMN IF NOT EXISTS interaction_date timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS participants jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS topics jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS decisions jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS action_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS risks jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS extra jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Backfill interaction_type from legacy note_type for existing rows
UPDATE public.partner_notes
SET interaction_type = CASE
  WHEN note_type = 'Meeting' THEN 'Meeting'
  WHEN note_type = 'Follow-up' THEN 'Phone Call'
  WHEN note_type = 'Internal Note' THEN 'Internal Discussion'
  ELSE COALESCE(note_type, 'Meeting')
END
WHERE interaction_type = 'Meeting' AND note_type IS NOT NULL;

-- Backfill interaction_date from created_at
UPDATE public.partner_notes
SET interaction_date = created_at
WHERE interaction_date > created_at + interval '1 second'
   OR interaction_date < created_at - interval '1 second';

CREATE INDEX IF NOT EXISTS idx_partner_notes_topics_gin ON public.partner_notes USING gin (topics);
CREATE INDEX IF NOT EXISTS idx_partner_notes_action_items_gin ON public.partner_notes USING gin (action_items);
CREATE INDEX IF NOT EXISTS idx_partner_notes_interaction_date ON public.partner_notes (partner_id, interaction_date DESC);
