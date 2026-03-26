
-- Create "Uncategorized" default category if it doesn't exist
INSERT INTO public.document_categories (id, name, description, icon, sort_order)
SELECT 'aa000000-0000-4000-a000-000000000001', 'Uncategorized', 'Default category for unassigned documents', 'FolderOpen', 999
WHERE NOT EXISTS (SELECT 1 FROM public.document_categories WHERE name = 'Uncategorized');

-- Fix any orphaned documents (category_id pointing to non-existent category)
UPDATE public.documents
SET category_id = (SELECT id FROM public.document_categories WHERE name = 'Uncategorized' LIMIT 1)
WHERE category_id IS NOT NULL
  AND category_id NOT IN (SELECT id FROM public.document_categories);
