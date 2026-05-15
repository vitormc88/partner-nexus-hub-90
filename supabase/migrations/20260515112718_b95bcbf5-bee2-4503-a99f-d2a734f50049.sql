
-- 1. Add timestamps + canonical user FK to deals
ALTER TABLE public.deals
  ADD COLUMN IF NOT EXISTS won_at timestamptz,
  ADD COLUMN IF NOT EXISTS lost_at timestamptz,
  ADD COLUMN IF NOT EXISTS status_changed_at timestamptz,
  ADD COLUMN IF NOT EXISTS assigned_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Backfill timestamps for existing won/lost deals
UPDATE public.deals SET won_at = COALESCE(won_at, updated_at) WHERE status = 'Won' AND won_at IS NULL;
UPDATE public.deals SET lost_at = COALESCE(lost_at, updated_at) WHERE status = 'Lost' AND lost_at IS NULL;
UPDATE public.deals SET status_changed_at = COALESCE(status_changed_at, updated_at) WHERE status_changed_at IS NULL;

-- Backfill assigned_user_id by matching assigned_salesperson against profiles (case-insensitive, trimmed)
UPDATE public.deals d
SET assigned_user_id = p.id
FROM public.profiles p
WHERE d.assigned_user_id IS NULL
  AND d.assigned_salesperson IS NOT NULL
  AND (
    lower(btrim(p.full_name)) = lower(btrim(d.assigned_salesperson))
    OR lower(btrim(p.email))  = lower(btrim(d.assigned_salesperson))
  );

CREATE INDEX IF NOT EXISTS idx_deals_assigned_user_id ON public.deals(assigned_user_id);
CREATE INDEX IF NOT EXISTS idx_deals_status_stage ON public.deals(status, stage);
CREATE INDEX IF NOT EXISTS idx_deals_won_at ON public.deals(won_at);

-- 2. Trigger to maintain won_at / lost_at / status_changed_at automatically
CREATE OR REPLACE FUNCTION public.deals_track_status_change()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.status_changed_at := now();
    IF NEW.status = 'Won' AND NEW.won_at IS NULL THEN NEW.won_at := now(); END IF;
    IF NEW.status = 'Lost' AND NEW.lost_at IS NULL THEN NEW.lost_at := now(); END IF;
  ELSIF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    NEW.status_changed_at := now();
    IF NEW.status = 'Won' THEN NEW.won_at := COALESCE(NEW.won_at, now()); END IF;
    IF NEW.status = 'Lost' THEN NEW.lost_at := COALESCE(NEW.lost_at, now()); END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_deals_track_status_change ON public.deals;
CREATE TRIGGER trg_deals_track_status_change
BEFORE INSERT OR UPDATE ON public.deals
FOR EACH ROW EXECUTE FUNCTION public.deals_track_status_change();

-- 3. Analytics views (security_invoker so RLS of base tables applies)

-- Pipeline by stage (ACTIVE only — excludes Won/Lost)
CREATE OR REPLACE VIEW public.v_analytics_pipeline_stage
WITH (security_invoker = on) AS
SELECT
  d.stage,
  COUNT(*)::int AS deal_count,
  COALESCE(SUM(d.expected_value), 0)::numeric AS total_value,
  COALESCE(SUM(d.expected_value * d.probability / 100.0), 0)::numeric AS weighted_value
FROM public.deals d
WHERE d.status = 'Open'
  AND d.stage NOT IN ('Won','Lost')
  AND d.stage IN ('Open Lead','Qualified','Demo','Proposal Sent','Advance 1','Meeting 2','Advance 2','Price Negotiation')
GROUP BY d.stage;

-- Outcomes (Won / Lost)
CREATE OR REPLACE VIEW public.v_analytics_outcomes
WITH (security_invoker = on) AS
SELECT
  d.id,
  d.partner_id,
  d.status,
  COALESCE(d.total_value, d.expected_value, 0)::numeric AS value,
  COALESCE(d.won_at, d.lost_at, d.updated_at) AS closed_at
FROM public.deals d
WHERE d.status IN ('Won','Lost');

-- Sales performance by canonical user
CREATE OR REPLACE VIEW public.v_analytics_sales_performance
WITH (security_invoker = on) AS
SELECT
  COALESCE(p.id::text, 'unassigned:' || COALESCE(d.assigned_salesperson, 'Unassigned')) AS sales_key,
  p.id AS user_id,
  COALESCE(p.full_name, d.assigned_salesperson, 'Unassigned') AS sales_name,
  (p.id IS NULL) AS is_unlinked,
  COUNT(*) FILTER (WHERE d.status = 'Open' AND d.stage NOT IN ('Won','Lost'))::int AS open_count,
  COUNT(*) FILTER (WHERE d.status = 'Won')::int AS won_count,
  COUNT(*) FILTER (WHERE d.status = 'Lost')::int AS lost_count,
  COALESCE(SUM(COALESCE(d.total_value, d.expected_value, 0)) FILTER (WHERE d.status = 'Won'), 0)::numeric AS won_revenue,
  COALESCE(SUM(d.expected_value) FILTER (WHERE d.status = 'Open' AND d.stage NOT IN ('Won','Lost')), 0)::numeric AS pipeline_value,
  COALESCE(SUM(d.expected_value * d.probability / 100.0) FILTER (WHERE d.status = 'Open' AND d.stage NOT IN ('Won','Lost')), 0)::numeric AS weighted_pipeline
