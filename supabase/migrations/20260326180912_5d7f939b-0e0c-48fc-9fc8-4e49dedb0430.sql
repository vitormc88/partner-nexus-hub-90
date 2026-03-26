
-- Create lead_tasks table
CREATE TABLE public.lead_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.incoming_leads(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  assigned_user_id uuid REFERENCES auth.users(id),
  due_date date,
  status text NOT NULL DEFAULT 'To Do',
  priority text NOT NULL DEFAULT 'Medium',
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

-- Enable RLS
ALTER TABLE public.lead_tasks ENABLE ROW LEVEL SECURITY;

-- HQ users can do everything
CREATE POLICY "hq_users_full_access" ON public.lead_tasks
  FOR ALL TO authenticated
  USING (public.is_hq_user(auth.uid()))
  WITH CHECK (public.is_hq_user(auth.uid()));

-- Partner users can view/manage tasks on leads linked to their partner
CREATE POLICY "partner_users_access" ON public.lead_tasks
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.incoming_leads il
      WHERE il.id = lead_tasks.lead_id
        AND il.linked_partner_id IS NOT NULL
        AND il.linked_partner_id = public.get_user_partner_id(auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.incoming_leads il
      WHERE il.id = lead_tasks.lead_id
        AND il.linked_partner_id IS NOT NULL
        AND il.linked_partner_id = public.get_user_partner_id(auth.uid())
    )
  );

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.lead_tasks;
