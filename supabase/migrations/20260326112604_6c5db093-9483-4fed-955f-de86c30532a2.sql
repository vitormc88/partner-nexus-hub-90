ALTER TABLE public.incoming_leads ADD COLUMN linked_partner_id uuid REFERENCES public.partners(id);

CREATE INDEX idx_incoming_leads_linked_partner_id ON public.incoming_leads(linked_partner_id);