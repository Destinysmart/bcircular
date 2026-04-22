-- Add branding image URLs to economies
ALTER TABLE public.communities
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS banner_url text;

-- Create public storage buckets for economy branding images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('economy-logos', 'economy-logos', true, 2097152, ARRAY['image/jpeg', 'image/png', 'image/svg+xml', 'image/webp']),
  ('economy-banners', 'economy-banners', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Public read access for economy branding assets
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Public read economy branding'
  ) THEN
    CREATE POLICY "Public read economy branding"
      ON storage.objects
      FOR SELECT
      USING (bucket_id IN ('economy-logos', 'economy-banners'));
  END IF;
END $$;

-- Authenticated upload access for economy branding assets
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Authenticated upload economy branding'
  ) THEN
    CREATE POLICY "Authenticated upload economy branding"
      ON storage.objects
      FOR INSERT
      TO authenticated
      WITH CHECK (bucket_id IN ('economy-logos', 'economy-banners'));
  END IF;
END $$;

-- Authenticated replacement access for economy branding assets
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Authenticated update economy branding'
  ) THEN
    CREATE POLICY "Authenticated update economy branding"
      ON storage.objects
      FOR UPDATE
      TO authenticated
      USING (bucket_id IN ('economy-logos', 'economy-banners'))
      WITH CHECK (bucket_id IN ('economy-logos', 'economy-banners'));
  END IF;
END $$;