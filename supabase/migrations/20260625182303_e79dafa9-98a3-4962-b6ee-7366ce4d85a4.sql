
CREATE TABLE IF NOT EXISTS public.manual_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  task_type text NOT NULL DEFAULT 'manual',
  priority text NOT NULL DEFAULT 'Medium',
  status text NOT NULL DEFAULT 'To Do',
  due_date timestamptz,
  owner_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  related_source text,
  related_entity_id uuid,
  related_route text,
  related_company text,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.manual_tasks TO authenticated;
GRANT ALL ON public.manual_tasks TO service_role;
ALTER TABLE public.manual_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "manual_tasks_select" ON public.manual_tasks FOR SELECT TO authenticated
  USING (public.is_hq_user(auth.uid()) OR owner_user_id = auth.uid() OR created_by = auth.uid());
CREATE POLICY "manual_tasks_insert" ON public.manual_tasks FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());
CREATE POLICY "manual_tasks_update" ON public.manual_tasks FOR UPDATE TO authenticated
  USING (public.is_hq_user(auth.uid()) OR owner_user_id = auth.uid() OR created_by = auth.uid())
  WITH CHECK (public.is_hq_user(auth.uid()) OR owner_user_id = auth.uid() OR created_by = auth.uid());
CREATE POLICY "manual_tasks_delete" ON public.manual_tasks FOR DELETE TO authenticated
  USING (public.is_hq_user(auth.uid()) OR created_by = auth.uid());

CREATE TRIGGER manual_tasks_set_updated_at BEFORE UPDATE ON public.manual_tasks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_manual_tasks_owner_due ON public.manual_tasks (owner_user_id, due_date);
CREATE INDEX IF NOT EXISTS idx_manual_tasks_status ON public.manual_tasks (status);
CREATE INDEX IF NOT EXISTS idx_lead_tasks_assigned_due ON public.lead_tasks (assigned_user_id, due_date);
CREATE INDEX IF NOT EXISTS idx_lead_tasks_status ON public.lead_tasks (status);
CREATE INDEX IF NOT EXISTS idx_deal_tasks_assigned_due ON public.deal_tasks (assigned_user_id, due_date);
CREATE INDEX IF NOT EXISTS idx_deal_tasks_status ON public.deal_tasks (status);
CREATE INDEX IF NOT EXISTS idx_renewals_status ON public.renewals (status);

