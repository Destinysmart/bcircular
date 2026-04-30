DO $$ 
DECLARE
  pol record;
BEGIN
  FOR pol IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE tablename = 'objects' 
    AND schemaname = 'storage'
  LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON storage.objects', 
      pol.policyname
    );
  END LOOP;
END $$;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('economy-logos', 'economy-logos', true, 2097152, 
   ARRAY['image/jpeg','image/png','image/svg+xml','image/webp']),
  ('economy-banners', 'economy-banners', true, 5242880, 
   ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO UPDATE SET 
  public = true,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE POLICY "public_read_economy_assets"
ON storage.objects FOR SELECT
TO public
USING (bucket_id IN ('economy-logos', 'economy-banners'));

CREATE POLICY "auth_insert_economy_assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id IN ('economy-logos', 'economy-banners'));

CREATE POLICY "auth_update_economy_assets"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id IN ('economy-logos', 'economy-banners'))
WITH CHECK (bucket_id IN ('economy-logos', 'economy-banners'));

CREATE POLICY "auth_delete_economy_assets"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id IN ('economy-logos', 'economy-banners'));