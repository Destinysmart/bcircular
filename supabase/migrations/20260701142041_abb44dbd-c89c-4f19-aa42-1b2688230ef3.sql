
-- =========================================================
-- 1) blink_transactions: remove public read, scope to owners/admins
-- =========================================================
DROP POLICY IF EXISTS "Blink transactions are publicly readable" ON public.blink_transactions;

REVOKE SELECT ON public.blink_transactions FROM anon;
GRANT SELECT ON public.blink_transactions TO authenticated;

CREATE POLICY "Wallet owners and economy admins can read transactions"
ON public.blink_transactions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.wallets w
    WHERE w.id = blink_transactions.wallet_id
      AND w.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.communities c
    WHERE c.id = blink_transactions.community_id
      AND c.admin_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.community_admins ca
    WHERE ca.community_id = blink_transactions.community_id
      AND ca.user_id = auth.uid()
  )
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

-- =========================================================
-- 2) communities.contact_email: hide from anon
-- =========================================================
REVOKE SELECT (contact_email) ON public.communities FROM anon;

-- =========================================================
-- 3) earners: hide encrypted key & credential hash from anon+authenticated
-- =========================================================
REVOKE SELECT (pending_blink_api_key_encrypted, pending_ln_address_hash)
  ON public.earners FROM anon, authenticated;

-- =========================================================
-- 4) merchants: hide encrypted key, credential hash, claim token hash
-- =========================================================
REVOKE SELECT (pending_blink_api_key_encrypted, pending_ln_address_hash, claim_token_hash)
  ON public.merchants FROM anon, authenticated;

-- =========================================================
-- 5) profiles: drop over-broad "any community admin reads all profiles"
-- =========================================================
DROP POLICY IF EXISTS "Community admins can read profiles for validator lookup" ON public.profiles;

-- =========================================================
-- 6) storage: fix broken ownership check for economy-logos / economy-banners
--    Previous policies used storage.foldername(c.name) (the community NAME
--    column) instead of the storage object path. Rewrite to compare the
--    first folder segment of the object's own name against the community id.
-- =========================================================
DROP POLICY IF EXISTS "Community admins insert economy assets" ON storage.objects;
DROP POLICY IF EXISTS "Community admins update economy assets" ON storage.objects;
DROP POLICY IF EXISTS "Community admins delete economy assets" ON storage.objects;

CREATE POLICY "Community admins insert economy assets"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = ANY (ARRAY['economy-logos'::text, 'economy-banners'::text])
  AND EXISTS (
    SELECT 1 FROM public.communities c
    WHERE (c.id)::text = (storage.foldername(storage.objects.name))[1]
      AND (
        c.admin_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.community_admins ca
          WHERE ca.community_id = c.id AND ca.user_id = auth.uid()
        )
        OR public.has_role(auth.uid(), 'admin'::app_role)
      )
  )
);

CREATE POLICY "Community admins update economy assets"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = ANY (ARRAY['economy-logos'::text, 'economy-banners'::text])
  AND EXISTS (
    SELECT 1 FROM public.communities c
    WHERE (c.id)::text = (storage.foldername(storage.objects.name))[1]
      AND (
        c.admin_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.community_admins ca
          WHERE ca.community_id = c.id AND ca.user_id = auth.uid()
        )
        OR public.has_role(auth.uid(), 'admin'::app_role)
      )
  )
);

CREATE POLICY "Community admins delete economy assets"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = ANY (ARRAY['economy-logos'::text, 'economy-banners'::text])
  AND EXISTS (
    SELECT 1 FROM public.communities c
    WHERE (c.id)::text = (storage.foldername(storage.objects.name))[1]
      AND (
        c.admin_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.community_admins ca
          WHERE ca.community_id = c.id AND ca.user_id = auth.uid()
        )
        OR public.has_role(auth.uid(), 'admin'::app_role)
      )
  )
);
