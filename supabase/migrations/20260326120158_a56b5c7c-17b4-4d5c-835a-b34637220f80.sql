-- Allow all HQ users (not just hq_admin) to insert incoming leads
DROP POLICY IF EXISTS "incoming_leads_insert" ON public.incoming_leads;
CREATE POLICY "incoming_leads_insert"
  ON public.incoming_leads FOR INSERT
  TO authenticated
  WITH CHECK (
    is_hq_user(auth.uid())
  );