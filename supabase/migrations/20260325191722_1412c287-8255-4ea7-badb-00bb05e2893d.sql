
-- Create incoming_leads table
CREATE TABLE public.incoming_leads (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_name text,
  contact_name text,
  email text,
  phone text,
  country text,
  job_role text,
  sector text,
  notes text,
  lead_source text,
  linked_partner_name text,
  lead_owner_type text,
  routing_reason text,
  sharpspring_id text,
  asset_range text DEFAULT 'Unknown',
  maintenance_team_size text DEFAULT 'Unknown',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Unique index on sharpspring_id
CREATE UNIQUE INDEX idx_incoming_leads_sharpspring_id ON public.incoming_leads (sharpspring_id) WHERE sharpspring_id IS NOT NULL;

-- Additional indexes
CREATE INDEX idx_incoming_leads_country ON public.incoming_leads (country);
CREATE INDEX idx_incoming_leads_linked_partner ON public.incoming_leads (linked_partner_name);
CREATE INDEX idx_incoming_leads_created_at ON public.incoming_leads (created_at);

-- Enable RLS
ALTER TABLE public.incoming_leads ENABLE ROW LEVEL SECURITY;

-- Only HQ users can select
CREATE POLICY "incoming_leads_select" ON public.incoming_leads
  FOR SELECT TO authenticated
  USING (public.is_hq_user(auth.uid()));

-- Only HQ admins can insert
CREATE POLICY "incoming_leads_insert" ON public.incoming_leads
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'hq_admin'));

-- Only HQ admins can update
CREATE POLICY "incoming_leads_update" ON public.incoming_leads
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'hq_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'hq_admin'));

-- Only HQ admins can delete
CREATE POLICY "incoming_leads_delete" ON public.incoming_leads
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'hq_admin'));
