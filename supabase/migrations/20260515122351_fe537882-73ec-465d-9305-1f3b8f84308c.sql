
-- Canonical stage probability fallback (used when deals.probability is null/0)
CREATE OR REPLACE FUNCTION public.pipeline_stage_probability(_stage text)
RETURNS int
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE _stage
    WHEN 'Open Lead' THEN 5
    WHEN 'Qualified' THEN 20
    WHEN 'Demo' THEN 40
    WHEN 'Proposal Sent' THEN 60
    WHEN 'Advance 1' THEN 70
    WHEN 'Meeting 2' THEN 75
    WHEN 'Advance 2' THEN 80
    WHEN 'Price Negotiation' THEN 90
    WHEN 'Won' THEN 100
    WHEN 'Lost' THEN 0
    ELSE 0
  END
$$;

-- Update pipeline-by-stage view: use authoritative_value & canonical probability
CREATE OR REPLACE VIEW public.v_analytics_pipeline_stage
WITH (security_invoker = on) AS
SELECT
  d.stage,
  COUNT(*)::int AS deal_count,
  COALESCE(SUM(COALESCE(NULLIF(d.total_value,0), d.expected_value, 0)), 0)::numeric AS total_value,
  COALESCE(SUM(
    COALESCE(NULLIF(d.total_value,0), d.expected_value, 0)
    * COALESCE(NULLIF(d.probability,0), public.pipeline_stage_probability(d.stage))
    / 100.0
  ), 0)::numeric AS weighted_value
FROM public.deals d
WHERE d.status = 'Open'
  AND d.stage NOT IN ('Won','Lost')
  AND d.stage IN ('Open Lead','Qualified','Demo','Proposal Sent','Advance 1','Meeting 2','Advance 2','Price Negotiation')
GROUP BY d.stage;

-- Update sales-performance view: same canonical formulas
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
  COALESCE(SUM(COALESCE(NULLIF(d.total_value,0), d.expected_value, 0)) FILTER (WHERE d.status = 'Won'), 0)::numeric AS won_revenue,
  COALESCE(SUM(COALESCE(NULLIF(d.total_value,0), d.expected_value, 0)) FILTER (WHERE d.status = 'Open' AND d.stage NOT IN ('Won','Lost')), 0)::numeric AS pipeline_value,
  COALESCE(SUM(
    COALESCE(NULLIF(d.total_value,0), d.expected_value, 0)
    * COALESCE(NULLIF(d.probability,0), public.pipeline_stage_probability(d.stage))
    / 100.0
  ) FILTER (WHERE d.status = 'Open' AND d.stage NOT IN ('Won','Lost')), 0)::numeric AS weighted_pipeline
FROM public.deals d
LEFT JOIN public.profiles p ON p.id = d.assigned_user_id
GROUP BY p.id, p.full_name, d.assigned_salesperson;

-- Authoritative single-row pipeline summary (single source of truth)
CREATE OR REPLACE VIEW public.v_analytics_pipeline_summary
WITH (security_invoker = on) AS
WITH open_deals AS (
  SELECT
    COALESCE(NULLIF(d.total_value,0), d.expected_value, 0) AS auth_value,
    COALESCE(NULLIF(d.probability,0), public.pipeline_stage_probability(d.stage)) AS prob
  FROM public.deals d
  WHERE d.status = 'Open' AND d.stage NOT IN ('Won','Lost')
),
closed AS (
  SELECT
    COUNT(*) FILTER (WHERE status = 'Won')::int AS won_count,
    COUNT(*) FILTER (WHERE status = 'Lost')::int AS lost_count
  FROM public.deals
  WHERE status IN ('Won','Lost')
)
SELECT
  (SELECT COUNT(*) FROM open_deals)::int AS open_deals,
  COALESCE((SELECT SUM(auth_value) FROM open_deals), 0)::numeric AS pipeline_value,
  COALESCE((SELECT SUM(auth_value * prob / 100.0) FROM open_deals), 0)::numeric AS weighted_pipeline,
  CASE WHEN (SELECT COUNT(*) FROM open_deals) > 0
       THEN COALESCE((SELECT SUM(auth_value) FROM open_deals), 0) / (SELECT COUNT(*) FROM open_deals)
       ELSE 0 END::numeric AS avg_deal_size,
  CASE WHEN (closed.won_count + closed.lost_count) > 0
       THEN ROUND(closed.won_count::numeric / (closed.won_count + closed.lost_count) * 100, 1)
       ELSE 0 END AS win_rate
FROM closed;