FROM public.deals d
LEFT JOIN public.profiles p ON p.id = d.assigned_user_id
GROUP BY p.id, p.full_name, d.assigned_salesperson;

-- Partner summary
CREATE OR REPLACE VIEW public.v_analytics_partner_summary
WITH (security_invoker = on) AS
SELECT
  pt.id AS partner_id,
  pt.company_name,
  pt.country,
  COALESCE(SUM(COALESCE(d.total_value, d.expected_value, 0)) FILTER (WHERE d.status = 'Won'), 0)::numeric AS revenue,
  COALESCE(SUM(d.expected_value) FILTER (WHERE d.status = 'Open' AND d.stage NOT IN ('Won','Lost')), 0)::numeric AS pipeline,
  COUNT(DISTINCT d.id) FILTER (WHERE d.status = 'Open' AND d.stage NOT IN ('Won','Lost'))::int AS open_deal_count,
  COUNT(DISTINCT d.id) FILTER (WHERE d.status = 'Won')::int AS won_deal_count,
  (SELECT COUNT(*)::int FROM public.clients c WHERE c.partner_id::uuid = pt.id AND c.status = 'Active') AS client_count
FROM public.partners pt
LEFT JOIN public.deals d ON d.partner_id::uuid = pt.id
GROUP BY pt.id, pt.company_name, pt.country;

-- Renewals summary
CREATE OR REPLACE VIEW public.v_analytics_renewals_summary
WITH (security_invoker = on) AS
SELECT
  COUNT(*)::int AS total,
  COUNT(*) FILTER (WHERE status = 'Won')::int AS won,
  COUNT(*) FILTER (WHERE status = 'Lost')::int AS lost,
  COUNT(*) FILTER (WHERE status NOT IN ('Won','Lost') AND renewal_date >= CURRENT_DATE)::int AS upcoming,
  COUNT(*) FILTER (WHERE status NOT IN ('Won','Lost') AND renewal_date < CURRENT_DATE)::int AS overdue,
  COALESCE(SUM(COALESCE(final_value, estimated_value, 0)) FILTER (WHERE status = 'Won'), 0)::numeric AS won_value,
  CASE
    WHEN COUNT(*) FILTER (WHERE status IN ('Won','Lost')) = 0 THEN 0
    ELSE ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'Won') / COUNT(*) FILTER (WHERE status IN ('Won','Lost')))
  END::int AS success_rate
FROM public.renewals;

-- Revenue by country (won deals only)
CREATE OR REPLACE VIEW public.v_analytics_revenue_by_country
WITH (security_invoker = on) AS
SELECT
  pt.country,
  COALESCE(SUM(COALESCE(d.total_value, d.expected_value, 0)), 0)::numeric AS revenue,
  COUNT(*)::int AS won_deal_count
FROM public.deals d
JOIN public.partners pt ON pt.id = d.partner_id::uuid
WHERE d.status = 'Won' AND pt.country IS NOT NULL
GROUP BY pt.country;

-- Revenue monthly (last 12 months, won deals)
CREATE OR REPLACE VIEW public.v_analytics_revenue_monthly
WITH (security_invoker = on) AS
SELECT
  to_char(date_trunc('month', COALESCE(d.won_at, d.updated_at)), 'YYYY-MM') AS month_key,
  to_char(date_trunc('month', COALESCE(d.won_at, d.updated_at)), 'Mon YYYY') AS month_label,
  COALESCE(SUM(COALESCE(d.total_value, d.expected_value, 0)), 0)::numeric AS revenue,
  COUNT(*)::int AS won_deal_count
FROM public.deals d
WHERE d.status = 'Won'
  AND COALESCE(d.won_at, d.updated_at) >= (CURRENT_DATE - INTERVAL '12 months')
GROUP BY 1, 2
ORDER BY 1;

-- Monthly pipeline trend (open value snapshot per month based on stage_entered_at)
CREATE OR REPLACE VIEW public.v_analytics_pipeline_monthly
WITH (security_invoker = on) AS
SELECT
  to_char(date_trunc('month', COALESCE(d.stage_entered_at, d.created_at)), 'YYYY-MM') AS month_key,
  to_char(date_trunc('month', COALESCE(d.stage_entered_at, d.created_at)), 'Mon YYYY') AS month_label,
  COALESCE(SUM(d.expected_value), 0)::numeric AS pipeline_value,
  COUNT(*)::int AS open_deal_count
FROM public.deals d
WHERE d.status = 'Open'
  AND d.stage NOT IN ('Won','Lost')
  AND COALESCE(d.stage_entered_at, d.created_at) >= (CURRENT_DATE - INTERVAL '12 months')
GROUP BY 1, 2
ORDER BY 1;

GRANT SELECT ON
  public.v_analytics_pipeline_stage,
  public.v_analytics_outcomes,
  public.v_analytics_sales_performance,
  public.v_analytics_partner_summary,
  public.v_analytics_renewals_summary,
  public.v_analytics_revenue_by_country,
  public.v_analytics_revenue_monthly,
  public.v_analytics_pipeline_monthly
TO authenticated;
