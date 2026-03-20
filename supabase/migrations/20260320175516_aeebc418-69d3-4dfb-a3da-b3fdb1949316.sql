
-- Renewals workflow engine
CREATE TABLE public.renewals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  partner_id text,
  contract_id uuid REFERENCES public.contracts(id) ON DELETE SET NULL,
  license_id uuid REFERENCES public.licenses(id) ON DELETE SET NULL,
  renewal_type text NOT NULL DEFAULT 'License',
  renewal_date date,
  alert_window_days integer DEFAULT 60,
  status text NOT NULL DEFAULT 'Upcoming',
  estimated_value numeric DEFAULT 0,
  final_value numeric,
  assigned_owner text,
  last_interaction timestamp with time zone,
  notes text,
  priority text DEFAULT 'Medium',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.renewals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to renewals" ON public.renewals FOR ALL TO public USING (true) WITH CHECK (true);

-- Notifications system
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'info',
  category text DEFAULT 'renewal',
  target_role text,
  target_user_id text,
  partner_id text,
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE,
  renewal_id uuid REFERENCES public.renewals(id) ON DELETE CASCADE,
  is_read boolean NOT NULL DEFAULT false,
  action_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to notifications" ON public.notifications FOR ALL TO public USING (true) WITH CHECK (true);

-- Renewal activity log
CREATE TABLE public.renewal_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  renewal_id uuid NOT NULL REFERENCES public.renewals(id) ON DELETE CASCADE,
  action text NOT NULL,
  from_status text,
  to_status text,
  performed_by text,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.renewal_activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to renewal_activities" ON public.renewal_activities FOR ALL TO public USING (true) WITH CHECK (true);

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
