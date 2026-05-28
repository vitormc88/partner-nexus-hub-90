-- Allow authenticated users to read bucket metadata for buckets they need to
-- generate signed URLs against. createSignedUrl on supabase-js issues a HEAD
-- against storage.buckets internally; without an explicit policy authenticated
-- partner users get null back even though objects RLS would allow the SELECT.
DROP POLICY IF EXISTS "auth_read_known_buckets" ON storage.buckets;
CREATE POLICY "auth_read_known_buckets"
ON storage.buckets
FOR SELECT
TO authenticated
USING (id IN ('documents', 'proposals', 'avatars', 'training-assets'));