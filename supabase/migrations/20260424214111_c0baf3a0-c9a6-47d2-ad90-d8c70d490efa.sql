
-- 1. WALLETS: restrict SELECT to owner + community admins/super admins
DROP POLICY IF EXISTS "Wallets are readable by economy participants" ON public.wallets;
CREATE POLICY "Wallet owners and admins can read wallets"
ON public.wallets FOR SELECT
USING (
  auth.uid() = user_id
  OR EXISTS (SELECT 1 FROM public.communities c WHERE c.id = wallets.community_id AND c.admin_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.community_admins ca WHERE ca.community_id = wallets.community_id AND ca.user_id = auth.uid())
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

-- 2. WALLETS: prevent users from changing balance / wallet ids — restrict UPDATE
DROP POLICY IF EXISTS "Users can update own wallet" ON public.wallets;
CREATE POLICY "Users can update own wallet metadata only"
ON public.wallets FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND balance_sats = (SELECT w.balance_sats FROM public.wallets w WHERE w.id = wallets.id)
  AND blink_wallet_id = (SELECT w.blink_wallet_id FROM public.wallets w WHERE w.id = wallets.id)
  AND community_id = (SELECT w.community_id FROM public.wallets w WHERE w.id = wallets.id)
  AND user_id = (SELECT w.user_id FROM public.wallets w WHERE w.id = wallets.id)
);

-- 3. VALIDATION VOTES: enforce caller must be an appointed validator for that submission's community
DROP POLICY IF EXISTS "Validators can cast votes" ON public.validation_votes;
CREATE POLICY "Validators can cast votes"
ON public.validation_votes FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = validator_id
  AND (
    EXISTS (
      SELECT 1 FROM public.validators v
      JOIN public.merchants m ON m.community_id = v.community_id
      WHERE m.id = submission_id AND v.user_id = auth.uid() AND submission_type = 'merchant'
    )
    OR EXISTS (
      SELECT 1 FROM public.validators v
      JOIN public.earners e ON e.community_id = v.community_id
      WHERE e.id = submission_id AND v.user_id = auth.uid() AND submission_type = 'earner'
    )
    OR EXISTS (
      SELECT 1 FROM public.validators v
      JOIN public.transactions t ON t.community_id = v.community_id
      WHERE t.id = submission_id AND v.user_id = auth.uid() AND submission_type = 'transaction'
    )
    OR EXISTS (
      SELECT 1 FROM public.validators v
      JOIN public.proofs p ON p.community_id = v.community_id
      WHERE p.id = submission_id AND v.user_id = auth.uid() AND submission_type = 'proof'
    )
  )
);

-- 4. STORAGE: drop overly permissive policies on community-assets and economy branding buckets
DROP POLICY IF EXISTS "Authenticated users can update own community assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete own community assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload community assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated upload economy branding" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated update economy branding" ON storage.objects;
