
ALTER TABLE public.proposals
  ADD COLUMN IF NOT EXISTS product_family text NOT NULL DEFAULT 'Professional',
  ADD COLUMN IF NOT EXISTS license_model text NULL,
  ADD COLUMN IF NOT EXISTS proposal_mode text NULL,
  ADD COLUMN IF NOT EXISTS deployment text NULL;

UPDATE public.proposals
  SET product_family = COALESCE(product_family, 'Professional')
  WHERE product_family IS NULL;
