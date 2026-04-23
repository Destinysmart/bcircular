DROP POLICY IF EXISTS "Allow authenticated uploads to economy-logos" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated uploads to economy-banners" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated updates to economy-logos" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated updates to economy-banners" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read economy-logos" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read economy-banners" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated delete economy-logos" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated delete economy-banners" ON storage.objects;
DROP POLICY IF EXISTS "Public read logos" ON storage.objects;
DROP POLICY IF EXISTS "Auth upload logos" ON storage.objects;
DROP POLICY IF EXISTS "storage_economy_assets_policy" ON storage.objects;
DROP POLICY IF EXISTS "storage_economy_assets_public_read" ON storage.objects;

INSERT INTO storage.buckets (id, name, public)
VALUES
  ('economy-logos', 'economy-logos', true),
  ('economy-banners', 'economy-banners', true)
ON CONFLICT (id) DO UPDATE SET public = true;

CREATE POLICY "storage_economy_assets_policy"
ON storage.objects
FOR ALL
TO authenticated
USING (
  bucket_id IN ('economy-logos', 'economy-banners')
)
WITH CHECK (
  bucket_id IN ('economy-logos', 'economy-banners')
);

CREATE POLICY "storage_economy_assets_public_read"
ON storage.objects
FOR SELECT
TO public
USING (
  bucket_id IN ('economy-logos', 'economy-banners')
);