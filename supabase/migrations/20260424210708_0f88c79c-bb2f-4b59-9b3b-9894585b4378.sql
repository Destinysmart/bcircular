
-- =========================================
-- 1. PROFILES: lock down email + is_super_admin
-- =========================================

-- Drop overly broad SELECT
DROP POLICY IF EXISTS "Profiles are publicly readable" ON public.profiles;

-- Public can read non-sensitive fields (display_name, avatar_url, bio) — but not email/is_super_admin.
-- We expose this via a view; the table itself becomes self-only readable.
CREATE POLICY "Users can read own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Public-safe view (no email, no is_super_admin)
CREATE OR REPLACE VIEW public.public_profiles
WITH (security_invoker = true) AS
SELECT id, user_id, display_name, avatar_url, bio, created_at, updated_at
FROM public.profiles;

GRANT SELECT ON public.public_profiles TO anon, authenticated;

-- Allow public read of the safe columns through a permissive policy that excludes sensitive ones via view
CREATE POLICY "Public can read non-sensitive profile fields"
ON public.profiles
FOR SELECT
TO anon, authenticated
USING (true);

-- We must prevent the broad SELECT from leaking sensitive cols. Since Postgres RLS is row-level,
-- drop the public SELECT we just added and rely on the view + self-only policy instead.
DROP POLICY IF EXISTS "Public can read non-sensitive profile fields" ON public.profiles;

-- Prevent users from changing is_super_admin themselves
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND is_super_admin = (SELECT p.is_super_admin FROM public.profiles p WHERE p.user_id = auth.uid())
);

-- Only real admins (user_roles table) may toggle super-admin
CREATE POLICY "Admins can update super_admin flag"
ON public.profiles
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =========================================
-- 2. BLINK API KEYS: use has_role instead of profiles.is_super_admin
-- =========================================

DROP POLICY IF EXISTS "Economy admin can read own API key" ON public.blink_api_keys;
DROP POLICY IF EXISTS "Economy admin can insert API key" ON public.blink_api_keys;
DROP POLICY IF EXISTS "Economy admin can update API key" ON public.blink_api_keys;
DROP POLICY IF EXISTS "Economy admin can delete API key" ON public.blink_api_keys;

CREATE POLICY "Economy admin can read own API key"
ON public.blink_api_keys
FOR SELECT
TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.community_admins ca
          WHERE ca.community_id = blink_api_keys.community_id AND ca.user_id = auth.uid())
  OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Economy admin can insert API key"
ON public.blink_api_keys
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM public.community_admins ca
          WHERE ca.community_id = blink_api_keys.community_id AND ca.user_id = auth.uid())
  OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Economy admin can update API key"
ON public.blink_api_keys
FOR UPDATE
TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.community_admins ca
          WHERE ca.community_id = blink_api_keys.community_id AND ca.user_id = auth.uid())
  OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Economy admin can delete API key"
ON public.blink_api_keys
FOR DELETE
TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.community_admins ca
          WHERE ca.community_id = blink_api_keys.community_id AND ca.user_id = auth.uid())
  OR public.has_role(auth.uid(), 'admin')
);

-- =========================================
-- 3. STORAGE: scope writes to community admin
-- =========================================

DROP POLICY IF EXISTS "storage_economy_assets_policy" ON storage.objects;

-- Public read for branding buckets
CREATE POLICY "Economy branding public read"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id IN ('economy-logos', 'economy-banners'));

-- Only community admin (or super admin) can write/update/delete their own folder (folder = community id)
CREATE POLICY "Economy admin can insert branding"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id IN ('economy-logos', 'economy-banners')
  AND (
    (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.communities WHERE admin_id = auth.uid()
      UNION
      SELECT community_id::text FROM public.community_admins WHERE user_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin')
  )
);

CREATE POLICY "Economy admin can update branding"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id IN ('economy-logos', 'economy-banners')
  AND (
    (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.communities WHERE admin_id = auth.uid()
      UNION
      SELECT community_id::text FROM public.community_admins WHERE user_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin')
  )
);

CREATE POLICY "Economy admin can delete branding"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id IN ('economy-logos', 'economy-banners')
  AND (
    (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.communities WHERE admin_id = auth.uid()
      UNION
      SELECT community_id::text FROM public.community_admins WHERE user_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin')
  )
);

-- community-assets: scope writes the same way
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT polname FROM pg_policy
    WHERE polrelid = 'storage.objects'::regclass
      AND polname ILIKE '%community-assets%'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.polname);
  END LOOP;
END $$;

CREATE POLICY "community-assets public read"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'community-assets');

CREATE POLICY "community-assets admin insert"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'community-assets'
  AND (
    (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.communities WHERE admin_id = auth.uid()
      UNION
      SELECT community_id::text FROM public.community_admins WHERE user_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin')
  )
);

CREATE POLICY "community-assets admin update"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'community-assets'
  AND (
    (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.communities WHERE admin_id = auth.uid()
      UNION
      SELECT community_id::text FROM public.community_admins WHERE user_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin')
  )
);

CREATE POLICY "community-assets admin delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'community-assets'
  AND (
    (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.communities WHERE admin_id = auth.uid()
      UNION
      SELECT community_id::text FROM public.community_admins WHERE user_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin')
  )
);
