
ALTER TABLE public.incoming_leads
  ADD COLUMN IF NOT EXISTS qualification_stage text NOT NULL DEFAULT 'New',
  ADD COLUMN IF NOT EXISTS interest_status text,
  ADD COLUMN IF NOT EXISTS interest_notes text,
  ADD COLUMN IF NOT EXISTS timing_status text,
  ADD COLUMN IF NOT EXISTS timing_notes text,
  ADD COLUMN IF NOT EXISTS budget_status text,
  ADD COLUMN IF NOT EXISTS budget_notes text,
  ADD COLUMN IF NOT EXISTS decision_status text,
  ADD COLUMN IF NOT EXISTS decision_notes text,
  ADD COLUMN IF NOT EXISTS current_process text,
  ADD COLUMN IF NOT EXISTS main_challenge text,
  ADD COLUMN IF NOT EXISTS existing_system text,
  ADD COLUMN IF NOT EXISTS data_visibility text,
  ADD COLUMN IF NOT EXISTS fit_pain_identified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS fit_current_process_identified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS fit_urgency_identified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS fit_decision_maker_identified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS fit_operational_maturity boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS fit_system_dissatisfaction boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS disqualified_reason text;

-- Backfill qualification_stage from existing status
UPDATE public.incoming_leads
SET qualification_stage = CASE
  WHEN converted_to_deal_id IS NOT NULL THEN 'Converted'
  WHEN status = 'Qualified' THEN 'Qualified'
  WHEN status = 'Rejected' THEN 'Disqualified'
  WHEN status = 'Contacted' THEN 'Discovery Call'
  WHEN status IN ('Assigned','In Review') THEN 'Qualification'
  ELSE 'New'
END
WHERE qualification_stage = 'New';