CREATE OR REPLACE VIEW public.unified_tasks
WITH (security_invoker = true) AS
WITH base AS (
  SELECT
    'manual:'::text || mt.id::text AS id, 'manual'::text AS source, mt.id AS source_id,
    COALESCE(mt.task_type,'manual') AS task_type, mt.title, mt.description,
    mt.related_company AS company_name, mt.related_entity_id,
    COALESCE(mt.related_route,'/tasks') AS related_route,
    mt.due_date, mt.priority AS manual_priority, mt.owner_user_id,
    CASE WHEN mt.status='Done' THEN 'done' WHEN mt.status='In Progress' THEN 'in_progress' ELSE 'open' END AS status,
    0::numeric AS revenue_impact, mt.created_at, mt.completed_at, false AS is_auto
  FROM public.manual_tasks mt
  UNION ALL
  SELECT
    'lead:'::text || lt.id::text, 'lead', lt.id,
    CASE WHEN lower(lt.title) LIKE '%call%' THEN 'call'
         WHEN lower(lt.title) LIKE '%email%' OR lower(lt.title) LIKE '%follow%' THEN 'email'
         WHEN lower(lt.title) LIKE '%meet%' OR lower(lt.title) LIKE '%demo%' THEN 'meeting'
         ELSE 'manual' END,
    lt.title, lt.description, il.company_name, lt.lead_id,
    '/incoming-leads/' || lt.lead_id::text, lt.due_date::timestamptz, lt.priority, lt.assigned_user_id,
    CASE WHEN lt.status='Done' THEN 'done' WHEN lt.status='In Progress' THEN 'in_progress' ELSE 'open' END,
    0::numeric, lt.created_at, lt.completed_at, false
  FROM public.lead_tasks lt LEFT JOIN public.incoming_leads il ON il.id = lt.lead_id
  UNION ALL
  SELECT
    'pipeline:'::text || dt.id::text, 'pipeline', dt.id,
    COALESCE(NULLIF(lower(dt.category),''),
      CASE WHEN lower(dt.title) LIKE '%call%' THEN 'call'
           WHEN lower(dt.title) LIKE '%email%' OR lower(dt.title) LIKE '%follow%' THEN 'email'
           WHEN lower(dt.title) LIKE '%meet%' OR lower(dt.title) LIKE '%demo%' THEN 'meeting'
           WHEN lower(dt.title) LIKE '%proposal%' THEN 'proposal'
           ELSE 'manual' END),
    dt.title, dt.description, d.company_name, dt.deal_id,
    '/deals/' || dt.deal_id::text, dt.due_date::timestamptz, dt.priority, dt.assigned_user_id,
    CASE WHEN dt.is_completed=true OR dt.status='Done' THEN 'done'
         WHEN dt.status='In Progress' THEN 'in_progress' ELSE 'open' END,
    COALESCE(d.expected_value,0)::numeric, dt.created_at, dt.completed_at, false
  FROM public.deal_tasks dt LEFT JOIN public.deals d ON d.id = dt.deal_id
  UNION ALL
  SELECT
    'partner_action:'::text || pn.id::text || ':' || (ai->>'id'),
    'partner', pn.partner_id, 'review',
    COALESCE(NULLIF(ai->>'description',''),'Action item'), NULL::text,
    p.company_name, pn.partner_id, '/partners/' || pn.partner_id::text,
    NULLIF(ai->>'due_date','')::timestamptz, 'Medium', p.assigned_manager_id,
    CASE WHEN lower(COALESCE(ai->>'status','open')) IN ('done','completed','closed') THEN 'done' ELSE 'open' END,
    0::numeric, pn.created_at, NULL::timestamptz, false
  FROM public.partner_notes pn
  LEFT JOIN public.partners p ON p.id = pn.partner_id
  CROSS JOIN LATERAL jsonb_array_elements(pn.action_items) AS ai
  WHERE jsonb_typeof(pn.action_items)='array' AND jsonb_array_length(pn.action_items)>0
  UNION ALL
  SELECT
    'renewal:'::text || r.id::text, 'renewal', r.id, 'renewal',
    'Renewal due: ' || COALESCE(c.commercial_name,'Client'), r.notes,
    c.commercial_name, r.id, '/renewals',
    r.renewal_date::timestamptz, COALESCE(r.priority,'Medium'), r.assigned_user_id, 'open',
    COALESCE(r.estimated_value,0)::numeric, r.created_at, NULL::timestamptz, true
  FROM public.renewals r LEFT JOIN public.clients c ON c.id = r.client_id
  WHERE r.status NOT IN ('Renewed','Lost','Cancelled')
    AND r.renewal_date IS NOT NULL AND r.renewal_date <= (current_date + interval '90 days')
  UNION ALL
  SELECT
    'deal_stalled:'::text || d.id::text, 'pipeline', d.id, 'escalation',
    'Pipeline stalled: ' || d.company_name,
    'No activity in over 14 days at stage ' || d.stage,
    d.company_name, d.id, '/deals/' || d.id::text,
    (d.last_activity_at + interval '14 days'), 'High', d.assigned_user_id, 'open',
    COALESCE(d.expected_value,0)::numeric, d.last_activity_at, NULL::timestamptz, true
  FROM public.deals d
  WHERE d.status='Open' AND d.stage NOT IN ('Won','Lost')
    AND d.last_activity_at IS NOT NULL AND d.last_activity_at < now() - interval '14 days'
  UNION ALL
  SELECT
    'lead_waiting:'::text || il.id::text, 'lead', il.id, 'email',
    'Follow up: ' || COALESCE(il.company_name,'Lead'),
    'No contact for 7+ days while ' || COALESCE(il.status,'New'),
    il.company_name, il.id, '/incoming-leads/' || il.id::text,
    (COALESCE(il.last_contact_at, il.created_at) + interval '7 days'),
    'Medium', il.assigned_user_id, 'open',
    0::numeric, COALESCE(il.last_contact_at, il.created_at), NULL::timestamptz, true
  FROM public.incoming_leads il
  WHERE il.status IN ('New','Active Qualification','Nurture')
    AND COALESCE(il.last_contact_at, il.created_at) < now() - interval '7 days'
), scored AS (
  SELECT b.*,
    (CASE WHEN b.due_date IS NOT NULL AND b.due_date < now() THEN 50 ELSE 0 END
     + CASE WHEN b.due_date IS NOT NULL AND b.due_date < now() + interval '1 day' THEN 30
            WHEN b.due_date IS NOT NULL AND b.due_date < now() + interval '3 day' THEN 15
            WHEN b.due_date IS NOT NULL AND b.due_date < now() + interval '7 day' THEN 5
            ELSE 0 END
     + CASE upper(COALESCE(b.manual_priority,'')) WHEN 'CRITICAL' THEN 40 WHEN 'HIGH' THEN 25 WHEN 'MEDIUM' THEN 10 ELSE 0 END
     + LEAST(30, FLOOR(COALESCE(b.revenue_impact,0)/5000.0))::int
     + CASE WHEN b.source='renewal' THEN 10 ELSE 0 END) AS priority_score
  FROM base b
)
SELECT s.id, s.source, s.source_id, s.task_type, s.title, s.description, s.company_name,
  s.related_entity_id, s.related_route, s.due_date, s.owner_user_id,
  pr.full_name AS owner_name, pr.email AS owner_email,
  s.status, s.revenue_impact, s.is_auto, s.created_at, s.completed_at,
  s.priority_score,
  CASE WHEN s.priority_score >= 70 THEN 'Critical'
       WHEN s.priority_score >= 40 THEN 'High'
       WHEN s.priority_score >= 15 THEN 'Medium'
       ELSE 'Low' END AS priority
FROM scored s LEFT JOIN public.profiles pr ON pr.id = s.owner_user_id;

GRANT SELECT ON public.unified_tasks TO authenticated;
GRANT SELECT ON public.unified_tasks TO service_role;
