-- Avoid broad public listing policies on branding buckets.
-- Public buckets still allow direct image URLs to render without exposing bucket-wide listing.
DROP POLICY IF EXISTS "Public read economy branding" ON storage.objects;