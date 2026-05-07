-- Lifecycle: deals -> clients -> licenses -> renewals
-- Additive, non-destructive

-- 1. Augment licenses
ALTER TABLE public.licenses
  ADD COLUMN IF NOT EXISTS billing_frequency text,
  ADD COLUMN IF NOT EXISTS contract_value numeric,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS is_draft boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS num_users integer;

-- 2. Augment clients with deal provenance
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS source_deal_id uuid;

-- 3. Augment deals with client link
ALTER TABLE public.deals
  ADD COLUMN IF NOT EXISTS client_id uuid;

-- 4. Renewals table
CREATE TABLE IF NOT EXISTS public.renewals (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id uuid NOT NULL,
  license_id uuid,
  partner_id text,
  renewal_type text NOT NULL DEFAULT 'License',
  renewal_date date NOT NULL,
  estimated_value numeric DEFAULT 0,
  currency text DEFAULT 'EUR',
  status text NOT NULL DEFAULT 'Active',
  billing_frequency text,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_renewals_client ON public.renewals(client_id);
CREATE INDEX IF NOT EXISTS idx_renewals_license ON public.renewals(license_id);
CREATE INDEX IF NOT EXISTS idx_renewals_partner ON public.renewals(partner_id);
CREATE INDEX IF NOT EXISTS idx_renewals_date ON public.renewals(renewal_date);

ALTER TABLE public.renewals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS renewals_select ON public.renewals;
CREATE POLICY renewals_select ON public.renewals
  FOR SELECT TO authenticated
  USING (
    is_hq_user(auth.uid())
    OR (partner_id IS NOT NULL AND can_view_partner(partner_id::uuid))
  );

DROP POLICY IF EXISTS renewals_insert ON public.renewals;
CREATE POLICY renewals_insert ON public.renewals
  FOR INSERT TO authenticated
  WITH CHECK (
    is_hq_user(auth.uid())
    OR (partner_id IS NOT NULL AND partner_id::uuid = get_user_partner_id(auth.uid()))
  );

DROP POLICY IF EXISTS renewals_update ON public.renewals;
CREATE POLICY renewals_update ON public.renewals
  FOR UPDATE TO authenticated
  USING (
    is_hq_user(auth.uid())
    OR (partner_id IS NOT NULL AND partner_id::uuid = get_user_partner_id(auth.uid()))
  )
  WITH CHECK (
    is_hq_user(auth.uid())
    OR (partner_id IS NOT NULL AND partner_id::uuid = get_user_partner_id(auth.uid()))
  );

DROP POLICY IF EXISTS renewals_delete ON public.renewals;
CREATE POLICY renewals_delete ON public.renewals
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'hq_admin'::app_role));

DROP TRIGGER IF EXISTS renewals_set_updated_at ON public.renewals;
CREATE TRIGGER renewals_set_updated_at
  BEFORE UPDATE ON public.renewals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();