ALTER TABLE public.proposals
ADD COLUMN IF NOT EXISTS discount_scope text NOT NULL DEFAULT 'none';

UPDATE public.proposals
SET discount_scope = CASE
  WHEN COALESCE(discount_pct, 0) > 0 THEN 'total'
  ELSE 'none'
END
WHERE discount_scope IS NULL OR discount_scope = 'none';