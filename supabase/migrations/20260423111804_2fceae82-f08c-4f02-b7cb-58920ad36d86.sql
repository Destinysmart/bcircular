INSERT INTO storage.buckets (id, name, public)
VALUES
  ('economy-logos', 'economy-logos', true),
  ('economy-banners', 'economy-banners', true)
ON CONFLICT (id) DO UPDATE SET public = true;

ALTER TABLE public.communities
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS banner_url text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Allow authenticated uploads to economy-logos'
  ) THEN
    CREATE POLICY "Allow authenticated uploads to economy-logos"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'economy-logos');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Allow authenticated uploads to economy-banners'
  ) THEN
    CREATE POLICY "Allow authenticated uploads to economy-banners"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'economy-banners');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Allow authenticated updates to economy-logos'
  ) THEN
    CREATE POLICY "Allow authenticated updates to economy-logos"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (bucket_id = 'economy-logos')
    WITH CHECK (bucket_id = 'economy-logos');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Allow authenticated updates to economy-banners'
  ) THEN
    CREATE POLICY "Allow authenticated updates to economy-banners"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (bucket_id = 'economy-banners')
    WITH CHECK (bucket_id = 'economy-banners');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Allow public read economy-logos'
  ) THEN
    CREATE POLICY "Allow public read economy-logos"
    ON storage.objects FOR SELECT
    TO public
    USING (bucket_id = 'economy-logos');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Allow public read economy-banners'
  ) THEN
    CREATE POLICY "Allow public read economy-banners"
    ON storage.objects FOR SELECT
    TO public
    USING (bucket_id = 'economy-banners');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Allow authenticated delete economy-logos'
  ) THEN
    CREATE POLICY "Allow authenticated delete economy-logos"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (bucket_id = 'economy-logos');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Allow authenticated delete economy-banners'
  ) THEN
    CREATE POLICY "Allow authenticated delete economy-banners"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (bucket_id = 'economy-banners');
  END IF;
END $$;