-- Replace branding upload policies with simpler, schema-qualified versions
DROP POLICY IF EXISTS "Economy admin can insert branding" ON storage.objects;
DROP POLICY IF EXISTS "Economy admin can update branding" ON storage.objects;
DROP POLICY IF EXISTS "Economy admin can delete branding" ON storage.objects;

CREATE POLICY "Economy admin can insert branding"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id IN ('economy-logos', 'economy-banners')
  AND (
    EXISTS (
      SELECT 1 FROM public.communities c
      WHERE c.id::text = (storage.foldername(name))[1]
        AND c.admin_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.community_admins ca
      WHERE ca.community_id::text = (storage.foldername(name))[1]
        AND ca.user_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  )
);

CREATE POLICY "Economy admin can update branding"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id IN ('economy-logos', 'economy-banners')
  AND (
    EXISTS (
      SELECT 1 FROM public.communities c
      WHERE c.id::text = (storage.foldername(name))[1]
        AND c.admin_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.community_admins ca
      WHERE ca.community_id::text = (storage.foldername(name))[1]
        AND ca.user_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  )
);

CREATE POLICY "Economy admin can delete branding"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id IN ('economy-logos', 'economy-banners')
  AND (
    EXISTS (
      SELECT 1 FROM public.communities c
      WHERE c.id::text = (storage.foldername(name))[1]
        AND c.admin_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.community_admins ca
      WHERE ca.community_id::text = (storage.foldername(name))[1]
        AND ca.user_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  )
);