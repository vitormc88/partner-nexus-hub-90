DROP VIEW IF EXISTS public.unified_tasks;
CREATE VIEW public.unified_tasks AS
WITH base AS (
  SELECT
    'manual:' || mt.id::text AS id,
    'manual'::text AS source,
    mt.id AS source_id,
    COALESCE(mt.task_type, 'manual') AS task_type,
    mt.title,
    mt.description,
    mt.related_company AS company_name,
    mt.related_entity_id,
    COALESCE(mt.related_type::text, 'general') AS related_type,
    COALESCE(mt.related_route, '/tasks') AS related_route,
    mt.due_date,
    mt.priority AS manual_priority,
    mt.owner_user_id,
    CASE
      WHEN COALESCE(mt.task_status, '') = 'Completed' OR mt.status = 'Done' THEN 'done'
      WHEN COALESCE(mt.task_status, '') = 'In Progress' OR mt.status = 'In Progress' THEN 'in_progress'
      WHEN COALESCE(mt.task_status, '') = 'Waiting' OR mt.status = 'Waiting' THEN 'waiting'
      ELSE 'open'
    END AS status,
    0::numeric AS revenue_impact,
    mt.created_at,
    mt.completed_at,
    false AS is_auto
  FROM manual_tasks mt
  UNION ALL
  SELECT
    'lead:' || lt.id::text, 'lead', lt.id,
    CASE
      WHEN lower(lt.title) LIKE '%call%' THEN 'call'
      WHEN lower(lt.title) LIKE '%email%' OR lower(lt.title) LIKE '%follow%' THEN 'email'
      WHEN lower(lt.title) LIKE '%meet%' OR lower(lt.title) LIKE '%demo%' THEN 'meeting'
      ELSE 'manual'
    END,
    lt.title, lt.description, il.company_name, lt.lead_id, 'lead'::text,
    '/incoming-leads/' || lt.lead_id::text,
    lt.due_date::timestamptz, lt.priority, lt.assigned_user_id,
    CASE WHEN lt.status = 'Done' THEN 'done' WHEN lt.status = 'In Progress' THEN 'in_progress' ELSE 'open' END,
    0::numeric, lt.created_at, lt.completed_at, false
  FROM lead_tasks lt LEFT JOIN incoming_leads il ON il.id = lt.lead_id
  UNION ALL
  SELECT
    'pipeline:' || dt.id::text, 'pipeline', dt.id,
    COALESCE(NULLIF(lower(dt.category), ''),
      CASE
        WHEN lower(dt.title) LIKE '%call%' THEN 'call'
        WHEN lower(dt.title) LIKE '%email%' OR lower(dt.title) LIKE '%follow%' THEN 'email'
        WHEN lower(dt.title) LIKE '%meet%' OR lower(dt.title) LIKE '%demo%' THEN 'meeting'
        WHEN lower(dt.title) LIKE '%proposal%' THEN 'proposal'
        ELSE 'manual'
      END),
    dt.title, dt.description, d.company_name, dt.deal_id, 'deal'::text,
    '/deals/' || dt.deal_id::text,
    dt.due_date::timestamptz, dt.priority, dt.assigned_user_id,
    CASE WHEN dt.is_completed = true OR dt.status = 'Done' THEN 'done' WHEN dt.status = 'In Progress' THEN 'in_progress' ELSE 'open' END,
    COALESCE(d.expected_value, 0::numeric), dt.created_at, dt.completed_at, false
  FROM deal_tasks dt LEFT JOIN deals d ON d.id = dt.deal_id
  UNION ALL
  SELECT
    'partner_action:' || pn.id::text || ':' || (ai.value ->> 'id'),
    'partner', pn.partner_id, 'review',
    COALESCE(NULLIF(ai.value ->> 'description', ''), 'Action item'),
    NULL::text, p.company_name, pn.partner_id, 'partner'::text,
    '/partners/' || pn.partner_id::text,
    NULLIF(ai.value ->> 'due_date', '')::timestamptz, 'Medium', p.assigned_manager_id,
    CASE WHEN lower(COALESCE(ai.value ->> 'status', 'open')) = ANY (ARRAY['done','completed','closed']) THEN 'done' ELSE 'open' END,
    0::numeric, pn.created_at, NULL::timestamptz, false
  FROM partner_notes pn LEFT JOIN partners p ON p.id = pn.partner_id
  CROSS JOIN LATERAL jsonb_array_elements(pn.action_items) ai(value)
  WHERE jsonb_typeof(pn.action_items) = 'array' AND jsonb_array_length(pn.action_items) > 0
  UNION ALL
  SELECT
    'renewal:' || r.id::text, 'renewal', r.id, 'renewal',
    'Renewal due: ' || COALESCE(c.commercial_name, 'Client'),
    r.notes, c.commercial_name, r.id, 'renewal'::text, '/renewals',
    r.renewal_date::timestamptz, COALESCE(r.priority, 'Medium'), r.assigned_user_id,
    'open', COALESCE(r.estimated_value, 0::numeric), r.created_at, NULL::timestamptz, true
  FROM renewals r LEFT JOIN clients c ON c.id = r.client_id
  WHERE (r.status <> ALL (ARRAY['Renewed','Lost','Cancelled']))
    AND r.renewal_date IS NOT NULL
    AND r.renewal_date <= (CURRENT_DATE + INTERVAL '90 days')
  UNION ALL
  SELECT
    'deal_stalled:' || d.id::text, 'pipeline', d.id, 'escalation',
    'Pipeline stalled: ' || d.company_name,
    'No activity in over 14 days at stage ' || d.stage,
    d.company_name, d.id, 'deal'::text, '/deals/' || d.id::text,
    d.last_activity_at + INTERVAL '14 days', 'High', d.assigned_user_id,
    'open', COALESCE(d.expected_value, 0::numeric), d.last_activity_at, NULL::timestamptz, true
  FROM deals d
  WHERE d.status = 'Open' AND (d.stage <> ALL (ARRAY['Won','Lost']))
    AND d.last_activity_at IS NOT NULL AND d.last_activity_at < (now() - INTERVAL '14 days')
  UNION ALL
  SELECT
    'lead_waiting:' || il.id::text, 'lead', il.id, 'email',
    'Follow up: ' || COALESCE(il.company_name, 'Lead'),
    'No contact for 7+ days while ' || COALESCE(il.status, 'New'),
    il.company_name, il.id, 'lead'::text, '/incoming-leads/' || il.id::text,
    COALESCE(il.last_contact_at, il.created_at) + INTERVAL '7 days', 'Medium', il.assigned_user_id,
    'open', 0::numeric, COALESCE(il.last_contact_at, il.created_at), NULL::timestamptz, true
  FROM incoming_leads il
  WHERE (il.status = ANY (ARRAY['New','Active Qualification','Nurture']))
    AND COALESCE(il.last_contact_at, il.created_at) < (now() - INTERVAL '7 days')
),
scored AS (
  SELECT b.*,
    CASE WHEN b.due_date IS NOT NULL AND b.due_date < now() THEN 50 ELSE 0 END +
    CASE
      WHEN b.due_date IS NOT NULL AND b.due_date < (now() + INTERVAL '1 day') THEN 30
      WHEN b.due_date IS NOT NULL AND b.due_date < (now() + INTERVAL '3 days') THEN 15
      WHEN b.due_date IS NOT NULL AND b.due_date < (now() + INTERVAL '7 days') THEN 5
      ELSE 0
    END +
    CASE upper(COALESCE(b.manual_priority, ''))
      WHEN 'CRITICAL' THEN 40 WHEN 'HIGH' THEN 25 WHEN 'MEDIUM' THEN 10 ELSE 0
    END +
    LEAST(30, floor(COALESCE(b.revenue_impact, 0) / 5000.0))::integer +
    CASE WHEN b.source = 'renewal' THEN 10 ELSE 0 END AS priority_score
  FROM base b
)
SELECT
  s.id, s.source, s.source_id, s.task_type, s.title, s.description,
  s.company_name, s.related_entity_id, s.related_type, s.related_route,
  s.due_date, s.owner_user_id,
  pr.full_name AS owner_name, pr.email AS owner_email,
  s.status, s.revenue_impact, s.is_auto,
  s.created_at, s.completed_at, s.priority_score,
  CASE
    WHEN s.priority_score >= 70 THEN 'Critical'
    WHEN s.priority_score >= 40 THEN 'High'
    WHEN s.priority_score >= 15 THEN 'Medium'
    ELSE 'Low'
  END AS priority
FROM scored s
LEFT JOIN profiles pr ON pr.id = s.owner_user_id;

GRANT SELECT ON public.unified_tasks TO authenticated;
GRANT SELECT ON public.unified_tasks TO service_role;