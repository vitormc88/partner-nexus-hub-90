
-- Partner Health Engine v2.1 — calibration, maturity awareness, structured factors.
-- Adds: maturity, factors (jsonb), better differentiation, configurable thresholds (centralized in CTE).

DROP VIEW IF EXISTS public.partner_metrics;

CREATE VIEW public.partner_metrics
WITH (security_invoker=on) AS
WITH
cfg AS (
  -- ── Centralized configuration (mirrored in src/lib/partner-health-config.ts) ──
  SELECT
    0.40::numeric AS w_relationship,
    0.35::numeric AS w_momentum,
    0.25::numeric AS w_engagement,
    -- Meeting overdue thresholds (days)
    30  AS meet_mild_days,
    60  AS meet_med_days,
    -- Maturity thresholds
    1   AS mature_min_clients,
    1   AS mature_min_renewals
),
d AS (
  SELECT
    partner_id::uuid AS partner_id,
    SUM(CASE WHEN status = 'Won'  THEN COALESCE(expected_value, 0) ELSE 0 END) AS revenue,
    SUM(CASE WHEN status = 'Open' THEN COALESCE(expected_value, 0) ELSE 0 END) AS pipeline,
    COUNT(*) FILTER (WHERE status = 'Open')                                    AS open_deals,
    COUNT(*) FILTER (WHERE created_at > now() - interval '90 days')            AS recent_deals,
    COUNT(*) FILTER (WHERE status = 'Won' AND won_at > now() - interval '180 days') AS recent_wins,
    MAX(created_at) AS last_deal_at
  FROM public.deals
  WHERE partner_id IS NOT NULL
    AND partner_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  GROUP BY partner_id
),
c AS (
  SELECT partner_id::uuid AS partner_id, COUNT(*) AS client_count
  FROM public.clients
  WHERE partner_id IS NOT NULL
    AND partner_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  GROUP BY partner_id
),
l AS (
  SELECT
    linked_partner_id AS partner_id,
    COUNT(*) FILTER (WHERE COALESCE(status,'') NOT IN ('Rejected','Converted')) AS open_leads,
    COUNT(*) FILTER (WHERE created_at > now() - interval '90 days')             AS leads_90d
  FROM public.incoming_leads
  WHERE linked_partner_id IS NOT NULL
  GROUP BY linked_partner_id
),
r AS (
  SELECT
    partner_id::uuid AS partner_id,
    COUNT(*) AS renewals_total,
    COUNT(*) FILTER (WHERE renewal_date >= CURRENT_DATE AND renewal_date <= CURRENT_DATE + INTERVAL '120 days') AS renewals_upcoming
  FROM public.renewals
  WHERE partner_id IS NOT NULL
    AND partner_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  GROUP BY partner_id
),
n AS (
  SELECT
    partner_id,
    MAX(created_at) AS last_note_at,
    COUNT(*) FILTER (WHERE created_at > now() - interval '90 days') AS notes_90d
  FROM public.partner_notes
  GROUP BY partner_id
),
ob AS (
  SELECT
    partner_id::uuid AS partner_id,
    MAX(progress_pct) AS onboarding_pct,
    bool_or(completed_at IS NOT NULL) AS onboarding_done
  FROM public.partner_onboarding
  WHERE partner_id IS NOT NULL
    AND partner_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  GROUP BY partner_id
),
u AS (
  SELECT partner_id, COUNT(*) FILTER (WHERE COALESCE(is_active, true)) AS user_count
  FROM public.profiles
  WHERE partner_id IS NOT NULL
  GROUP BY partner_id
),
base AS (
  SELECT
    p.id AS partner_id,
    COALESCE(d.revenue, 0)::numeric    AS revenue,
    COALESCE(d.pipeline, 0)::numeric   AS pipeline,
    COALESCE(c.client_count, 0)::integer AS clients,
    COALESCE(l.open_leads, 0)::integer   AS open_leads_count,
    COALESCE(l.leads_90d, 0)::integer    AS leads_90d,
    COALESCE(r.renewals_total, 0)::integer    AS renewals_total,
    COALESCE(r.renewals_upcoming, 0)::integer AS renewals_upcoming,

    -- Days since any relationship signal
    LEAST(
      COALESCE(EXTRACT(EPOCH FROM (now() - n.last_note_at)) / 86400, 1e9),
      COALESCE((CURRENT_DATE - p.last_meeting_date)::numeric, 1e9)
    ) AS days_since_contact,

    -- Days the next meeting is overdue (positive = overdue). NULL if none scheduled or future.
    CASE
      WHEN p.next_meeting_date IS NOT NULL AND p.next_meeting_date < CURRENT_DATE
      THEN (CURRENT_DATE - p.next_meeting_date)::integer
      ELSE NULL
    END AS meeting_overdue_days,

    p.account_owner_id, p.assigned_manager_id,
    p.next_meeting_date, p.last_meeting_date,
    p.country, p.primary_contact_email, p.website, p.partnership_level,

    COALESCE(n.notes_90d, 0)        AS notes_90d,
    n.last_note_at,
    COALESCE(d.open_deals, 0)       AS open_deals,
    COALESCE(d.recent_deals, 0)     AS recent_deals,
    COALESCE(d.recent_wins, 0)      AS recent_wins,
    d.last_deal_at,
    COALESCE(ob.onboarding_pct, 0)  AS onboarding_pct,
    COALESCE(ob.onboarding_done, false) AS onboarding_done,
    COALESCE(u.user_count, 0)       AS user_count
  FROM public.partners p
  LEFT JOIN d  ON d.partner_id  = p.id
  LEFT JOIN c  ON c.partner_id  = p.id
  LEFT JOIN l  ON l.partner_id  = p.id
  LEFT JOIN r  ON r.partner_id  = p.id
  LEFT JOIN n  ON n.partner_id  = p.id
  LEFT JOIN ob ON ob.partner_id = p.id
  LEFT JOIN u  ON u.partner_id  = p.id
),
maturity AS (
  SELECT
    b.*,
    CASE
      WHEN b.clients = 0 AND NOT b.onboarding_done AND b.onboarding_pct < 25
           AND b.open_deals = 0 AND b.recent_deals = 0
        THEN 'new'
      WHEN b.clients = 0 AND (b.onboarding_pct > 0 OR b.recent_deals > 0 OR b.open_leads_count > 0)
           AND NOT b.onboarding_done
        THEN 'onboarding'
      WHEN b.clients >= (SELECT mature_min_clients FROM cfg)
           AND b.renewals_total >= (SELECT mature_min_renewals FROM cfg)
           AND (b.recent_deals > 0 OR b.last_deal_at > now() - interval '180 days' OR b.renewals_upcoming > 0)
        THEN 'mature'
      WHEN b.clients > 0
           AND b.days_since_contact > 180
           AND b.recent_deals = 0
           AND (b.last_deal_at IS NULL OR b.last_deal_at < now() - interval '180 days')
        THEN 'dormant'
      ELSE 'active'
    END AS maturity
  FROM base b
),
scored AS (
  SELECT
    m.*,
    -- ── Relationship (0-100) ─────────────────────────────────────────
    LEAST(100, GREATEST(0,
      (CASE WHEN m.account_owner_id IS NOT NULL OR m.assigned_manager_id IS NOT NULL THEN 20 ELSE 0 END)
      + (CASE
          WHEN m.days_since_contact <= 30  THEN 30
          WHEN m.days_since_contact <= 60  THEN 20
          WHEN m.days_since_contact <= 120 THEN 10
          ELSE 0
         END)
      + LEAST(20, m.notes_90d * 7)
      + (CASE
          WHEN m.next_meeting_date IS NOT NULL AND m.next_meeting_date >= CURRENT_DATE THEN 15
          ELSE 0
         END)
      + (CASE
          WHEN m.last_meeting_date IS NOT NULL
               AND (CURRENT_DATE - m.last_meeting_date) <= 60 THEN 15
          WHEN m.last_meeting_date IS NOT NULL
               AND (CURRENT_DATE - m.last_meeting_date) <= 120 THEN 8
          ELSE 0
         END)
      -- Calibrated overdue penalties (capped, never collapse entire score)
      - (CASE
          WHEN m.meeting_overdue_days IS NULL THEN 0
          WHEN m.meeting_overdue_days <= 30 THEN 8
          WHEN m.meeting_overdue_days <= 60 THEN 18
          ELSE 30
         END)
    ))::integer AS relationship_score,

    -- ── Business Momentum (0-100) — counts of real activity ──────────
    LEAST(100, GREATEST(0,
        LEAST(28, m.clients * 4)            -- clients under management
      + LEAST(20, m.open_leads_count * 3)   -- active lead funnel
      + LEAST(15, m.renewals_total * 2)     -- renewals under management
      + LEAST(10, m.renewals_upcoming * 3)  -- upcoming renewals
      + LEAST(15, m.open_deals * 6)         -- active pipeline
      + LEAST(10, m.recent_deals * 4)       -- recent opp creation
      + LEAST(10, m.recent_wins * 5)        -- recent wins
      + (CASE WHEN m.last_deal_at > now() - interval '60 days' THEN 5 ELSE 0 END)
    ))::integer AS momentum_score_raw,

    -- ── Operational Engagement (0-100) — completeness rewards ────────
    LEAST(100, GREATEST(0,
      (m.onboarding_pct / 2)                                    -- up to 50
      + (CASE WHEN m.onboarding_done THEN 15 ELSE 0 END)
      + LEAST(15, m.user_count * 6)
      + (CASE WHEN m.account_owner_id IS NOT NULL THEN 5 ELSE 0 END)
      + (CASE WHEN m.country               IS NOT NULL THEN 2 ELSE 0 END)
      + (CASE WHEN m.primary_contact_email IS NOT NULL THEN 4 ELSE 0 END)
      + (CASE WHEN m.website                IS NOT NULL THEN 2 ELSE 0 END)
      + (CASE WHEN m.partnership_level      IS NOT NULL THEN 4 ELSE 0 END)
      + (CASE WHEN m.notes_90d > 0          THEN 3 ELSE 0 END)
    ))::integer AS engagement_score
  FROM maturity m
),
calibrated AS (
  -- Apply maturity-aware floor/cap on momentum so new partners aren't
  -- penalised to zero and mature partners can pull away.
  SELECT
    s.*,
    CASE s.maturity
      WHEN 'new'        THEN LEAST(45, GREATEST(25, s.momentum_score_raw))
      WHEN 'onboarding' THEN LEAST(55, GREATEST(30, s.momentum_score_raw))
      WHEN 'dormant'    THEN LEAST(40, s.momentum_score_raw)
      ELSE s.momentum_score_raw
    END AS momentum_score
  FROM scored s
)
SELECT
  s.partner_id,
  s.revenue,
  s.pipeline,
  s.clients,
  s.maturity,
  s.relationship_score,
  s.momentum_score,
  s.engagement_score,
  LEAST(100, GREATEST(0,
    ROUND(
      s.relationship_score * (SELECT w_relationship FROM cfg)
      + s.momentum_score    * (SELECT w_momentum     FROM cfg)
      + s.engagement_score  * (SELECT w_engagement   FROM cfg)
    )
  ))::integer AS health_score,

  -- Plain text arrays kept for backward compatibility
  ARRAY_REMOVE(ARRAY[
    CASE WHEN s.account_owner_id IS NOT NULL OR s.assigned_manager_id IS NOT NULL THEN 'Account owner assigned' END,
    CASE WHEN s.days_since_contact <= 30  THEN 'Recent relationship activity' END,
    CASE WHEN s.notes_90d > 1             THEN 'Regular touchpoints (90d)' END,
    CASE WHEN s.next_meeting_date IS NOT NULL AND s.next_meeting_date >= CURRENT_DATE THEN 'Upcoming meeting scheduled' END,
    CASE WHEN s.clients >= 5              THEN 'Multiple clients under management' END,
    CASE WHEN s.clients > 0 AND s.clients < 5 THEN 'Active client base' END,
    CASE WHEN s.open_leads_count > 0      THEN 'Active lead funnel' END,
    CASE WHEN s.renewals_upcoming > 0     THEN 'Renewals coming up' END,
    CASE WHEN s.open_deals  > 0           THEN 'Active opportunities in pipeline' END,
    CASE WHEN s.recent_deals > 0          THEN 'New opportunities created recently' END,
    CASE WHEN s.recent_wins  > 0          THEN 'Recent wins (180d)' END,
    CASE WHEN s.onboarding_done           THEN 'Onboarding completed' END,
    CASE WHEN NOT s.onboarding_done AND s.onboarding_pct >= 50 THEN 'Onboarding in progress' END,
    CASE WHEN s.user_count   > 0          THEN 'Partner users provisioned' END
  ], NULL) AS positive_factors,

  ARRAY_REMOVE(ARRAY[
    CASE WHEN s.account_owner_id IS NULL AND s.assigned_manager_id IS NULL THEN 'No account owner assigned' END,
    CASE WHEN s.meeting_overdue_days IS NOT NULL
         THEN 'Next meeting overdue by ' || s.meeting_overdue_days || ' days — reschedule needed' END,
    CASE WHEN s.meeting_overdue_days IS NULL AND (s.next_meeting_date IS NULL)
         THEN 'No upcoming meeting scheduled' END,
    CASE WHEN s.days_since_contact > 120 AND s.meeting_overdue_days IS NULL THEN 'No recent interactions (>120d)' END,
    CASE WHEN s.clients = 0 AND s.maturity IN ('new','onboarding') THEN 'No clients created yet' END,
    CASE WHEN s.maturity = 'active' AND s.open_deals = 0 AND s.open_leads_count = 0 THEN 'No active commercial activity' END,
    CASE WHEN s.maturity = 'mature' AND s.recent_deals = 0 AND s.last_deal_at < now() - interval '180 days'
         THEN 'No recent commercial activity (>180d)' END,
    CASE WHEN NOT s.onboarding_done AND s.onboarding_pct < 50 THEN 'Onboarding still in progress' END,
    CASE WHEN s.user_count = 0            THEN 'No platform users provisioned' END,
    CASE WHEN s.maturity = 'dormant'      THEN 'Partner appears dormant' END
  ], NULL) AS negative_factors,

  -- ── Structured factors (preferred for UI) ──────────────────────────
  -- Each item: { type, label, dimension, impact }
  (
    SELECT COALESCE(jsonb_agg(f), '[]'::jsonb) FROM (
      -- Positive
      SELECT jsonb_build_object('type','positive','dimension','relationship','impact','medium','label','Account owner assigned') f
        WHERE s.account_owner_id IS NOT NULL OR s.assigned_manager_id IS NOT NULL
      UNION ALL SELECT jsonb_build_object('type','positive','dimension','relationship','impact','high','label','Recent relationship activity')
        WHERE s.days_since_contact <= 30
      UNION ALL SELECT jsonb_build_object('type','positive','dimension','relationship','impact','medium','label','Upcoming meeting scheduled')
        WHERE s.next_meeting_date IS NOT NULL AND s.next_meeting_date >= CURRENT_DATE
      UNION ALL SELECT jsonb_build_object('type','positive','dimension','momentum','impact','high','label','Multiple clients under management')
        WHERE s.clients >= 5
      UNION ALL SELECT jsonb_build_object('type','positive','dimension','momentum','impact','medium','label','Active client base')
        WHERE s.clients > 0 AND s.clients < 5
      UNION ALL SELECT jsonb_build_object('type','positive','dimension','momentum','impact','medium','label','Active lead funnel')
        WHERE s.open_leads_count > 0
      UNION ALL SELECT jsonb_build_object('type','positive','dimension','momentum','impact','high','label','Active pipeline')
        WHERE s.open_deals > 0
      UNION ALL SELECT jsonb_build_object('type','positive','dimension','momentum','impact','medium','label','Renewals coming up')
        WHERE s.renewals_upcoming > 0
      UNION ALL SELECT jsonb_build_object('type','positive','dimension','momentum','impact','high','label','Recent wins')
        WHERE s.recent_wins > 0
      UNION ALL SELECT jsonb_build_object('type','positive','dimension','engagement','impact','high','label','Onboarding completed')
        WHERE s.onboarding_done
      UNION ALL SELECT jsonb_build_object('type','positive','dimension','engagement','impact','low','label','Partner users provisioned')
        WHERE s.user_count > 0
      -- Negative
      UNION ALL SELECT jsonb_build_object('type','negative','dimension','relationship','impact','high','label','No account owner assigned')
        WHERE s.account_owner_id IS NULL AND s.assigned_manager_id IS NULL
      UNION ALL SELECT jsonb_build_object(
          'type','negative','dimension','relationship',
          'impact', CASE WHEN s.meeting_overdue_days <= 30 THEN 'low'
                         WHEN s.meeting_overdue_days <= 60 THEN 'medium'
                         ELSE 'high' END,
          'label','Next meeting overdue by ' || s.meeting_overdue_days || ' days — reschedule needed')
        WHERE s.meeting_overdue_days IS NOT NULL
      UNION ALL SELECT jsonb_build_object('type','negative','dimension','relationship','impact','medium','label','No upcoming meeting scheduled')
        WHERE s.meeting_overdue_days IS NULL AND s.next_meeting_date IS NULL
      UNION ALL SELECT jsonb_build_object('type','negative','dimension','momentum','impact','medium','label','No clients created yet')
        WHERE s.clients = 0 AND s.maturity IN ('new','onboarding')
      UNION ALL SELECT jsonb_build_object('type','negative','dimension','momentum','impact','high','label','No active commercial activity')
        WHERE s.maturity = 'active' AND s.open_deals = 0 AND s.open_leads_count = 0
      UNION ALL SELECT jsonb_build_object('type','negative','dimension','engagement','impact','medium','label','Onboarding still in progress')
        WHERE NOT s.onboarding_done AND s.onboarding_pct < 50
      UNION ALL SELECT jsonb_build_object('type','negative','dimension','engagement','impact','low','label','No platform users provisioned')
        WHERE s.user_count = 0
      UNION ALL SELECT jsonb_build_object('type','negative','dimension','momentum','impact','high','label','Partner appears dormant')
        WHERE s.maturity = 'dormant'
    ) sub
  ) AS factors
FROM calibrated s;

GRANT SELECT ON public.partner_metrics TO authenticated;
