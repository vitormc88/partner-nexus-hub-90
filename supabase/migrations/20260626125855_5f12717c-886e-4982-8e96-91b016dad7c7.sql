
-- =========================================================
-- Sprint B: Customer Lifecycle Engine — additive schema
-- =========================================================

-- ---------- contracts: lineage + calculated totals ----------
ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS source_proposal_id uuid REFERENCES public.proposals(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_imported boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS manual_adjustment_amount numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS calculated_total numeric(12,2);

CREATE INDEX IF NOT EXISTS idx_contracts_source_proposal_id ON public.contracts(source_proposal_id);

-- Mark every existing contract as legacy so the new engine treats them as untouchable.
UPDATE public.contracts SET is_imported = true WHERE is_imported = false;

-- ---------- contract_lines: source tracking ----------
ALTER TABLE public.contract_lines
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'legacy',
  ADD COLUMN IF NOT EXISTS source_item_id uuid;

CREATE INDEX IF NOT EXISTS idx_contract_lines_source_item ON public.contract_lines(source_item_id);

-- ---------- clients: proposal lineage ----------
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS source_proposal_id uuid REFERENCES public.proposals(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_clients_source_proposal_id ON public.clients(source_proposal_id);

-- ---------- renewals: explicit notice_period_days ----------
ALTER TABLE public.renewals
  ADD COLUMN IF NOT EXISTS notice_period_days integer;

UPDATE public.renewals
   SET notice_period_days = COALESCE(notice_period_days, alert_window_days, 60)
 WHERE notice_period_days IS NULL;

-- ---------- contracts: calculated total trigger ----------
CREATE OR REPLACE FUNCTION public.recalculate_contract_total(_contract_id uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _sum numeric(12,2);
  _adj numeric(12,2);
BEGIN
  SELECT COALESCE(SUM(amount), 0) INTO _sum
    FROM public.contract_lines WHERE contract_id = _contract_id;

  SELECT COALESCE(manual_adjustment_amount, 0) INTO _adj
    FROM public.contracts WHERE id = _contract_id;

  UPDATE public.contracts
     SET calculated_total = _sum + _adj
   WHERE id = _contract_id;

  RETURN _sum + _adj;
END;
$$;

CREATE OR REPLACE FUNCTION public.contract_lines_refresh_total()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.recalculate_contract_total(OLD.contract_id);
    RETURN OLD;
  ELSE
    PERFORM public.recalculate_contract_total(NEW.contract_id);
    IF TG_OP = 'UPDATE' AND OLD.contract_id <> NEW.contract_id THEN
      PERFORM public.recalculate_contract_total(OLD.contract_id);
    END IF;
    RETURN NEW;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS trg_contract_lines_refresh_total ON public.contract_lines;
CREATE TRIGGER trg_contract_lines_refresh_total
AFTER INSERT OR UPDATE OR DELETE ON public.contract_lines
FOR EACH ROW EXECUTE FUNCTION public.contract_lines_refresh_total();

CREATE OR REPLACE FUNCTION public.contracts_refresh_total()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.manual_adjustment_amount IS DISTINCT FROM NEW.manual_adjustment_amount) THEN
    PERFORM public.recalculate_contract_total(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_contracts_refresh_total ON public.contracts;
CREATE TRIGGER trg_contracts_refresh_total
AFTER INSERT OR UPDATE OF manual_adjustment_amount ON public.contracts
FOR EACH ROW EXECUTE FUNCTION public.contracts_refresh_total();

-- Backfill calculated_total for existing contracts (legacy contracts get a value too,
-- though the UI still primarily shows their legacy total_value).
DO $$
DECLARE c record;
BEGIN
  FOR c IN SELECT id FROM public.contracts LOOP
    PERFORM public.recalculate_contract_total(c.id);
  END LOOP;
END$$;

-- =========================================================
-- lifecycle_events: unified business timeline
-- =========================================================
CREATE TABLE IF NOT EXISTS public.lifecycle_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE,
  event_type text NOT NULL,            -- proposal_won, client_created, client_updated, license_created, contract_created, contract_line_added, renewal_scheduled, license_updated, contract_updated, renewal_renewed, invoice_issued, license_closed
  event_title text NOT NULL,
  event_description text,
  actor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  actor_name text,
  source_proposal_id uuid REFERENCES public.proposals(id) ON DELETE SET NULL,
  source_proposal_number text,
  source_license_id uuid REFERENCES public.licenses(id) ON DELETE SET NULL,
  source_contract_id uuid REFERENCES public.contracts(id) ON DELETE SET NULL,
  source_renewal_id uuid REFERENCES public.renewals(id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lifecycle_events_client ON public.lifecycle_events(client_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_lifecycle_events_proposal ON public.lifecycle_events(source_proposal_id);
CREATE INDEX IF NOT EXISTS idx_lifecycle_events_type ON public.lifecycle_events(event_type);

GRANT SELECT, INSERT ON public.lifecycle_events TO authenticated;
GRANT ALL ON public.lifecycle_events TO service_role;

ALTER TABLE public.lifecycle_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lifecycle_events_select" ON public.lifecycle_events;
CREATE POLICY "lifecycle_events_select"
  ON public.lifecycle_events FOR SELECT
  TO authenticated
  USING (
    public.is_hq_user(auth.uid())
    OR (client_id IS NOT NULL AND public.can_view_client(client_id))
  );

DROP POLICY IF EXISTS "lifecycle_events_insert" ON public.lifecycle_events;
CREATE POLICY "lifecycle_events_insert"
  ON public.lifecycle_events FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_hq_user(auth.uid())
    OR (client_id IS NOT NULL AND public.can_manage_client(client_id))
  );

-- Lifecycle events are append-only for non-admins.
DROP POLICY IF EXISTS "lifecycle_events_update" ON public.lifecycle_events;
CREATE POLICY "lifecycle_events_update"
  ON public.lifecycle_events FOR UPDATE
  TO authenticated
  USING (public.is_hq_user(auth.uid()))
  WITH CHECK (public.is_hq_user(auth.uid()));

DROP POLICY IF EXISTS "lifecycle_events_delete" ON public.lifecycle_events;
CREATE POLICY "lifecycle_events_delete"
  ON public.lifecycle_events FOR DELETE
  TO authenticated
  USING (public.is_hq_user(auth.uid()));
