
-- 1. Country normalization helper
CREATE OR REPLACE FUNCTION public.normalize_country(_input text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN _input IS NULL OR btrim(_input) = '' THEN NULL
    ELSE COALESCE(
      (
        SELECT name FROM (VALUES
          -- ISO 2-letter codes
          ('PT','Portugal'),('ES','Spain'),('FR','France'),('DE','Germany'),('IT','Italy'),
          ('GB','United Kingdom'),('UK','United Kingdom'),('US','United States'),('USA','United States'),
          ('RO','Romania'),('PH','Philippines'),('VN','Vietnam'),('MY','Malaysia'),
          ('SG','Singapore'),('SE','Sweden'),('BR','Brazil'),('AE','United Arab Emirates'),
          ('UAE','United Arab Emirates'),('MA','Morocco'),('PE','Peru'),('RS','Serbia'),
          ('NL','Netherlands'),('BE','Belgium'),('CH','Switzerland'),('AT','Austria'),
          ('PL','Poland'),('CZ','Czechia'),('DK','Denmark'),('NO','Norway'),('FI','Finland'),
          ('IE','Ireland'),('GR','Greece'),('TR','Turkey'),('JP','Japan'),('CN','China'),
          ('IN','India'),('AU','Australia'),('NZ','New Zealand'),('CA','Canada'),('MX','Mexico'),
          ('AR','Argentina'),('CL','Chile'),('CO','Colombia'),('ZA','South Africa'),
          -- Common typos / variants
          ('ROMENIA','Romania'),('PORTUGAL','Portugal'),('SPAIN','Spain'),('FRANCE','France'),
          ('GERMANY','Germany'),('ITALY','Italy'),('UNITED KINGDOM','United Kingdom'),
          ('UNITED STATES','United States'),('U.S.A.','United States'),('U.K.','United Kingdom'),
          ('PHILIPPINES','Philippines'),('VIETNAM','Vietnam'),('VIET NAM','Vietnam'),
          ('UNITED ARAB EMIRATES','United Arab Emirates'),('MALAYSIA','Malaysia'),
          ('SINGAPORE','Singapore'),('SWEDEN','Sweden'),('BRAZIL','Brazil'),('MOROCCO','Morocco'),
          ('PERU','Peru'),('SERBIA','Serbia'),('ROMANIA','Romania')
        ) AS m(code, name) WHERE m.code = upper(btrim(_input))
      ),
      -- Fallback: keep input but normalize whitespace + Title Case-ish (just trim)
      btrim(_input)
    )
  END
$$;

GRANT EXECUTE ON FUNCTION public.normalize_country(text) TO authenticated;

-- 2. Rebuild revenue-by-country using DEAL country (not partner country) + normalization
CREATE OR REPLACE VIEW public.v_analytics_revenue_by_country
WITH (security_invoker = on) AS
SELECT
  public.normalize_country(d.country) AS country,
  COALESCE(SUM(COALESCE(NULLIF(d.total_value,0), d.expected_value, 0)), 0)::numeric AS revenue,
  COUNT(*)::int AS won_deal_count
FROM public.deals d
WHERE d.status = 'Won'
  AND d.country IS NOT NULL
  AND btrim(d.country) <> ''
GROUP BY public.normalize_country(d.country)
ORDER BY revenue DESC;

-- 3. Rebuild partner summary with normalized country
CREATE OR REPLACE VIEW public.v_analytics_partner_summary
WITH (security_invoker = on) AS
SELECT
  pt.id AS partner_id,
  pt.company_name,
  public.normalize_country(pt.country) AS country,
  COALESCE(SUM(COALESCE(NULLIF(d.total_value,0), d.expected_value, 0)) FILTER (WHERE d.status = 'Won'), 0)::numeric AS revenue,
  COALESCE(SUM(d.expected_value) FILTER (WHERE d.status = 'Open' AND d.stage NOT IN ('Won','Lost')), 0)::numeric AS pipeline,
  COUNT(DISTINCT d.id) FILTER (WHERE d.status = 'Open' AND d.stage NOT IN ('Won','Lost'))::int AS open_deal_count,
  COUNT(DISTINCT d.id) FILTER (WHERE d.status = 'Won')::int AS won_deal_count,
  (SELECT COUNT(*)::int FROM public.clients c WHERE c.partner_id::uuid = pt.id AND c.status = 'Active') AS client_count
FROM public.partners pt
LEFT JOIN public.deals d ON d.partner_id::uuid = pt.id
GROUP BY pt.id, pt.company_name, pt.country;

-- 4. Use NULLIF so total_value=0 falls back to expected_value across views (consistency)
CREATE OR REPLACE VIEW public.v_analytics_outcomes
WITH (security_invoker = on) AS
SELECT
  d.id,
  d.partner_id,
  d.status,
  COALESCE(NULLIF(d.total_value,0), d.expected_value, 0)::numeric AS value,
  COALESCE(d.won_at, d.lost_at, d.status_changed_at, d.updated_at) AS closed_at
FROM public.deals d
WHERE d.status IN ('Won','Lost');

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
  COALESCE(SUM(d.expected_value) FILTER (WHERE d.status = 'Open' AND d.stage NOT IN ('Won','Lost')), 0)::numeric AS pipeline_value,
  COALESCE(SUM(d.expected_value * d.probability / 100.0) FILTER (WHERE d.status = 'Open' AND d.stage NOT IN ('Won','Lost')), 0)::numeric AS weighted_pipeline
FROM public.deals d
LEFT JOIN public.profiles p ON p.id = d.assigned_user_id
GROUP BY p.id, p.full_name, d.assigned_salesperson;

CREATE OR REPLACE VIEW public.v_analytics_revenue_monthly
WITH (security_invoker = on) AS
SELECT
  to_char(date_trunc('month', COALESCE(d.won_at, d.status_changed_at, d.updated_at)), 'YYYY-MM') AS month_key,
  to_char(date_trunc('month', COALESCE(d.won_at, d.status_changed_at, d.updated_at)), 'Mon YYYY') AS month_label,
  COALESCE(SUM(COALESCE(NULLIF(d.total_value,0), d.expected_value, 0)), 0)::numeric AS revenue,
  COUNT(*)::int AS won_deal_count
FROM public.deals d
WHERE d.status = 'Won'
  AND COALESCE(d.won_at, d.status_changed_at, d.updated_at) >= (CURRENT_DATE - INTERVAL '12 months')
GROUP BY 1, 2
ORDER BY 1;

-- 5. Reconciliation view (HQ Admin only via RLS on underlying deals + filter)
CREATE OR REPLACE VIEW public.v_analytics_deal_reconciliation
WITH (security_invoker = on) AS
SELECT
  d.id,
  d.company_name,
  d.status,
  d.stage,
  d.country AS country_raw,
  public.normalize_country(d.country) AS country_normalized,
  d.partner_id,
  COALESCE(p.full_name, d.assigned_salesperson, 'Unassigned') AS salesperson,
  d.expected_value,
  d.total_value,
  COALESCE(NULLIF(d.total_value,0), d.expected_value, 0)::numeric AS authoritative_value,
  d.probability,
  ROUND(COALESCE(d.expected_value,0) * COALESCE(d.probability,0) / 100.0)::numeric AS weighted_value,
  (d.status = 'Won')::boolean AS in_revenue,
  (d.status = 'Open' AND d.stage NOT IN ('Won','Lost'))::boolean AS in_pipeline,
  d.won_at,
  d.lost_at,
  d.status_changed_at,
  d.created_at,
  d.updated_at
FROM public.deals d
LEFT JOIN public.profiles p ON p.id = d.assigned_user_id;

GRANT SELECT ON
  public.v_analytics_revenue_by_country,
  public.v_analytics_partner_summary,
  public.v_analytics_outcomes,
  public.v_analytics_sales_performance,
  public.v_analytics_revenue_monthly,
  public.v_analytics_deal_reconciliation
TO authenticated;
