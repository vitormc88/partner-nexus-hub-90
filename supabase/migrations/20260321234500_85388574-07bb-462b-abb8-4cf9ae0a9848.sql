-- Add UPDATE and DELETE policies for document_categories
CREATE POLICY doc_categories_update ON public.document_categories FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'hq_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'hq_admin'::app_role));

CREATE POLICY doc_categories_delete ON public.document_categories FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'hq_admin'::app_role));

-- Add UPDATE and DELETE policies for announcements
CREATE POLICY announcements_update ON public.announcements FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'hq_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'hq_admin'::app_role));

CREATE POLICY announcements_delete ON public.announcements FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'hq_admin'::app_role));

-- Add UPDATE and DELETE for training_courses
CREATE POLICY courses_update ON public.training_courses FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'hq_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'hq_admin'::app_role));

CREATE POLICY courses_delete ON public.training_courses FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'hq_admin'::app_role));