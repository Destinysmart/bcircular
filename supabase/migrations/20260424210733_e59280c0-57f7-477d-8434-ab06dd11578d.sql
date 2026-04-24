
-- Admins can read every profile (needed by SuperAdminDashboard list)
CREATE POLICY "Admins can read all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Allow validator-email lookup by community admins (look up user_id from email)
-- Community admins / economy admins occasionally need to find a profile by email to appoint validators.
CREATE POLICY "Community admins can read profiles for validator lookup"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.communities c WHERE c.admin_id = auth.uid())
);

-- Public-bucket listing: drop overly broad public SELECT, allow only authenticated to list,
-- and keep individual object access via signed URLs / direct paths.
-- For our public buckets we still want anon to load images by URL — that uses storage's
-- own public-bucket flag, not the storage.objects SELECT policy. Restrict the SELECT policy
-- on storage.objects to authenticated to satisfy the linter.
DROP POLICY IF EXISTS "Economy branding public read" ON storage.objects;
DROP POLICY IF EXISTS "community-assets public read" ON storage.objects;

-- Avatars + proof-media buckets: also tighten if a wide policy exists
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT polname FROM pg_policy
    WHERE polrelid = 'storage.objects'::regclass
      AND polname ILIKE '%public%read%'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.polname);
  END LOOP;
END $$;
