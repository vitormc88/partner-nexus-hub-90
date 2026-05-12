
-- Extend announcements table
ALTER TABLE public.announcements
  ADD COLUMN IF NOT EXISTS summary text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS pinned boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS target_audience text NOT NULL DEFAULT 'all',
  ADD COLUMN IF NOT EXISTS target_country text,
  ADD COLUMN IF NOT EXISTS target_partnership_level text,
  ADD COLUMN IF NOT EXISTS created_by uuid,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS archived_at timestamptz;

-- Backfill status from is_active for existing rows
UPDATE public.announcements
SET status = CASE WHEN coalesce(is_active, false) THEN 'published' ELSE 'draft' END
WHERE status = 'draft' AND created_at < now();

-- Constraints
DO $$ BEGIN
  ALTER TABLE public.announcements
    ADD CONSTRAINT announcements_status_check CHECK (status IN ('draft','published','archived'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.announcements
    ADD CONSTRAINT announcements_target_audience_check
    CHECK (target_audience IN ('all','partner','country','partnership_level'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Updated_at trigger
DROP TRIGGER IF EXISTS announcements_set_updated_at ON public.announcements;
CREATE TRIGGER announcements_set_updated_at
BEFORE UPDATE ON public.announcements
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Replace RLS policies
DROP POLICY IF EXISTS announcements_select ON public.announcements;
DROP POLICY IF EXISTS announcements_insert ON public.announcements;
DROP POLICY IF EXISTS announcements_update ON public.announcements;
DROP POLICY IF EXISTS announcements_delete ON public.announcements;

CREATE POLICY announcements_select ON public.announcements
FOR SELECT TO authenticated
USING (
  public.is_hq_user(auth.uid())
  OR (
    status = 'published'
    AND (
      target_audience = 'all'
      OR (
        target_audience = 'partner'
        AND partner_id IS NOT NULL
        AND partner_id::uuid = public.get_user_partner_id(auth.uid())
      )
      OR (
        target_audience = 'country'
        AND target_country IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM public.partners p
          WHERE p.id = public.get_user_partner_id(auth.uid())
            AND p.country = announcements.target_country
        )
      )
      OR (
        target_audience = 'partnership_level'
        AND target_partnership_level IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM public.partners p
          WHERE p.id = public.get_user_partner_id(auth.uid())
            AND p.partnership_level = announcements.target_partnership_level
        )
      )
    )
  )
);

CREATE POLICY announcements_insert ON public.announcements
FOR INSERT TO authenticated
WITH CHECK (public.can_edit_module(auth.uid(), 'announcements'));

CREATE POLICY announcements_update ON public.announcements
FOR UPDATE TO authenticated
USING (public.can_edit_module(auth.uid(), 'announcements'))
WITH CHECK (public.can_edit_module(auth.uid(), 'announcements'));

CREATE POLICY announcements_delete ON public.announcements
FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'hq_admin'));

-- Helpful index
CREATE INDEX IF NOT EXISTS announcements_status_pinned_idx
  ON public.announcements (status, pinned DESC, published_at DESC NULLS LAST, created_at DESC);
