
CREATE TABLE public.opportunity_loss_details (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL UNIQUE,
  loss_category text NOT NULL,
  competitor_name text,
  competitor_other text,
  notes text,
  lost_at timestamptz NOT NULL DEFAULT now(),
  lost_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_loss_details_deal ON public.opportunity_loss_details(deal_id);
CREATE INDEX idx_loss_details_category ON public.opportunity_loss_details(loss_category);
CREATE INDEX idx_loss_details_competitor ON public.opportunity_loss_details(competitor_name);

CREATE TABLE public.opportunity_loss_reasons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loss_detail_id uuid NOT NULL REFERENCES public.opportunity_loss_details(id) ON DELETE CASCADE,
  reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_loss_reasons_detail ON public.opportunity_loss_reasons(loss_detail_id);
CREATE INDEX idx_loss_reasons_reason ON public.opportunity_loss_reasons(reason);

ALTER TABLE public.opportunity_loss_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opportunity_loss_reasons ENABLE ROW LEVEL SECURITY;

CREATE POLICY loss_details_select ON public.opportunity_loss_details
  FOR SELECT TO authenticated USING (public.can_view_deal(deal_id));

CREATE POLICY loss_details_insert ON public.opportunity_loss_details
  FOR INSERT TO authenticated WITH CHECK (public.can_manage_deal(deal_id));

CREATE POLICY loss_details_update ON public.opportunity_loss_details
  FOR UPDATE TO authenticated USING (public.can_manage_deal(deal_id))
  WITH CHECK (public.can_manage_deal(deal_id));

CREATE POLICY loss_details_delete ON public.opportunity_loss_details
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'hq_admin'::app_role));

CREATE POLICY loss_reasons_select ON public.opportunity_loss_reasons
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.opportunity_loss_details d
            WHERE d.id = loss_detail_id AND public.can_view_deal(d.deal_id))
  );

CREATE POLICY loss_reasons_insert ON public.opportunity_loss_reasons
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.opportunity_loss_details d
            WHERE d.id = loss_detail_id AND public.can_manage_deal(d.deal_id))
  );

CREATE POLICY loss_reasons_delete ON public.opportunity_loss_reasons
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.opportunity_loss_details d
            WHERE d.id = loss_detail_id AND public.can_manage_deal(d.deal_id))
  );

CREATE TRIGGER trg_loss_details_updated_at
  BEFORE UPDATE ON public.opportunity_loss_details
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
